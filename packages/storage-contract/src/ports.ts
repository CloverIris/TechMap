import type {
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
  TelemetryEvent,
  TelemetryReceipt
} from "./types.js";

export interface ReleaseCatalogPort {
  getCurrent(locale: Locale): Promise<{
    release: ReleaseRef & { dataSchemaVersion: string; publishedAt: string; reviewedAt: string };
    rootDomains: RootDomain[];
  }>;
  getByVersion(dataVersion: string): Promise<(ReleaseRef & { dataSchemaVersion: string; publishedAt: string; reviewedAt: string }) | null>;
}

export interface LayoutReadPort {
  getSnapshot(release: ReleaseRef, view: MapView, locale: Locale): Promise<LayoutSnapshot | null>;
  getOverlay(release: ReleaseRef, view: MapView, overlay: OverlayType, locale: Locale): Promise<LayoutOverlay | null>;
  getExpansion(release: ReleaseRef, view: MapView, entityId: string, locale: Locale): Promise<LayoutExpansion | null>;
  getNeighborhood(input: {
    release: ReleaseRef;
    view: MapView;
    entityId: string;
    locale: Locale;
    relationTypes: string[] | undefined;
    direction: "incoming" | "outgoing" | "both";
    limit: number;
  }): Promise<LayoutNeighborhood | null>;
}

export interface KnowledgeReadPort {
  search(release: ReleaseRef, request: SearchRequest): Promise<{ items: SearchResult[]; nextCursor: string | null; total: number | null; totalIsExact: boolean }>;
  getEntity(release: ReleaseRef, entityId: string, locale: Locale): Promise<EntityDetail | null>;
  getSource(release: ReleaseRef, sourceId: string, locale: Locale): Promise<SourceView | null>;
  resolveSlug(release: ReleaseRef, resourceKind: ResourceKind, slug: string, locale: Locale): Promise<SlugResolution | null>;
  listGuidedPaths(release: ReleaseRef, locale: Locale): Promise<GuidedPathSummary[]>;
  getGuidedPath(release: ReleaseRef, pathId: string, locale: Locale): Promise<GuidedPath | null>;
}

export interface TelemetryWritePort {
  accept(events: TelemetryEvent[]): Promise<TelemetryReceipt>;
}

export interface TechMapStore extends ReleaseCatalogPort, LayoutReadPort, KnowledgeReadPort, TelemetryWritePort {}
