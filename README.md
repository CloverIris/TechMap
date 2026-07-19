# SeekStar TechMap

Local backend implementation for the frozen internal API contract.

## Current Scope

`apps/api` is the only executable program. It binds to `127.0.0.1:4000`, validates every request and JSON response against `contracts/internal-api/v1/openapi.yaml`, and reads a reviewed TechMap data release from local PostgreSQL.

No frontend, Docker configuration, Mock Server, public API, MCP endpoint, or deployment configuration belongs to this phase.

## Local Prerequisites

- Node.js 24.x and pnpm 11.x.
- Native PostgreSQL 18.x listening at `127.0.0.1:5432`.
- A local `techmap_local` database and an untracked `.env` containing `DATABASE_URL`.
- A fully reviewed `E:/techmap-data/releases/alpha.json` bundle. The importer rejects partial, synthetic, or evidence-incomplete releases.

## Commands

```powershell
pnpm db:migrate
pnpm data:import
pnpm build
pnpm start:api
```

The service must not be considered ready until the data repository has produced a complete validated Alpha release and the real PostgreSQL/HTTP test phase has run.
