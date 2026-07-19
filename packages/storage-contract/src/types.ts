export type Locale = "zh-CN" | "en";
export type MapView = "atlas" | "stack" | "time";
export type OverlayType = "organizations" | "people" | "papers" | "lifecycle";
export type ResourceKind = "tech" | "domain" | "org" | "person" | "paper";

export type EntityType =
  | "domain"
  | "concept"
  | "algorithm"
  | "standard"
  | "hardware"
  | "architecture"
  | "system"
  | "language"
  | "runtime"
  | "protocol"
  | "library"
  | "framework"
  | "database"
  | "tool"
  | "platform"
  | "service"
  | "product"
  | "organization"
  | "person"
  | "paper"
  | "era_version";

export type LifecycleStatus =
  | "pre_release"
  | "active"
  | "maintenance"
  | "deprecated"
  | "archived"
  | "end_of_support"
  | "unknown";

export type RelationType =
  | "is_a"
  | "member_of"
  | "built_on"
  | "runs_on"
  | "compiles_to"
  | "implements"
  | "targets"
  | "integrates_with"
  | "complements"
  | "alternative_to"
  | "successor_to"
  | "inspired_by"
  | "maintained_by"
  | "created_by"
  | "used_for"
  | "introduced_in"
  | "authored_by"
  | "published_by"
  | `ext.${string}`;

export interface ReleaseRef {
  dataVersion: string;
  dataHash: string;
  layoutVersion: string;
}

export interface ApiMeta extends Omit<ReleaseRef, "layoutVersion"> {
  requestId: string;
  contractVersion: "1.0.0";
  layoutVersion: string | null;
  locale: Locale;
}

export interface RootDomain {
  id: string;
  canonicalName: string;
  displayName: string;
  shortLabel: string;
  colorToken: string;
  sortOrder: number;
}

export interface EntityReference {
  id: string;
  entityType: EntityType;
  resourceKind: ResourceKind;
  canonicalName: string;
  displayName: string;
  slug: string;
  canonicalPath: string;
  primaryRootDomainId: string | null;
}

export interface EntityMapSummary extends EntityReference {
  summary: string;
  primaryContainerId: string | null;
  landmark: LandmarkInfo | null;
  visualIdentity: VisualIdentity;
  firstPublicAt: TemporalValue | null;
}

export interface LandmarkInfo {
  tier: 1 | 2 | 3;
  reasons: Array<{ code: string; explanation: string; statementIds: string[] }>;
}

export interface VisualIdentity {
  mode: "text" | "generic_icon" | "logo";
  key: string;
  assetUrl: string | null;
  alt: string;
  sourceId: string | null;
}

export interface DateParts {
  year: number;
  month?: number;
  day?: number;
}

export interface TemporalValue {
  precision: "day" | "month" | "year" | "circa" | "range" | "unknown";
  display: string;
  start: DateParts | null;
  end: DateParts | null;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3 {
  min: Vector3;
  max: Vector3;
}

export interface MapNode {
  entity: EntityMapSummary;
  position: Vector3;
  footprint: { width: number; depth: number; height: number };
  containerRegionId: string | null;
  labelPlacement: "center" | "north" | "east" | "south" | "west" | "above";
  labelMaxWidth: number;
  minSemanticZoom: number;
  layerSpan: { fromStratumId: string; toStratumId: string } | null;
  timeAnchor: TemporalValue | null;
}

export interface MapEdge {
  relationId: string;
  relationType: RelationType;
  sourceEntityId: string;
  targetEntityId: string;
  directed: boolean;
  displayLabel: string;
  controlPoints: Vector3[];
  minSemanticZoom: number;
  statementIds: string[];
}

export interface LayoutSnapshot {
  id: string;
  view: MapView;
  coordinateSystem: {
    handedness: "right";
    horizontalAxes: ["x", "y"];
    verticalAxis: "z";
    unit: "layout_unit";
  };
  worldBounds: Bounds3;
  canonicalCamera: Record<string, unknown>;
  cameraConstraints: Record<string, unknown>;
  strata: Array<Record<string, unknown>>;
  timeScale: Record<string, unknown> | null;
  lodBands: Array<Record<string, unknown>>;
  regions: Array<Record<string, unknown>>;
  nodes: MapNode[];
  landmarkEdges: MapEdge[];
}

export interface LayoutOverlay {
  baseSnapshotId: string;
  overlay: OverlayType;
  nodes: MapNode[];
  edges: MapEdge[];
  annotations: Array<Record<string, unknown>>;
}

export interface LayoutExpansion {
  baseSnapshotId: string;
  targetEntityId: string;
  expandedNodes: MapNode[];
  expandedEdges: MapEdge[];
  regionOverrides: Array<Record<string, unknown>>;
  focusBounds: Bounds3;
}

export interface LayoutNeighborhood {
  baseSnapshotId: string;
  focusEntityId: string;
  nodes: MapNode[];
  edges: MapEdge[];
  totalAvailable: number;
  truncated: boolean;
}

export interface SourceView {
  id: string;
  sourceType: string;
  title: string;
  publisher: string;
  url: string;
  archiveUrl: string | null;
  language: string;
  publishedAt: TemporalValue | null;
  updatedAt: TemporalValue | null;
  accessedAt: string;
  license: string | null;
  contentHash: string | null;
}

export interface EntityDetail {
  entity: EntityMapSummary;
  aliases: Array<Record<string, unknown>>;
  descriptionMarkdown: string;
  primaryContainer: EntityReference | null;
  classifications: EntityReference[];
  lifecycle: { status: LifecycleStatus; displayLabel: string; statementIds: string[] };
  review: { status: string; reviewedAt: string; reviewDueAt: string | null };
  relations: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  eraVersions: EntityReference[];
  statements: Array<Record<string, unknown>>;
  sources: SourceView[];
  links: Array<Record<string, unknown>>;
  issueReportUrl: string;
}

export interface SearchRequest {
  query: string;
  locale: Locale;
  entityTypes: EntityType[];
  rootDomainIds: string[];
  limit: number;
  cursor: string | null;
}

export interface SearchResult {
  entity: EntityMapSummary;
  match: {
    kind: string;
    field: string;
    displayText: string;
    highlightRanges: Array<{ start: number; end: number }>;
  };
}

export interface SlugResolution {
  status: "canonical" | "redirected" | "merged" | "tombstoned";
  requestedKind: ResourceKind;
  requestedSlug: string;
  entityId: string | null;
  canonicalKind: ResourceKind | null;
  canonicalSlug: string | null;
  canonicalPath: string | null;
  redirectRequired: boolean;
  replacementEntityId: string | null;
}

export interface GuidedPathSummary {
  id: string;
  title: string;
  summary: string;
  stepCount: number;
  estimatedMinutes: number;
  sortOrder: number;
}

export interface GuidedPath extends Omit<GuidedPathSummary, "sortOrder" | "stepCount"> {
  learningQuestion: string;
  steps: Array<Record<string, unknown>>;
}

export interface TelemetryEvent {
  eventType: string;
  occurredAt: string;
  contractVersion: "1.0.0";
  dataVersion: string;
  layoutVersion: string | null;
  locale: Locale;
  renderBackend: "webgpu" | "webgl2" | "basic";
  deviceClass: "desktop" | "tablet" | "mobile";
  view: MapView | null;
  entityType: EntityType | null;
  rootDomainId: string | null;
  guidedPathId: string | null;
  durationBucket: string;
  countBucket: string;
  errorKind: string | null;
}

export interface TelemetryReceipt {
  accepted: number;
}
