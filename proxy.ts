// Route protection (RBAC), runs before matched requests.
//
// Next.js 16 renamed "middleware" to "proxy" (Node.js runtime).
//
// IMPORTANT: this uses getToken() (read-only JWT decode) instead of the
// Auth.js `auth()` middleware wrapper on purpose. The wrapper re-issues
// (rotates) the session cookie on every matched response — and the router
// prefetches these protected routes, so a prefetch response landing just
// after signOut deleted the cookie would silently resurrect the session.
// That race made sign-out randomly "not stick" (worse for admins, who have
// more protected links prefetching). getToken() never writes cookies, so
// sign-out is the only writer and always wins. Trade-off: session expiry
// no longer slides on activity — members simply re-login after 30 days.
//
// This is only the first line of defense (per CLAUDE.md): every admin-only
// server action / page must ALSO check the role itself via requireAdmin().

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function proxy(req: NextRequest) {
  const { nextUrl } = req;

  // On Vercel/production the session cookie is "__Secure-authjs.session-token";
  // on plain-http localhost it's "authjs.session-token". Match by protocol.
  const secureCookie =
    nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    secureCookie,
  });

  // Not logged in → send to /login, remembering where they wanted to go.
  if (!token) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* is for ADMIN role only.
  if (nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/radios", nextUrl));
  }

  return NextResponse.next();
}

// Only run on routes that require a session.
// Public routes (/, /radios, /borrow-request, /login, /api/auth) are not matched.
export const config = {
  matcher: ["/dashboard/:path*", "/my-borrows/:path*", "/admin/:path*"],
};
