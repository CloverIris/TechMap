import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type {
  EntityMapSummary,
  EntityDetail,
  GuidedPath,
  GuidedPathSummary,
  LayoutExpansion,
  LayoutNeighborhood,
  LayoutOverlay,
  LayoutSnapshot,
  Locale,
  MapView,
  OverlayType,
  ReleaseRef,
  ResourceKind,
  RootDomain,
  SearchRequest,
  SearchResult,
  SlugResolution,
  SourceView,
  TechMapStore,
  TelemetryEvent,
  TelemetryReceipt
} from "@seekstar/storage-contract";

type JsonRecord = Record<string, unknown>;

export class PostgresTechMapStore implements TechMapStore {
  public constructor(private readonly pool: Pool) {}

  public async getCurrent(locale: Locale): Promise<{ release: ReleaseRef & { dataSchemaVersion: string; publishedAt: string; reviewedAt: string }; rootDomains: RootDomain[] }> {
    const releaseResult = await this.pool.query<{
      data_version: string;
      data_hash: string;
      data_schema_version: string;
      layout_version: string;
      published_at: Date;
      reviewed_at: Date;
    }>("SELECT data_version, data_hash, data_schema_version, layout_version, published_at, reviewed_at FROM releases ORDER BY published_at DESC LIMIT 1");
    const release = releaseResult.rows[0];
    if (!release) throw new Error("No imported TechMap data release is available.");
    const rootDomains = await this.document<RootDomain[]>(release.data_version, locale, "root-domains", "all");
    if (!rootDomains) throw new Error("Current release lacks root domain documents.");
    return {
      release: {
        dataVersion: release.data_version,
        dataHash: release.data_hash,
        dataSchemaVersion: release.data_schema_version,
        layoutVersion: release.layout_version,
        publishedAt: release.published_at.toISOString(),
        reviewedAt: release.reviewed_at.toISOString()
      },
      rootDomains
    };
  }

  public async getByVersion(dataVersion: string): Promise<(ReleaseRef & { dataSchemaVersion: string; publishedAt: string; reviewedAt: string }) | null> {
    const result = await this.pool.query<{
      data_version: string;
      data_hash: string;
      data_schema_version: string;
      layout_version: string;
      published_at: Date;
      reviewed_at: Date;
    }>("SELECT data_version, data_hash, data_schema_version, layout_version, published_at, reviewed_at FROM releases WHERE data_version = $1", [dataVersion]);
    const release = result.rows[0];
    if (!release) return null;
    return {
      dataVersion: release.data_version,
      dataHash: release.data_hash,
      dataSchemaVersion: release.data_schema_version,
      layoutVersion: release.layout_version,
      publishedAt: release.published_at.toISOString(),
      reviewedAt: release.reviewed_at.toISOString()
    };
  }

  public async getSnapshot(release: ReleaseRef, view: MapView, locale: Locale): Promise<LayoutSnapshot | null> {
    return this.layoutDocument<LayoutSnapshot>(release, view, locale, "snapshot", "base");
  }

  public async getOverlay(release: ReleaseRef, view: MapView, overlay: OverlayType, locale: Locale): Promise<LayoutOverlay | null> {
    return this.layoutDocument<LayoutOverlay>(release, view, locale, "overlay", overlay);
  }

  public async getExpansion(release: ReleaseRef, view: MapView, entityId: string, locale: Locale): Promise<LayoutExpansion | null> {
    return this.layoutDocument<LayoutExpansion>(release, view, locale, "expansion", entityId);
  }

