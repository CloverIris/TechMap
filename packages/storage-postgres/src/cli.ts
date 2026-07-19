import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createPool } from "./client.js";
import { importRelease } from "./importer.js";
import { loadReleaseBundle } from "./release.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const pool = createPool(databaseUrl);
const command = process.argv[2];

try {
  if (command === "migrate") {
    const migrationDirectory = resolve(process.cwd(), "packages/storage-postgres/migrations");
    const migrationFiles = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
    await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (migration_id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const file of migrationFiles) {
      const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE migration_id = $1", [file]);
      if (applied.rowCount) continue;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(await readFile(join(migrationDirectory, file), "utf8"));
        await client.query("INSERT INTO schema_migrations(migration_id) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } else if (command === "import") {
    const releasePath = process.env.TECHMAP_DATA_RELEASE ?? "E:/techmap-data/releases/alpha.json";
    await importRelease(pool, await loadReleaseBundle(releasePath));
  } else {
    throw new Error("Expected migrate or import command.");
  }
} finally {
  await pool.end();
}
