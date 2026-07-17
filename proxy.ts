// Route protection (RBAC), runs before matched requests.
//
// Next.js 16 renamed "middleware" to "proxy" (Node.js runtime).
// Because sessions use the JWT strategy, `auth` here only decodes the
// session cookie — no database query per request.
//
// IMPORTANT (from CLAUDE.md): this is only the first line of defense.
// Every admin-only server action / route handler must ALSO check
// session.user.role === "ADMIN" itself.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth; // null when not logged in

  // Not logged in → send to /login, remembering where they wanted to go.
  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* is for ADMIN role only.
  if (nextUrl.pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/radios", nextUrl));
  }

  return NextResponse.next();
});

// Only run on routes that require a session.
// Public routes (/, /radios, /borrow-request, /login, /api/auth) are not matched.
export const config = {
  matcher: ["/dashboard/:path*", "/my-borrows/:path*", "/admin/:path*"],
};
