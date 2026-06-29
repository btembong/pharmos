// @ts-nocheck
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

migrate(db, { migrationsFolder: "./migrations" })
  .then(() => {
    console.log("Migrations applied successfully.");
    pool.end();
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    pool.end();
    process.exit(1);
  });
