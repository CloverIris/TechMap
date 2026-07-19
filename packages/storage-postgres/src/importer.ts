import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Locale } from "@seekstar/storage-contract";
import type { ReleaseBundle } from "./release.js";

const locales: Locale[] = ["zh-CN", "en"];

const etag = (payload: unknown): string => `"sha256-${createHash("sha256").update(JSON.stringify(payload)).digest("base64url")}"`;

export const importRelease = async (pool: Pool, bundle: ReleaseBundle): Promise<void> => {
  const client = await pool.connect();
  const { manifest } = bundle;
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM releases WHERE data_version = $1", [manifest.dataVersion]);
    await client.query(
      `INSERT INTO releases(data_version, data_hash, data_schema_version, layout_version, published_at, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [manifest.dataVersion, manifest.dataHash, manifest.dataSchemaVersion, manifest.layoutVersion, manifest.publishedAt, manifest.reviewedAt]
    );

    for (const entity of bundle.entities) {
      const detail = entity.detailByLocale.en;
      await client.query(
        `INSERT INTO entities(data_version, entity_id, entity_type, resource_kind, canonical_name, slug, primary_root_domain_id, primary_container_id, first_public_at, lifecycle, review, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)`,
        [
          manifest.dataVersion,
          entity.summary.id,
          entity.summary.entityType,
          entity.summary.resourceKind,
          entity.summary.canonicalName,
          entity.summary.slug,
          entity.summary.primaryRootDomainId,
          entity.summary.primaryContainerId,
          JSON.stringify(entity.summary.firstPublicAt),
          JSON.stringify(detail.lifecycle),
          JSON.stringify(detail.review),
          JSON.stringify(entity.summary)
        ]
      );
      for (const localization of entity.localizations) {
        await client.query(
          `INSERT INTO entity_localizations(data_version, entity_id, locale, display_name, summary, description_markdown)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [manifest.dataVersion, entity.summary.id, localization.locale, localization.displayName, localization.summary, localization.descriptionMarkdown]
        );
      }
      for (const alias of entity.aliases) {
        await client.query(
          `INSERT INTO entity_aliases(data_version, entity_id, value, locale, kind) VALUES ($1,$2,$3,$4,$5)`,
          [manifest.dataVersion, entity.summary.id, alias.value, alias.locale, alias.kind]
        );
      }
      for (const locale of locales) {
        const localizedDetail = entity.detailByLocale[locale];
        await document(client, manifest.dataVersion, locale, "entity-summary", entity.summary.id, localizedDetail.entity);
        await document(client, manifest.dataVersion, locale, "entity-detail", entity.summary.id, localizedDetail);
      }
    }

    for (const source of bundle.sourcesByLocale.en) {
      await client.query(
        `INSERT INTO sources(data_version, source_id, source_type, title, publisher, url, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [manifest.dataVersion, source.id, source.sourceType, source.title, source.publisher, source.url, JSON.stringify(source)]
      );
    }
    for (const path of bundle.guidedPathsByLocale.en.paths) {
      await client.query(
        `INSERT INTO guided_paths(data_version, path_id, sort_order, payload) VALUES ($1,$2,$3,$4::jsonb)`,
        [manifest.dataVersion, path.id, 0, JSON.stringify(path)]
      );
    }
    for (const locale of locales) {
      for (const source of bundle.sourcesByLocale[locale]) await document(client, manifest.dataVersion, locale, "source", source.id, source);
    }

    for (const relation of bundle.relations) {
      await client.query(
        `INSERT INTO relations(data_version, relation_id, relation_type, source_entity_id, target_entity_id, symmetric, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [manifest.dataVersion, relation.id, relation.relationType, relation.sourceEntityId, relation.targetEntityId, relation.symmetric, JSON.stringify(relation.payload)]
      );
    }
    for (const event of bundle.events) {
      await client.query(
        `INSERT INTO events(data_version, event_id, event_type, occurred_at, payload) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`,
        [manifest.dataVersion, event.id, event.eventType, JSON.stringify(event.occurredAt), JSON.stringify(event.payload)]
      );
    }
    for (const statement of bundle.statements) {
      await client.query(
        `INSERT INTO statements(data_version, statement_id, status, primary_source_id, reviewed_at, payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [manifest.dataVersion, statement.id, statement.status, statement.primarySourceId, statement.reviewedAt, JSON.stringify({ ...statement.payload, subjects: statement.subjects })]
      );
      for (const sourceId of statement.sourceIds) {
        await client.query(
          `INSERT INTO statement_sources(data_version, statement_id, source_id, is_primary) VALUES ($1,$2,$3,$4)`,
          [manifest.dataVersion, statement.id, sourceId, sourceId === statement.primarySourceId]
        );
      }
    }

    for (const locale of locales) {
      await document(client, manifest.dataVersion, locale, "root-domains", "all", bundle.rootDomains);
      const paths = bundle.guidedPathsByLocale[locale];
      await document(client, manifest.dataVersion, locale, "guided-path-list", "all", paths.list);
      for (const path of paths.paths) {
        await document(client, manifest.dataVersion, locale, "guided-path", path.id, path);
      }
    }

    for (const layout of bundle.layouts) {
      await client.query(
        `INSERT INTO layout_snapshots(data_version, layout_version, view, locale, snapshot_id, payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [manifest.dataVersion, manifest.layoutVersion, layout.snapshot.view, layout.locale, layout.snapshot.id, JSON.stringify(layout.snapshot)]
      );
    }
    for (const overlay of bundle.overlays) await fragment(client, manifest.dataVersion, manifest.layoutVersion, overlay.view, overlay.locale, "overlay", overlay.overlay, overlay.payload);
    for (const expansion of bundle.expansions) await fragment(client, manifest.dataVersion, manifest.layoutVersion, expansion.view, expansion.locale, "expansion", expansion.entityId, expansion.payload);
    for (const neighborhood of bundle.neighborhoods) await fragment(client, manifest.dataVersion, manifest.layoutVersion, neighborhood.view, neighborhood.locale, "neighborhood", neighborhood.entityId, neighborhood.payload);
    for (const resolution of bundle.slugResolutions) await document(client, manifest.dataVersion, resolution.locale, "slug-resolution", `${resolution.resourceKind}/${resolution.slug}`, resolution.payload);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const document = async (client: PoolClient, dataVersion: string, locale: Locale, kind: string, key: string, payload: unknown): Promise<void> => {
  await client.query(
    `INSERT INTO api_documents(data_version, locale, document_kind, document_key, payload, etag) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
    [dataVersion, locale, kind, key, JSON.stringify(payload), etag(payload)]
  );
};

const fragment = async (client: PoolClient, dataVersion: string, layoutVersion: string, view: string, locale: Locale, kind: string, key: string, payload: unknown): Promise<void> => {
  await client.query(
    `INSERT INTO layout_fragments(data_version, layout_version, view, locale, fragment_kind, fragment_key, payload) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [dataVersion, layoutVersion, view, locale, kind, key, JSON.stringify(payload)]
  );
};
