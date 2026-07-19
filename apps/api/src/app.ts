import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import compress from "@fastify/compress";
import { OpenApiContract, ContractValidationError } from "@seekstar/contract-runtime";
import { ApiError, TechMapService } from "@seekstar/core";
import { createPool, PostgresTechMapStore, strongEtag } from "@seekstar/storage-postgres";
import type { Locale, MapView, OverlayType, ResourceKind, SearchRequest, TelemetryEvent } from "@seekstar/storage-contract";

const contractVersion = "1.0.0";
const prefix = "/api/internal/v1";

interface RouteConfig { operationId: string; cache: "bootstrap" | "immutable" | "no-store"; usesLayout?: boolean }

const config = (operationId: string, cache: RouteConfig["cache"], usesLayout = false) => ({ config: { operationId, cache, usesLayout } });

export const buildApp = async (options: { databaseUrl: string; contractPath: string }): Promise<FastifyInstance> => {
  const contract = await OpenApiContract.load(options.contractPath);
  const pool = createPool(options.databaseUrl);
  const service = new TechMapService(new PostgresTechMapStore(pool));
  const app = Fastify({
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    genReqId: () => `req_${crypto.randomUUID().replaceAll("-", "")}`,
    logger: { level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization", "req.body.query"] }
  });
  await app.register(compress, { global: true, encodings: ["br", "gzip", "deflate"] });

  app.addHook("preValidation", async (request) => {
    const route = routeConfig(request);
    if (!route) return;
    if (request.query && typeof request.query === "object" && "relationTypes" in request.query) {
      const query = request.query as Record<string, unknown>;
      if (typeof query.relationTypes === "string") query.relationTypes = query.relationTypes.split(",");
    }
    contract.validateRequest(route.operationId, { params: request.params, query: request.query, headers: request.headers, body: request.body });
  });

  app.addHook("preSerialization", async (request, reply, payload) => {
    const route = routeConfig(request);
    if (!route || reply.statusCode === 304 || reply.statusCode >= 400 || reply.statusCode === 202) return payload;
    contract.validateResponse(route.operationId, reply.statusCode, payload);
    return payload;
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const route = routeConfig(request);
    reply.header("X-Request-Id", request.id).header("X-TechMap-Contract-Version", contractVersion);
    if (route?.cache === "bootstrap") reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    if (route?.cache === "immutable") reply.header("Cache-Control", "public, max-age=31536000, immutable");
    if (route?.cache === "no-store") reply.header("Cache-Control", "no-store");
    return payload;
  });

  const send = (request: FastifyRequest, reply: FastifyReply, payload: Record<string, unknown>, statusCode = 200): FastifyReply => {
    const meta = payload.meta as { dataVersion: string; layoutVersion: string | null } | undefined;
    if (meta) {
      reply.header("X-TechMap-Data-Version", meta.dataVersion);
      if (meta.layoutVersion) reply.header("X-TechMap-Layout-Version", meta.layoutVersion);
    }
    const etag = strongEtag(payload);
    reply.header("ETag", etag);
    if (request.headers["if-none-match"] === etag && statusCode === 200) return reply.code(304).send();
    return reply.code(statusCode).send(payload);
  };

  const release = async (dataVersion: string, layoutVersion?: string) => {
    const current = await service.releaseByVersion(dataVersion);
    if (layoutVersion && current.layoutVersion !== layoutVersion) throw new ApiError(410, "layout_not_found", "The requested layout version is unavailable.");
    return current;
  };

  app.get(`${prefix}/bootstrap`, config("getBootstrap", "bootstrap"), async (request, reply) => {
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.bootstrap(request.id, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/layouts/:layoutVersion/:view`, config("getLayoutSnapshot", "immutable", true), async (request, reply) => {
    const params = request.params as { dataVersion: string; layoutVersion: string; view: MapView };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.layout(request.id, await release(params.dataVersion, params.layoutVersion), params.view, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/layouts/:layoutVersion/:view/overlays/:overlay`, config("getLayoutOverlay", "immutable", true), async (request, reply) => {
    const params = request.params as { dataVersion: string; layoutVersion: string; view: MapView; overlay: OverlayType };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.overlay(request.id, await release(params.dataVersion, params.layoutVersion), params.view, params.overlay, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/layouts/:layoutVersion/:view/expansions/:entityId`, config("getLayoutExpansion", "immutable", true), async (request, reply) => {
    const params = request.params as { dataVersion: string; layoutVersion: string; view: MapView; entityId: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.expansion(request.id, await release(params.dataVersion, params.layoutVersion), params.view, params.entityId, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/layouts/:layoutVersion/:view/neighborhoods/:entityId`, config("getLayoutNeighborhood", "immutable", true), async (request, reply) => {
    const params = request.params as { dataVersion: string; layoutVersion: string; view: MapView; entityId: string };
    const query = request.query as { locale: Locale; relationTypes?: string[]; direction?: "incoming" | "outgoing" | "both"; limit?: number };
    return send(request, reply, await service.neighborhood(request.id, await release(params.dataVersion, params.layoutVersion), params.view, params.entityId, query.locale, query.relationTypes, query.direction ?? "both", query.limit ?? 40));
  });
  app.post(`${prefix}/releases/:dataVersion/search`, config("searchEntities", "no-store"), async (request, reply) => {
    const params = request.params as { dataVersion: string };
    return send(request, reply, await service.search(request.id, await release(params.dataVersion), request.body as SearchRequest));
  });
  app.get(`${prefix}/releases/:dataVersion/entities/:entityId`, config("getEntityDetail", "immutable"), async (request, reply) => {
    const params = request.params as { dataVersion: string; entityId: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.entity(request.id, await release(params.dataVersion), params.entityId, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/sources/:sourceId`, config("getSource", "immutable"), async (request, reply) => {
    const params = request.params as { dataVersion: string; sourceId: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.source(request.id, await release(params.dataVersion), params.sourceId, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/resolve/:resourceKind/:slug`, config("resolveEntitySlug", "immutable"), async (request, reply) => {
    const params = request.params as { dataVersion: string; resourceKind: ResourceKind; slug: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.resolve(request.id, await release(params.dataVersion), params.resourceKind, params.slug, query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/guided-paths`, config("listGuidedPaths", "immutable"), async (request, reply) => {
    const params = request.params as { dataVersion: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.guidedPaths(request.id, await release(params.dataVersion), query.locale));
  });
  app.get(`${prefix}/releases/:dataVersion/guided-paths/:pathId`, config("getGuidedPath", "immutable"), async (request, reply) => {
    const params = request.params as { dataVersion: string; pathId: string };
    const query = request.query as { locale: Locale };
    return send(request, reply, await service.guidedPath(request.id, await release(params.dataVersion), params.pathId, query.locale));
  });
  app.post(`${prefix}/telemetry/events`, config("ingestTelemetryEvents", "no-store"), async (request, reply) => {
    const receipt = await service.telemetry((request.body as { events: TelemetryEvent[] }).events);
    return reply.code(202).send(receipt);
  });

  app.setErrorHandler((error: Error, request, reply) => {
    const apiError = toApiError(error);
    const payload = {
      type: `https://techmap.seekstar.ai/problems/${apiError.code}`,
      title: apiError.statusCode >= 500 ? "Internal Server Error" : "Request failed",
      status: apiError.statusCode,
      code: apiError.code,
      requestId: request.id,
      detail: apiError.message,
      invalidParameters: apiError.invalidParameters
    };
    contract.validateProblem(payload);
    reply.type("application/problem+json").code(apiError.statusCode).send(payload);
  });
  app.addHook("onClose", async () => pool.end());
  return app;
};

const routeConfig = (request: FastifyRequest): RouteConfig | undefined => {
  const candidate = request.routeOptions.config as unknown as Partial<RouteConfig>;
  return candidate.operationId ? candidate as RouteConfig : undefined;
};

const toApiError = (error: Error): ApiError => {
  if (error instanceof ApiError) return error;
  if (error instanceof ContractValidationError) {
    return new ApiError(400, "invalid_request", "The request violates the API contract.", error.failures.filter((failure) => failure.location !== "response").map((failure) => ({ ...failure, location: failure.location as "path" | "query" | "header" | "body" })));
  }
  if ((error as { statusCode?: number }).statusCode === 413) return new ApiError(413, "payload_too_large", "The request body exceeds the API limit.");
  return new ApiError(500, "internal_error", "The service could not complete this request.");
};