  public async getNeighborhood(input: {
    release: ReleaseRef;
    view: MapView;
    entityId: string;
    locale: Locale;
    relationTypes: string[] | undefined;
    direction: "incoming" | "outgoing" | "both";
    limit: number;
  }): Promise<LayoutNeighborhood | null> {
    const stored = await this.layoutDocument<LayoutNeighborhood>(input.release, input.view, input.locale, "neighborhood", input.entityId);
    if (!stored) return null;
    const relationTypes = input.relationTypes ? new Set(input.relationTypes) : undefined;
    const edges = stored.edges
      .filter((edge) => !relationTypes || relationTypes.has(edge.relationType))
      .filter((edge) => input.direction === "both" || (input.direction === "incoming" ? edge.targetEntityId === input.entityId : edge.sourceEntityId === input.entityId))
      .slice(0, input.limit);
    return { ...stored, edges, totalAvailable: stored.edges.length, truncated: stored.edges.length > edges.length };
  }

  public async search(release: ReleaseRef, request: SearchRequest): Promise<{ items: SearchResult[]; nextCursor: string | null; total: number | null; totalIsExact: boolean }> {
    await this.assertRelease(release);
    const normalized = request.query.trim();
    const offset = request.cursor ? Number.parseInt(Buffer.from(request.cursor, "base64url").toString("utf8"), 10) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid search cursor.");
    const parameters: unknown[] = [release.dataVersion, request.locale, `%${normalized}%`, normalized, offset, request.limit + 1];
    const result = await this.pool.query<{ payload: EntityMapSummary; rank: number }>(
      `SELECT d.payload, GREATEST(similarity(e.canonical_name, $4), similarity(l.display_name, $4), similarity(COALESCE(a.value, ''), $4)) AS rank
       FROM entities e
       JOIN entity_localizations l ON l.data_version = e.data_version AND l.entity_id = e.entity_id AND l.locale = $2
       JOIN api_documents d ON d.data_version = e.data_version AND d.locale = $2 AND d.document_kind = 'entity-summary' AND d.document_key = e.entity_id
       LEFT JOIN entity_aliases a ON a.data_version = e.data_version AND a.entity_id = e.entity_id
       WHERE e.data_version = $1
         AND (e.canonical_name ILIKE $3 OR l.display_name ILIKE $3 OR a.value ILIKE $3)
       GROUP BY d.payload, e.canonical_name, l.display_name, a.value
       ORDER BY rank DESC, (d.payload->>'displayName') ASC, (d.payload->>'id') ASC
       OFFSET $5 LIMIT $6`,
      parameters
    );
    const page = result.rows.slice(0, request.limit);
    const items = page.map((row) => ({
      entity: row.payload,
      match: {
        kind: "substring",
        field: "displayName",
        displayText: row.payload.displayName,
        highlightRanges: []
      }
    }));
    const nextCursor = result.rows.length > request.limit ? Buffer.from(String(offset + request.limit)).toString("base64url") : null;
    return { items, nextCursor, total: null, totalIsExact: false };
  }

  public async getEntity(release: ReleaseRef, entityId: string, locale: Locale): Promise<EntityDetail | null> {
    await this.assertRelease(release);
    return this.document<EntityDetail>(release.dataVersion, locale, "entity-detail", entityId);
  }

  public async getSource(release: ReleaseRef, sourceId: string, locale: Locale): Promise<SourceView | null> {
    await this.assertRelease(release);
    return this.document<SourceView>(release.dataVersion, locale, "source", sourceId);
  }

  public async resolveSlug(release: ReleaseRef, resourceKind: ResourceKind, slug: string, locale: Locale): Promise<SlugResolution | null> {
    await this.assertRelease(release);
    const explicit = await this.document<SlugResolution>(release.dataVersion, locale, "slug-resolution", `${resourceKind}/${slug}`);
    if (explicit) return explicit;
    const result = await this.pool.query<{ payload: JsonRecord }>(
      "SELECT payload FROM api_documents WHERE data_version = $1 AND locale = $2 AND document_kind = 'entity-summary' AND document_key IN (SELECT entity_id FROM entities WHERE data_version = $1 AND resource_kind = $3 AND slug = $4)",
      [release.dataVersion, locale, resourceKind, slug]
    );
    const entity = result.rows[0]?.payload as unknown as { id: string; slug: string; canonicalPath: string } | undefined;
    if (!entity) return null;
    return {
      status: "canonical",
      requestedKind: resourceKind,
      requestedSlug: slug,
      entityId: entity.id,
      canonicalKind: resourceKind,
      canonicalSlug: entity.slug,
      canonicalPath: entity.canonicalPath,
      redirectRequired: false,
      replacementEntityId: null
    };
  }

