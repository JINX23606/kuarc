// NextAuth (Auth.js v5) configuration.
//
// - Google OAuth only. Both @ku.th and personal Gmail are allowed (per
//   CLAUDE.md, domain restriction is a possible later tightening).
// - Users are persisted to Postgres via the Prisma adapter.
// - Sessions use the JWT strategy so the proxy (middleware) can check
//   login state + role from the cookie without a DB query.
//
// Required env vars: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
// (Auth.js picks these names up automatically.)

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Server-side guard for admin-only pages and server actions.
// The proxy already blocks /admin/* routes, but per CLAUDE.md every
// admin mutation must ALSO verify the role itself — use this helper.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/radios");
  return session;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Verbose auth logging in dev — surfaces the real error (e.g. adapter/DB
  // failures) instead of only the generic "Configuration" error page.
  debug: process.env.NODE_ENV === "development",
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [Google],
  pages: {
    signIn: "/login", // use our own login page instead of the built-in one
  },
  callbacks: {
    // Runs when a JWT is created (sign-in) or updated.
    // On sign-in, copy the DB user's id and role into the token.
    // NOTE: role is captured at sign-in time — if an admin promotes a user,
    // that user must sign out/in again to pick up the new role.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Expose id and role on the session object used by the app.
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
