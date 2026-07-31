import { runDatabaseMigrations } from "./migrations.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

await runDatabaseMigrations(connectionString);
process.stdout.write("Database migrations completed successfully.\n");
