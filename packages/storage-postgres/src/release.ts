import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EntityDetail, EntityMapSummary, GuidedPath, GuidedPathSummary, LayoutExpansion, LayoutNeighborhood, LayoutOverlay, LayoutSnapshot, RootDomain, SourceView } from "@seekstar/storage-contract";

export interface ReleaseBundle {
  manifest: {
    dataVersion: string;
    dataHash: string;
    dataSchemaVersion: string;
    layoutVersion: string;
    publishedAt: string;
    reviewedAt: string;
  };
  rootDomains: RootDomain[];
  entities: Array<{
    summary: EntityMapSummary;
    isMainTechnology: boolean;
    localizations: Array<{ locale: "zh-CN" | "en"; displayName: string; summary: string; descriptionMarkdown: string }>;
    aliases: Array<{ value: string; locale: "zh-CN" | "en" | null; kind: string }>;
    detailByLocale: Record<"zh-CN" | "en", EntityDetail>;
  }>;
  sourcesByLocale: Record<"zh-CN" | "en", SourceView[]>;
  relations: Array<{ id: string; relationType: string; sourceEntityId: string; targetEntityId: string; symmetric: boolean; payload: Record<string, unknown> }>;
  events: Array<{ id: string; eventType: string; occurredAt: Record<string, unknown>; payload: Record<string, unknown> }>;
  statements: Array<{
    id: string;
    status: string;
    primarySourceId: string;
    reviewedAt: string;
    sourceIds: string[];
    subjects: Array<{ kind: "entity_definition" | "key_time" | "core_relation"; entityId?: string; relationId?: string }>;
    payload: Record<string, unknown>;
  }>;
  guidedPathsByLocale: Record<"zh-CN" | "en", { list: GuidedPathSummary[]; paths: GuidedPath[] }>;
  layouts: Array<{ locale: "zh-CN" | "en"; snapshot: LayoutSnapshot }>;
  overlays: Array<{ locale: "zh-CN" | "en"; view: string; overlay: string; payload: LayoutOverlay }>;
  expansions: Array<{ locale: "zh-CN" | "en"; view: string; entityId: string; payload: LayoutExpansion }>;
  neighborhoods: Array<{ locale: "zh-CN" | "en"; view: string; entityId: string; payload: LayoutNeighborhood }>;
  slugResolutions: Array<{ locale: "zh-CN" | "en"; resourceKind: string; slug: string; payload: Record<string, unknown> }>;
}

export const loadReleaseBundle = async (path: string): Promise<ReleaseBundle> => {
  const absolutePath = resolve(path);
  const bytes = await readFile(absolutePath);
  const bundle = JSON.parse(bytes.toString("utf8")) as ReleaseBundle;
  const calculatedHash = canonicalReleaseHash(bundle);
  if (bundle.manifest.dataHash !== calculatedHash) {
    throw new Error(`Release data hash mismatch for ${absolutePath}.`);
  }
  validateBundle(bundle);
  return bundle;
};

export const canonicalReleaseHash = (bundle: ReleaseBundle): string => {
  const canonical = structuredClone(bundle);
  canonical.manifest.dataHash = "";
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`;
};

const validateBundle = (bundle: ReleaseBundle): void => {
  if (bundle.rootDomains.length !== 12) throw new Error("A release must contain exactly 12 root domains.");
  if (bundle.entities.length < 500 || bundle.entities.length > 700) {
    throw new Error("Alpha release must contain 500 to 700 total entities.");
  }
  const mainTechnologyCount = bundle.entities.filter((entity) => entity.isMainTechnology).length;
  if (mainTechnologyCount < 280 || mainTechnologyCount > 320) {
    throw new Error("Alpha release must contain 280 to 320 main technologies.");
  }
  const ids = new Set<string>();
  for (const entity of bundle.entities) {
    if (ids.has(entity.summary.id)) throw new Error(`Duplicate entity ID: ${entity.summary.id}`);
    ids.add(entity.summary.id);
    if (!entity.detailByLocale["zh-CN"] || !entity.detailByLocale.en) throw new Error(`Entity lacks required localizations: ${entity.summary.id}`);
  }
  const sourceIds = new Set(bundle.sourcesByLocale.en.map((source) => source.id));
  const statementIds = new Set<string>();
  for (const statement of bundle.statements) {
    if (statementIds.has(statement.id)) throw new Error(`Duplicate statement ID: ${statement.id}`);
    statementIds.add(statement.id);
    if (!sourceIds.has(statement.primarySourceId) || statement.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
      throw new Error(`Statement references an unknown source: ${statement.id}`);
    }
  }
  for (const entity of bundle.entities) {
    if (!bundle.statements.some((statement) => statement.subjects.some((subject) => subject.kind === "entity_definition" && subject.entityId === entity.summary.id))) {
      throw new Error(`Entity definition lacks an accepted statement: ${entity.summary.id}`);
    }
    if (entity.summary.firstPublicAt && !bundle.statements.some((statement) => statement.subjects.some((subject) => subject.kind === "key_time" && subject.entityId === entity.summary.id))) {
      throw new Error(`Entity key time lacks an accepted statement: ${entity.summary.id}`);
    }
  }
  for (const relation of bundle.relations) {
    if (!bundle.statements.some((statement) => statement.subjects.some((subject) => subject.kind === "core_relation" && subject.relationId === relation.id))) {
      throw new Error(`Relation lacks an accepted statement: ${relation.id}`);
    }
  }
};
