CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE releases (
  data_version text PRIMARY KEY,
  data_hash text NOT NULL,
  data_schema_version text NOT NULL,
  layout_version text NOT NULL,
  published_at timestamptz NOT NULL,
  reviewed_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE entities (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  resource_kind text NOT NULL,
  canonical_name text NOT NULL,
  slug text NOT NULL,
  primary_root_domain_id text,
  primary_container_id text,
  first_public_at jsonb,
  lifecycle jsonb NOT NULL,
  review jsonb NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, entity_id),
  UNIQUE (data_version, resource_kind, slug)
);

CREATE INDEX entities_name_trgm_idx ON entities USING gin (canonical_name gin_trgm_ops);
CREATE INDEX entities_slug_idx ON entities (data_version, resource_kind, slug);

CREATE TABLE entity_localizations (
  data_version text NOT NULL,
  entity_id text NOT NULL,
  locale text NOT NULL,
  display_name text NOT NULL,
  summary text NOT NULL,
  description_markdown text NOT NULL,
  PRIMARY KEY (data_version, entity_id, locale),
  FOREIGN KEY (data_version, entity_id) REFERENCES entities(data_version, entity_id) ON DELETE CASCADE
);

CREATE INDEX entity_localizations_name_trgm_idx ON entity_localizations USING gin (display_name gin_trgm_ops);

CREATE TABLE entity_aliases (
  data_version text NOT NULL,
  entity_id text NOT NULL,
  value text NOT NULL,
  locale text,
  kind text NOT NULL,
  PRIMARY KEY (data_version, entity_id, value, kind),
  FOREIGN KEY (data_version, entity_id) REFERENCES entities(data_version, entity_id) ON DELETE CASCADE
);

CREATE INDEX entity_aliases_value_trgm_idx ON entity_aliases USING gin (value gin_trgm_ops);

CREATE TABLE sources (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  source_id text NOT NULL,
  source_type text NOT NULL,
  title text NOT NULL,
  publisher text NOT NULL,
  url text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, source_id)
);

CREATE TABLE relations (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  relation_id text NOT NULL,
  relation_type text NOT NULL,
  source_entity_id text NOT NULL,
  target_entity_id text NOT NULL,
  symmetric boolean NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, relation_id)
);

CREATE INDEX relations_neighborhood_idx ON relations (data_version, source_entity_id, target_entity_id, relation_type);

CREATE TABLE events (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at jsonb NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, event_id)
);

CREATE TABLE statements (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  statement_id text NOT NULL,
  status text NOT NULL,
  primary_source_id text NOT NULL,
  reviewed_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, statement_id)
);

CREATE TABLE statement_sources (
  data_version text NOT NULL,
  statement_id text NOT NULL,
  source_id text NOT NULL,
  is_primary boolean NOT NULL,
  PRIMARY KEY (data_version, statement_id, source_id),
  FOREIGN KEY (data_version, statement_id) REFERENCES statements(data_version, statement_id) ON DELETE CASCADE,
  FOREIGN KEY (data_version, source_id) REFERENCES sources(data_version, source_id) ON DELETE RESTRICT
);

CREATE TABLE guided_paths (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  path_id text NOT NULL,
  sort_order integer NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, path_id)
);

CREATE TABLE layout_snapshots (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  layout_version text NOT NULL,
  view text NOT NULL,
  locale text NOT NULL,
  snapshot_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, layout_version, view, locale)
);

CREATE TABLE layout_fragments (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  layout_version text NOT NULL,
  view text NOT NULL,
  locale text NOT NULL,
  fragment_kind text NOT NULL,
  fragment_key text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (data_version, layout_version, view, locale, fragment_kind, fragment_key)
);

CREATE TABLE api_documents (
  data_version text NOT NULL REFERENCES releases(data_version) ON DELETE CASCADE,
  layout_version text,
  locale text NOT NULL,
  document_kind text NOT NULL,
  document_key text NOT NULL,
  payload jsonb NOT NULL,
  etag text NOT NULL,
  PRIMARY KEY (data_version, locale, document_kind, document_key)
);

CREATE TABLE telemetry_aggregates (
  day text NOT NULL,
  event_type text NOT NULL,
  dimensions jsonb NOT NULL,
  count integer NOT NULL,
  PRIMARY KEY (day, event_type, dimensions)
);
