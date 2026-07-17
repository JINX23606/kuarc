// Prisma 7 CLI configuration.
// The CLI (migrate/db/studio) reads the connection URL from here — NOT from
// schema.prisma anymore. `import "dotenv/config"` loads .env for the CLI.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npx prisma db seed` runs this:
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations should use Supabase's DIRECT (non-pooled, port 5432)
    // connection; the app itself uses the pooled DATABASE_URL.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
