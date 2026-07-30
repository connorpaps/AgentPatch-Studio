import { getCurrentProject, getIdentity, listProjects } from "@/lib/api";
import { AppChrome } from "./_chrome";

/**
 * Server-component wrapper for the (app) routes -- the protected area
 * that lives behind proxy.ts (Dashboard, Runs, Compare, Eval Lab,
 * Review, Settings, Workflows).
 *
 * Why a Server Component for the layout, when the body is a sidebar +
 * main shell that needs usePathname() and React state?
 *
 *   Two callers used to make the same mistake: UserMenu.tsx fired a
 *   client useEffect on /api/v1/auth/me, and layout.tsx fired a second
 *   useEffect on /api/v1/projects + /projects/me. Both threw on the
 *   user's live app because the demo cookie is set with `SameSite=Lax`
 *   from a top-level navigation, and Chrome drops Lax cookies on
 *   sub-resource fetches -- so /api/v1/auth/me from the browser useEffect
 *   arrived at Render with no auth and 401'd. The previous fix had
 *   tried to disable the throw with .catch(() => null), but the rejection
 *   still surfaced as an unhandled useEffect error and tripped the
 *   Next.js server-component error envelope on first paint.
 *
 * We move the auth + project fetches here, into SSR, where buildOutgoingCookieHeader
 * reads the demo cookie from next/headers() and re-emits it on the
 * outbound fetch. The values are then handed to the AppChrome client
 * shell -- which means the browser never needs to refetch /auth/me or
 * /projects/* at hydration time. The identity chip in the sidebar is
 * now a static prop, not a useEffect side-effect, and the whole
 * sidebar paints with the right identity on first byte.
 *
 * Each .catch returns the appropriate empty value so a fetch glitch
 * still renders something instead of crashing the layout boundary.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [identity, projects, currentProject] = await Promise.all([
    getIdentity().catch(() => null),
    listProjects().catch(() => []),
    getCurrentProject().catch(() => null),
  ]);
  return (
    <AppChrome
      initialIdentity={identity}
      initialProjects={projects}
      initialCurrentProject={currentProject}
    >
      {children}
    </AppChrome>
  );
}
