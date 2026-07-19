# Decision: Backend-First Local Service

| Field | Value |
| --- | --- |
| ID | `2026-002` |
| Status | Accepted |
| Date | 2026-07-19 |
| Deciders | Primary maintainer |
| Owner | Primary maintainer |
| PRD before | v1.0 |
| PRD required | None |
| Supersedes | Part of `2026-001` implementation sequence |
| Superseded by | None |

## Decision

Build the real local backend before any frontend implementation. `apps/api` is the only executable program, binds only to `127.0.0.1:4000`, and implements the frozen twelve-operation `/api/internal/v1` contract. It reads only a validated, immutable `techmap-data` release imported into a native local PostgreSQL 18.x database.

During implementation, complete business code and real storage integration before writing or running automated tests. After code freeze, validate against a real PostgreSQL test database and real Fastify process. No Mock Server, Docker configuration, frontend, or deployment split belongs to this phase.

## Consequences

- The existing OpenAPI contract remains the sole frontend/backend boundary.
- `E:\techmap-data` is a distinct Git repository and only its checked release bundle may be imported.
- Local credentials remain untracked. The default local cluster directory is `E:\SeekStarLocal\postgres` and the database is `techmap_local`.
- A complete reviewed Alpha data release is a prerequisite for a populated service. Partial or synthetic data cannot be imported as a release.

## Validation Plan

After implementation freeze: migrate a real PostgreSQL test database, import the reviewed release transactionally, then run contract, storage, HTTP, end-to-end, privacy, cache, compression, and result-report checks described in the PRD and implementation plan.
