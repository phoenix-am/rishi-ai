import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

export const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Applies every pending Drizzle migration and always releases the migration pool.
 * This operation is explicit so importing @rishi/database remains side-effect free.
 */
export async function runDatabaseMigrations(
  connectionString: string,
  migrationsFolder = DEFAULT_MIGRATIONS_FOLDER
): Promise<void> {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
