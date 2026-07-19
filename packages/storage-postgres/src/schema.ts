import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const releases = pgTable("releases", {
  dataVersion: text("data_version").notNull().primaryKey(),
  dataHash: text("data_hash").notNull(),
  dataSchemaVersion: text("data_schema_version").notNull(),
  layoutVersion: text("layout_version").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull()
});

export const entities = pgTable("entities", {
  dataVersion: text("data_version").notNull(),
  id: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  resourceKind: text("resource_kind").notNull(),
  canonicalName: text("canonical_name").notNull(),
  slug: text("slug").notNull(),
  primaryRootDomainId: text("primary_root_domain_id"),
  primaryContainerId: text("primary_container_id"),
  firstPublicAt: jsonb("first_public_at"),
  lifecycle: jsonb("lifecycle").notNull(),
  review: jsonb("review").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [
  primaryKey({ columns: [table.dataVersion, table.id] }),
  uniqueIndex("entities_release_slug_unique").on(table.dataVersion, table.resourceKind, table.slug)
]);

export const entityLocalizations = pgTable("entity_localizations", {
  dataVersion: text("data_version").notNull(),
  entityId: text("entity_id").notNull(),
  locale: text("locale").notNull(),
  displayName: text("display_name").notNull(),
  summary: text("summary").notNull(),
  descriptionMarkdown: text("description_markdown").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.entityId, table.locale] })]);

export const entityAliases = pgTable("entity_aliases", {
  dataVersion: text("data_version").notNull(),
  entityId: text("entity_id").notNull(),
  value: text("value").notNull(),
  locale: text("locale"),
  kind: text("kind").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.entityId, table.value, table.kind] })]);

export const sources = pgTable("sources", {
  dataVersion: text("data_version").notNull(),
  id: text("source_id").notNull(),
  sourceType: text("source_type").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.id] })]);

export const relations = pgTable("relations", {
  dataVersion: text("data_version").notNull(),
  id: text("relation_id").notNull(),
  relationType: text("relation_type").notNull(),
  sourceEntityId: text("source_entity_id").notNull(),
  targetEntityId: text("target_entity_id").notNull(),
  symmetric: boolean("symmetric").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.id] })]);

export const events = pgTable("events", {
  dataVersion: text("data_version").notNull(),
  id: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: jsonb("occurred_at").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.id] })]);

export const statements = pgTable("statements", {
  dataVersion: text("data_version").notNull(),
  id: text("statement_id").notNull(),
  status: text("status").notNull(),
  primarySourceId: text("primary_source_id").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.id] })]);

export const statementSources = pgTable("statement_sources", {
  dataVersion: text("data_version").notNull(),
  statementId: text("statement_id").notNull(),
  sourceId: text("source_id").notNull(),
  isPrimary: boolean("is_primary").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.statementId, table.sourceId] })]);

export const guidedPaths = pgTable("guided_paths", {
  dataVersion: text("data_version").notNull(),
  id: text("path_id").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.id] })]);

export const layoutSnapshots = pgTable("layout_snapshots", {
  dataVersion: text("data_version").notNull(),
  layoutVersion: text("layout_version").notNull(),
  view: text("view").notNull(),
  locale: text("locale").notNull(),
  snapshotId: text("snapshot_id").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.layoutVersion, table.view, table.locale] })]);

export const layoutFragments = pgTable("layout_fragments", {
  dataVersion: text("data_version").notNull(),
  layoutVersion: text("layout_version").notNull(),
  view: text("view").notNull(),
  locale: text("locale").notNull(),
  fragmentKind: text("fragment_kind").notNull(),
  fragmentKey: text("fragment_key").notNull(),
  payload: jsonb("payload").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.layoutVersion, table.view, table.locale, table.fragmentKind, table.fragmentKey] })]);

export const apiDocuments = pgTable("api_documents", {
  dataVersion: text("data_version").notNull(),
  layoutVersion: text("layout_version"),
  locale: text("locale").notNull(),
  documentKind: text("document_kind").notNull(),
  documentKey: text("document_key").notNull(),
  payload: jsonb("payload").notNull(),
  etag: text("etag").notNull()
}, (table) => [primaryKey({ columns: [table.dataVersion, table.locale, table.documentKind, table.documentKey] })]);

export const telemetryAggregates = pgTable("telemetry_aggregates", {
  day: text("day").notNull(),
  eventType: text("event_type").notNull(),
  dimensions: jsonb("dimensions").notNull(),
  count: integer("count").notNull()
}, (table) => [primaryKey({ columns: [table.day, table.eventType, table.dimensions] })]);
