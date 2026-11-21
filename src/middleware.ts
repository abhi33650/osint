import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Lightweight edge guard: checks for the presence of a session cookie and
 * redirects accordingly. Full cryptographic verification happens in the
 * server layout/route handlers (Node runtime), not here.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tracking-links",
  "/email-intelligence",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tracking-links/:path*",
    "/email-intelligence/:path*",
    "/settings/:path*",
    "/login",
  ],
};
