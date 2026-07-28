import { test, expect } from "@playwright/test";

/**
 * Live-URL smoke test.
 *
 * Runs against the deployed Vercel URL by default (PLAYWRIGHT_BASE_URL
 * can override for local). Catches the deployment-shape regressions
 * that pytest/Vercel-build can't: CORS preflight breakage, cookie
 * persistence issues, uncaught console errors, 4xx/5xx response surface.
 *
 * Runs on every push to main via .github/workflows/smoke.yml. Total
 * runtime ~30s. Single test because the journey is sequential.
 */
test("fresh visitor to portfolio link has a working demo workspace", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const badResponses: { url: string; status: number }[] = [];
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && status < 600) {
      badResponses.push({ url: response.url(), status });
    }
  });

  // 1. Landing page renders
  await page.goto("/");
  await expect(page).toHaveTitle(/AgentPatch/);

  // 2. The Open demo workspace CTA exists and is clickable
  const demoCta = page.getByRole("link", { name: /open.*demo/i }).first();
  await expect(demoCta).toBeVisible();

  // 3. Click it. We land on the dashboard `/` (NOT bounced to /login).
  // The demo flow is: home -> click CTA -> /demo -> POST /auth/demo ->
  // window.location.assign('/'). Wait explicitly for that final hop so
  // we don't race the 250ms setTimeout in apps/web/app/demo/page.tsx.
  await demoCta.click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", {
    timeout: 20_000,
  });

  // 4. KPI cards visible (dashboard renders something meaningful)
  await expect(page.locator("body")).toContainText(/runs?/i);

  // 5. Every protected route loads without 4xx/5xx
  for (const route of ["/runs", "/compare", "/evals", "/review", "/settings"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    // proxy.ts will kick to /login if the cookie is missing -- the
    // smoke test catches that as a regression automatically.
    expect(page.url(), `expected to stay on ${route}, ended at ${page.url()}`).toContain(route);
  }

  // 6. Click into the first run row -> run detail page renders
  await page.goto("/runs");
  const firstRunLink = page.locator('a[href^="/runs/"]').first();
  await firstRunLink.click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText(/span/i);

  // 7. Catch-all assertions
  expect(consoleErrors, "console errors during smoke test").toEqual([]);
  expect(
    badResponses,
    `4xx/5xx responses during smoke test:\n${badResponses.map((r) => `  ${r.status} ${r.url}`).join("\n")}`,
  ).toEqual([]);
});
