import { NextRequest, NextResponse } from "next/server";

const COOKIE_SESSION = "agentpatch.session";
const COOKIE_DEMO = "agentpatch.demo";

// Protected prefixes include "/" so a fresh visitor with no demo/session
// cookies always funnels through /login -> /demo (mint) -> / (dashboard).
// /login and /demo short-circuit in the allowlist below; /api/* are
// intentionally unprotected so the backend can serve its public health,
// demo, and magic-link routes directly.
const PROTECTED_PREFIXES = [
  "/",
  "/runs",
  "/compare",
  "/evals",
  "/review",
  "/settings",
  "/workflows",
];

function isProtected(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return false;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow /login, /demo, and any static asset. / is intentionally
  // NOT on this allowlist -- a fresh visitor with no demo/session cookies
  // must funnel through /login (which already offers both the sign-in form
  // and the "Open the demo workspace" CTA -> /demo). Returning visitors
  // with valid cookies fall through to the protected-route check below
  // and pass straight through to the dashboard, matching the behaviour of
  // /runs, /compare, /evals, /review, /settings, /workflows.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
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
