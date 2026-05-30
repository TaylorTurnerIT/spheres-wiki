import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Playwright e2e config for spheres-wiki static site.
 *
 * NixOS: browsers won't run natively. Use Docker:
 *   npm run build && docker compose -f docker-compose.e2e.yml up --abort-on-container-exit
 *
 * CI (GitHub Actions): use Dockerfile.e2e multistage build.
 */

const isDocker = !!process.env.CI || !!process.env.PLAYWRIGHT_DOCKER;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start the web server when NOT running inside Docker.
  // Docker handles serving via the compose file or CMD.
  ...(isDocker
    ? {}
    : {
        webServer: {
          command: `npx serve dist -l ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: true,
          cwd: ".",
          timeout: 30_000,
        },
      }),
});
