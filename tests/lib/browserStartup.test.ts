import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const smokeScript = fileURLToPath(
  new URL("../e2e/view-transition-smoke.mjs", import.meta.url),
);
let artifactDir: string;

beforeEach(() => {
  artifactDir = mkdtempSync(path.join(tmpdir(), "spheres-browser-startup-"));
});
afterEach(() => rmSync(artifactDir, { recursive: true, force: true }));

function runSmoke(chromePath: string, fallbackPath = "") {
  const result = spawnSync(process.execPath, [smokeScript], {
    env: {
      ...process.env,
      CI: "true",
      CHROME_PATH: chromePath,
      PUPPETEER_EXECUTABLE_PATH: fallbackPath,
      VIEW_TRANSITION_ARTIFACT_DIR: artifactDir,
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  const report = JSON.parse(
    readFileSync(path.join(artifactDir, "report.json"), "utf8"),
  );
  expect(report.status).toBe("failed");
  expect(report.runs).toEqual([]);
  return { result, report };
}

describe("V86 browser startup diagnostics", () => {
  it("retains a failure report when CI has no provisioned browser", () => {
    const { report } = runSmoke("");
    expect(report.error).toContain("CI requires CHROME_PATH");
  });

  it("fails a missing explicit executable instead of silently falling back", () => {
    const missing = path.join(artifactDir, "missing-chrome");
    const { report } = runSmoke(missing, process.execPath);
    expect(report.browser.executablePath).toBe(missing);
    expect(report.error).toContain(
      "Configured Chrome executable does not exist",
    );
  });

  it("retains the selected version and stderr when the browser process fails", () => {
    const fakeBrowser = path.join(artifactDir, "failing-chrome");
    writeFileSync(
      fakeBrowser,
      `#!/usr/bin/env node
if (process.argv.includes("--version")) {
  console.log("Chrome test-version");
} else {
  console.error("intentional-browser-startup-failure");
  process.exitCode = 13;
}
`,
      { mode: 0o755 },
    );
    const { result, report } = runSmoke(fakeBrowser);
    expect(report.browser).toEqual({
      executablePath: fakeBrowser,
      version: "Chrome test-version",
    });
    expect(report.error).toContain("intentional-browser-startup-failure");
    expect(result.stderr).toContain("intentional-browser-startup-failure");
    expect(result.stdout).toContain(`Chrome executable: ${fakeBrowser}`);
  });
});
