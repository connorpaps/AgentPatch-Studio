import { NextRequest, NextResponse } from "next/server";

const COOKIE_SESSION = "agentpatch.session";
const COOKIE_DEMO = "agentpatch.demo";

const PROTECTED_PREFIXES = [
  "/runs",
  "/compare",
  "/evals",
  "/review",
  "/settings",
  "/workflows",
];

function isProtected(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/api/")) {
    return false;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow /login, /demo, the marketing landing page, and any static asset.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(COOKIE_SESSION);
  const demo = request.cookies.get(COOKIE_DEMO);

  if (isProtected(pathname) && !session && !demo) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