  public async listGuidedPaths(release: ReleaseRef, locale: Locale): Promise<GuidedPathSummary[]> {
    await this.assertRelease(release);
    return (await this.document<GuidedPathSummary[]>(release.dataVersion, locale, "guided-path-list", "all")) ?? [];
  }

  public async getGuidedPath(release: ReleaseRef, pathId: string, locale: Locale): Promise<GuidedPath | null> {
    await this.assertRelease(release);
    return this.document<GuidedPath>(release.dataVersion, locale, "guided-path", pathId);
  }

  public async accept(events: TelemetryEvent[]): Promise<TelemetryReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const event of events) {
        const day = event.occurredAt.slice(0, 10);
        const dimensions = JSON.stringify({
          locale: event.locale,
          renderBackend: event.renderBackend,
          deviceClass: event.deviceClass,
          view: event.view,
          entityType: event.entityType,
          rootDomainId: event.rootDomainId,
          guidedPathId: event.guidedPathId,
          durationBucket: event.durationBucket,
          countBucket: event.countBucket,
          errorKind: event.errorKind
        });
        await client.query(
          `INSERT INTO telemetry_aggregates(day, event_type, dimensions, count)
           VALUES ($1, $2, $3::jsonb, 1)
           ON CONFLICT (day, event_type, dimensions) DO UPDATE SET count = telemetry_aggregates.count + 1`,
          [day, event.eventType, dimensions]
        );
      }
      await client.query("COMMIT");
      return { accepted: events.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async layoutDocument<T>(release: ReleaseRef, view: MapView, locale: Locale, fragmentKind: string, fragmentKey: string): Promise<T | null> {
    await this.assertRelease(release);
    if (fragmentKind === "snapshot") {
      const result = await this.pool.query<{ payload: T }>(
        "SELECT payload FROM layout_snapshots WHERE data_version = $1 AND layout_version = $2 AND view = $3 AND locale = $4",
        [release.dataVersion, release.layoutVersion, view, locale]
      );
      return result.rows[0]?.payload ?? null;
    }
    const result = await this.pool.query<{ payload: T }>(
      "SELECT payload FROM layout_fragments WHERE data_version = $1 AND layout_version = $2 AND view = $3 AND locale = $4 AND fragment_kind = $5 AND fragment_key = $6",
      [release.dataVersion, release.layoutVersion, view, locale, fragmentKind, fragmentKey]
    );
    return result.rows[0]?.payload ?? null;
  }

  private async document<T>(dataVersion: string, locale: Locale, documentKind: string, documentKey: string): Promise<T | null> {
    const result = await this.pool.query<{ payload: T }>(
      "SELECT payload FROM api_documents WHERE data_version = $1 AND locale = $2 AND document_kind = $3 AND document_key = $4",
      [dataVersion, locale, documentKind, documentKey]
    );
    return result.rows[0]?.payload ?? null;
  }

  private async assertRelease(release: ReleaseRef): Promise<void> {
    const result = await this.pool.query<{ data_hash: string; layout_version: string }>(
      "SELECT data_hash, layout_version FROM releases WHERE data_version = $1",
      [release.dataVersion]
    );
    const known = result.rows[0];
    if (!known || known.data_hash !== release.dataHash || known.layout_version !== release.layoutVersion) {
      throw new Error("The requested data and layout release is unavailable.");
    }
  }
}

export const strongEtag = (payload: unknown): string => {
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("base64url");
  return `"sha256-${hash}"`;
};
