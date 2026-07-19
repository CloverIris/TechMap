# Decision: Freeze The Alpha Frontend-Backend API Contract

| Field | Value |
| --- | --- |
| ID | `2026-001` |
| Status | Accepted |
| Date | 2026-07-19 |
| Deciders | Primary maintainer |
| Owner | Primary maintainer |
| PRD before | v1.0 |
| PRD required | None |
| Supersedes | None |
| Superseded by | None |

## Decision Class

- [ ] Product invariant or positioning
- [ ] Alpha scope
- [ ] Root domain or ontology
- [ ] Permanent ID or graph semantics
- [x] Public data, route, share-state, API, or MCP contract
- [ ] License, provenance, or editorial policy
- [x] Repository or deployment boundary
- [ ] Rendering, browser, accessibility, or performance contract
- [ ] Reversible implementation detail

## Context

The frontend and backend need to proceed independently without sharing database models, handwritten duplicate DTOs, or renderer state. The PRD already fixes product semantics, graph types, versioned layout snapshots, evidence rules, and Alpha workflows, but it intentionally does not define the HTTP projection between the product frontend and backend.

Without a frozen machine contract, each side would make local assumptions about nullability, relation direction, layout fragments, versions, errors, search privacy, and caching. Those assumptions would only meet during integration.

This internal contract is not the deferred public REST/OpenAPI or MCP product. It exists only at the Alpha product boundary.

## Decision

Freeze contract version `1.0.0` at [`contracts/internal-api/v1/openapi.yaml`](../../contracts/internal-api/v1/openapi.yaml), with semantic and operational rules in [`docs/API_CONTRACT.zh-CN.md`](../API_CONTRACT.zh-CN.md).

The contract uses OpenAPI 3.1.1 with JSON Schema Draft 2020-12 and the internal base path `/api/internal/v1`.

The API is a task-oriented, read-oriented product projection:

- Bootstrap discovers one coherent data and layout release.
- Immutable versioned resources serve layouts, overlays, expansions, neighborhoods, entities, sources, slug resolutions, and Guided Paths.
- Search uses POST with `no-store` so search text is absent from URLs and ordinary access logs.
- Anonymous telemetry uses a closed event schema with no arbitrary text or persistent visitor identifier.
- The API never exposes database tables, editorial YAML, arbitrary graph traversal, or renderer-specific object state.

The frontend pins the versions returned by Bootstrap for a page lifecycle. Base layout, at most one semantic-era expansion, additive overlays, and a focused one-hop neighborhood compose in a fixed order.

## Product Impact

User-facing Alpha scope and positioning do not change. This decision makes existing PRD behavior implementable in parallel and gives map loading, search, detail, evidence, share-route resolution, Guided Paths, and lifecycle overlays one shared vocabulary.

Advisor, accounts, Benchmark, public API/MCP, trend scoring, and arbitrary graph queries remain excluded.

## Data And Contract Impact

- Entity, relation, event, Statement, and Source semantics remain those in PRD v1.0.
- Twelve permanent root domain IDs are assigned without changing their meaning.
- Route families are frozen as `tech`, `domain`, `org`, `person`, and `paper`.
- Dataset, layout, data Schema, and API contract versions remain separate.
- Dataset payloads retain CC BY 4.0 attribution metadata.
- Layout snapshots use a renderer-independent right-handed coordinate system with Z as the semantic vertical axis.
- Share-state semantics remain frontend-owned and do not serialize camera floats.
- The future public `/v1` API is unaffected and must receive a separate decision.

## Options Considered

### Option A: Task-Oriented OpenAPI Contract

Selected. It gives both sides generated types, Mock support, runtime validation, stable errors, and resource projections aligned with actual product workflows. It preserves backend storage freedom and frontend rendering freedom.

Costs include maintaining explicit projection models, immutable release URLs, contract fixtures, and compatibility checks.

### Option B: Generic Graph API

Expose nodes, edges, and arbitrary traversal parameters. This would look flexible but would move graph-query planning, relation interpretation, pagination, and performance decisions into the frontend. It would also make database changes visible across the boundary and encourage unbounded relation rendering.

Rejected because it conflicts with progressive disclosure and does not create a stable product boundary.

### Option C: Shared TypeScript Types Only

Place interfaces in a shared package and let both sides implement them. This would not specify HTTP status, headers, cache behavior, request validation, examples, errors, or non-TypeScript consumers. Runtime drift would remain possible.

