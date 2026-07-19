import { resolve } from "node:path";
import { buildApp } from "./app.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must point to the local techmap_local PostgreSQL database.");

const app = await buildApp({
  databaseUrl,
  contractPath: process.env.TECHMAP_CONTRACT_PATH ?? resolve(process.cwd(), "contracts/internal-api/v1/openapi.yaml")
});

await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? "4000") });
