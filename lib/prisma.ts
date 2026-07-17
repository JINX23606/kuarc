// Prisma client singleton.
//
// Prisma 7: the client no longer reads DATABASE_URL from the schema file.
// Instead we pass a "driver adapter" (here: node-postgres via @prisma/adapter-pg)
// with the connection string from the environment.
//
// The singleton pattern (storing the client on globalThis) prevents Next.js
// dev-mode hot reload from opening a new DB connection on every file change.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Fall back to a dummy localhost URL so the app can still boot (and show
// mock data) before the real Supabase DATABASE_URL is configured.
// No connection is attempted until the first actual query.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/radiotrack";

const adapter = new PrismaPg(connectionString);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
