import type {
  ApiMeta,
  Locale,
  MapView,
  OverlayType,
  ReleaseRef,
  ResourceKind,
  SearchRequest,
  TechMapStore,
  TelemetryEvent
} from "@seekstar/storage-contract";
import { conflict, gone, invalid, notFound } from "./errors.js";

const contractVersion = "1.0.0" as const;

export class TechMapService {
  public constructor(private readonly store: TechMapStore) {}

  public async bootstrap(requestId: string, locale: Locale) {
    const current = await this.store.getCurrent(locale);
    return {
      meta: this.meta(requestId, current.release, locale),
      release: {
        ...current.release,
        license: {
          spdxId: "CC-BY-4.0",
          name: "Creative Commons Attribution 4.0 International",
          attributionUrl: "https://creativecommons.org/licenses/by/4.0/"
        }
      },
      capabilities: {
        defaultLocale: "zh-CN",
        supportedLocales: ["zh-CN", "en"],
        defaultView: "atlas",
        views: ["atlas", "stack", "time"],
        overlays: ["organizations", "people", "papers", "lifecycle"],
        guidedPathIds: ["path.web-product", "path.ai-application", "path.hardware-to-language"],
        basicFallback: true
      },
      limits: {
        searchQueryCharacters: 120,
        searchPageSize: 50,
        neighborhoodEdges: 80,
        neighborhoodDepth: 1,
        telemetryBatchSize: 20
      },
      rootDomains: current.rootDomains
    };
  }

  public async releaseByVersion(dataVersion: string) {
    const release = await this.store.getByVersion(dataVersion);
    if (!release) throw gone("The requested data release is unavailable.");
    return release;
  }

  public async layout(requestId: string, release: ReleaseRef, view: MapView, locale: Locale) {
    const snapshot = await this.store.getSnapshot(release, view, locale);
    if (!snapshot) throw gone("The requested layout release is unavailable.");
    return { meta: this.meta(requestId, release, locale), snapshot };
  }

  public async overlay(requestId: string, release: ReleaseRef, view: MapView, overlay: OverlayType, locale: Locale) {
    const result = await this.store.getOverlay(release, view, overlay, locale);
    if (!result) throw notFound("The requested overlay does not exist for this release.");
    return { meta: this.meta(requestId, release, locale), overlay: result };
  }

  public async expansion(requestId: string, release: ReleaseRef, view: MapView, entityId: string, locale: Locale) {
    const result = await this.store.getExpansion(release, view, entityId, locale);
    if (!result) throw conflict("The entity does not have a semantic-era expansion in this view.");
    return { meta: this.meta(requestId, release, locale), expansion: result };
  }

  public async neighborhood(
    requestId: string,
    release: ReleaseRef,
    view: MapView,
    entityId: string,
    locale: Locale,
    relationTypes: string[] | undefined,
    direction: "incoming" | "outgoing" | "both",
    limit: number
  ) {
    if (limit < 1 || limit > 80) throw invalid("limit", "query", "limit must be between 1 and 80.");
    const result = await this.store.getNeighborhood({ release, view, entityId, locale, relationTypes, direction, limit });
    if (!result) throw notFound("The focused entity does not exist in this layout.");
    return { meta: this.meta(requestId, release, locale), neighborhood: result };
  }

  public async search(requestId: string, release: ReleaseRef, request: SearchRequest) {
    if (request.query.trim().length === 0 || request.query.length > 120) {
      throw invalid("query", "body", "query must contain 1 to 120 characters.");
    }
    if (request.limit < 1 || request.limit > 50) throw invalid("limit", "body", "limit must be between 1 and 50.");
    const result = await this.store.search(release, request);
    return { meta: this.meta(requestId, release, request.locale, false), ...result };
  }

  public async entity(requestId: string, release: ReleaseRef, entityId: string, locale: Locale) {
    const detail = await this.store.getEntity(release, entityId, locale);
    if (!detail) throw notFound("The entity does not exist in this release.");
    return { meta: this.meta(requestId, release, locale, false), detail };
  }

  public async source(requestId: string, release: ReleaseRef, sourceId: string, locale: Locale) {
    const source = await this.store.getSource(release, sourceId, locale);
    if (!source) throw notFound("The source does not exist in this release.");
    return { meta: this.meta(requestId, release, locale, false), source };
  }

  public async resolve(requestId: string, release: ReleaseRef, resourceKind: ResourceKind, slug: string, locale: Locale) {
    const resolution = await this.store.resolveSlug(release, resourceKind, slug, locale);
    if (!resolution) throw notFound("The slug does not exist in this release.");
    return { meta: this.meta(requestId, release, locale, false), resolution };
  }

  public async guidedPaths(requestId: string, release: ReleaseRef, locale: Locale) {
    const items = await this.store.listGuidedPaths(release, locale);
    return { meta: this.meta(requestId, release, locale, false), items };
  }

  public async guidedPath(requestId: string, release: ReleaseRef, pathId: string, locale: Locale) {
    const path = await this.store.getGuidedPath(release, pathId, locale);
    if (!path) throw notFound("The guided path does not exist in this release.");
    return { meta: this.meta(requestId, release, locale, false), path };
  }

  public async telemetry(events: TelemetryEvent[]) {
    if (events.length === 0 || events.length > 20) throw invalid("events", "body", "events must contain 1 to 20 items.");
    return this.store.accept(events);
  }

  private meta(requestId: string, release: ReleaseRef, locale: Locale, includeLayout = true): ApiMeta {
    return {
      requestId,
      contractVersion,
      dataVersion: release.dataVersion,
      dataHash: release.dataHash,
      layoutVersion: includeLayout ? release.layoutVersion : null,
      locale
    };
  }
}