Rejected as insufficient for independent implementation.

### Status Quo

Frontend and backend would invent endpoints during implementation. Integration would become the first time nullability, version pinning, layout composition, and error behavior were tested together.

## Rationale

OpenAPI separates the contract from both implementation languages and supports human review, generated clients, generated server validation, Mock servers, documentation, and conformance testing from one artifact.

A task-oriented BFF keeps domain truth in the graph while delivering render-ready, bounded representations. Immutable paths make cache behavior and mixed-version detection simple. POST search materially reduces accidental search-text exposure without changing search semantics.

## Consequences

### Positive

- Frontend and backend can develop against the same artifact from the first day.
- Data storage and renderer implementation remain replaceable.
- Layout composition, evidence, errors, and versions become testable before integration.
- Search privacy and anonymous telemetry constraints are structural rather than advisory.
- Production resources can use strong ETags and immutable caching.

### Negative

- OpenAPI and fixtures become reviewed source files that require maintenance.
- Response projections duplicate some normalized data for fewer frontend round trips.
- Strict schemas make casual field additions intentionally slower.
- A contract-version migration process is required even for an internal API.

### Risks

- The initial contract may omit a real interaction discovered during prototyping.
- OpenAPI generators can differ in their support for 3.1 and JSON Schema composition.
- Layout payloads may exceed budgets if localized display data is repeated excessively.
- Internal endpoints might be mistaken for a supported public API.

These risks are handled by contract fixtures, generator spikes before application work, explicit payload budgets, and the `internal` path namespace.

## Migration And Compatibility

There is no existing frontend or backend implementation to migrate.

Contract artifact `1.0.0` is immutable after release. Compatible additions receive a new minor contract version; schema or semantic breaks require a new path major or a defined dual-version rollout. Data corrections use new data or layout versions instead of mutating versioned responses.

Permanent entity IDs, historical slug records, tombstones, and canonical redirects remain valid across contract implementations.

## Validation Plan

- Parse and lint the OpenAPI 3.1.1 document.
- Resolve every local `$ref` and reject missing or incorrectly typed targets.
- Validate embedded and external fixtures against response schemas.
- Run breaking-change detection against the previous contract artifact.
- Generate a TypeScript Client and Fastify validation types from the same source.
- Run frontend workflows against a Mock Server.
- Run Provider Contract Tests against the backend.
- Verify ETag, cache, compression, version headers, Problem Details, and response-size budgets.
- Verify search text is absent from URL, logs, Trace, error details, and telemetry.
- Verify layout fixtures for Atlas, Stack, Time, overlays, era expansion, and focused neighborhoods.

## Privacy, Security, And Operations

The contract is anonymous and read-oriented. Search bodies are never logged. Telemetry has no arbitrary property map, search text, entity ID, URL, user ID, session ID, or device fingerprint. Raw telemetry is aggregated and removed within 24 hours.

Production CORS is same-origin plus explicitly approved preview origins. Input and output validation uses the contract. Errors expose request IDs but not stack traces, SQL, file paths, or request bodies.

## Documentation Changes

- Add `docs/API_CONTRACT.zh-CN.md` as the normative semantic companion.
- Add `contracts/internal-api/v1/openapi.yaml` as the machine source of truth.
- Update `AGENTS.md` to require reading and validating the API contract.
- PRD v1.0 needs no version bump because product scope and invariants are unchanged.

## Implementation Plan

1. Add contract lint, reference, example, and breaking-change checks.
2. Generate a version-pinned TypeScript Client and server validation package.
3. Build a contract-derived Mock Server and fixtures.
4. Develop frontend flows against Mock responses.
5. Develop backend operations against Provider Contract Tests.
6. Integrate only after both sides pass the same contract artifact.

Application scaffolding and dependency installation are outside this decision task and require separate authorization.

## Approval

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Primary maintainer | Repository owner | Accepted | 2026-07-19 |
| Product/editorial reviewers | Not required | N/A | 2026-07-19 |
| Engineering/data reviewers | Pending implementation | Pending | 2026-07-19 |

## Follow-Up

- Reevaluate the contract after the first complete Mock-driven implementation of all Alpha workflows.
- Any missing workflow is added through a versioned contract change, not an unreviewed endpoint.
- Design the future public `/v1` API only after the map data and interaction model are mature.
