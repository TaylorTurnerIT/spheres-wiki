# Cavekit: Playwright Removal & Lightningcss (Step 1)

## §G Goal
Remove Playwright and all associated E2E configurations to reduce maintenance overhead, then integrate Lightningcss into Astro for significantly faster CSS builds.

## §T Tasks

### T1: Purge Playwright
- Remove `@playwright/test` from `package.json`.
- Delete `playwright.config.ts`.
- Delete the `tests/e2e/` directory.
- Delete `docker-compose.e2e.yml` and `Dockerfile.e2e`.
- Delete `scripts/run-e2e-docker.sh` if present.
- Remove Playwright scripts from `package.json` (`test:e2e`, `test:e2e:ui`, `test:e2e:docker`, `test:e2e:docker:full`, `test:all`).
- Remove the E2E jobs or commented sections from `.github/workflows/test.yml`.

### T2: Install & Configure Lightningcss
- Install: `npm install -D lightningcss`.
- Update `astro.config.mjs` to include the transformer:
  ```js
  vite: {
    css: { transformer: "lightningcss" },
    // ... existing plugins/server watch options
  }
  ```

### T3: Verification
- Run `npm test` (should only run Vitest now).
- Run `npm run build` and ensure no CSS errors occur and the site generates successfully.
