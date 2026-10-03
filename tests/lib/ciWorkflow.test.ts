import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL("../../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  ),
);

describe("CI build contract", () => {
  it("gives Fallow a fetchable base ref in the release checkout", () => {
    const job = workflow.jobs.build;
    const steps = job.steps as Array<Record<string, any>>;
    const checkoutIndex = steps.findIndex(
      (step) => step.uses === "actions/checkout@v5",
    );
    const baseIndex = steps.findIndex(
      (step) =>
        typeof step.run === "string" && step.run.includes("FALLOW_AUDIT_BASE"),
    );
    const buildIndex = steps.findIndex((step) => step.run === "bun run build");

    expect(checkoutIndex).toBeGreaterThanOrEqual(0);
    expect(steps[checkoutIndex]?.with?.["fetch-depth"]).toBe(0);
    expect(baseIndex).toBeGreaterThan(checkoutIndex);
    expect(baseIndex).toBeLessThan(buildIndex);
    expect(steps[baseIndex]?.run).toContain(
      [
        "FALLOW_AUDIT_BASE=origin/",
        String.fromCharCode(36),
        "{GITHUB_BASE_REF:-main}",
      ].join(""),
    );
  });

  it("V86 installs the locked Puppeteer browser and shares its path with both checks", () => {
    const steps = workflow.jobs.build.steps as Array<Record<string, any>>;
    const resolveIndex = steps.findIndex(
      (step) => step.id === "chrome-version",
    );
    const chromeIndex = steps.findIndex((step) => step.id === "chrome");
    const selectIndex = steps.findIndex((step) => step.env?.INSTALLED_CHROME);
    const smokeIndex = steps.findIndex((step) => step.id === "browser-smoke");
    const lighthouseIndex = steps.findIndex((step) => step.id === "lighthouse");

    expect(resolveIndex).toBeGreaterThanOrEqual(0);
    expect(steps[resolveIndex].run).toContain('from "puppeteer-core"');
    expect(steps[resolveIndex].run).toContain("PUPPETEER_REVISIONS.chrome");
    expect(chromeIndex).toBeGreaterThan(resolveIndex);
    expect(steps[chromeIndex].uses).toBe("browser-actions/setup-chrome@v2");
    expect(steps[chromeIndex].with).toEqual({
      "chrome-version": `\${{ steps.chrome-version.outputs.version }}`,
      "install-dependencies": true,
    });
    expect(selectIndex).toBeGreaterThan(chromeIndex);
    expect(steps[selectIndex].env.INSTALLED_CHROME).toBe(
      `\${{ steps.chrome.outputs.chrome-path }}`,
    );
    expect(steps[selectIndex].run).toContain(
      'echo "CHROME_PATH=$INSTALLED_CHROME" >> "$GITHUB_ENV"',
    );
    expect(smokeIndex).toBeGreaterThan(selectIndex);
    expect(lighthouseIndex).toBeGreaterThan(smokeIndex);
    expect(steps[smokeIndex].shell).toBe("bash");
    expect(steps[smokeIndex].run).toContain(
      "bun run test:browser 2>&1 | tee test-results/view-transition/browser.log",
    );
    const reports = steps.find(
      (step) => step.uses === "actions/upload-artifact@v4",
    );
    expect(reports?.if).toBe("always()");
    expect(reports?.with.path).toContain("test-results/view-transition/");
    expect(reports?.with.path).toContain(".lighthouseci/");
    expect(reports?.with["include-hidden-files"]).toBe(true);
  });

  it("V87 checks one unchanged build before upload for PR, main and manual runs", () => {
    expect(workflow.on).toEqual({
      push: { branches: ["main"] },
      pull_request: { branches: ["main"] },
      workflow_dispatch: null,
    });
    const build = workflow.jobs.build;
    expect(build.if).toBeUndefined();
    expect(build["continue-on-error"]).toBeUndefined();
    const steps = build.steps as Array<Record<string, any>>;
    expect(
      steps.filter((step) => step.uses === "actions/checkout@v5"),
    ).toHaveLength(1);
    expect(steps.filter((step) => step.run === "bun run build")).toHaveLength(
      1,
    );
    const required = ["static-build", "browser-smoke", "lighthouse"];
    let previous = -1;
    for (const id of required) {
      const index = steps.findIndex((step) => step.id === id);
      expect(index).toBeGreaterThan(previous);
      expect(steps[index].if).toBeUndefined();
      expect(steps[index]["continue-on-error"]).toBeUndefined();
      previous = index;
    }
    expect(steps[previous].run).toBe("bunx lhci autorun");
    const uploadIndex = steps.findIndex(
      (step) => step.uses === "actions/upload-pages-artifact@v3",
    );
    expect(uploadIndex).toBeGreaterThan(previous);
    expect(steps[uploadIndex].with.path).toBe("dist");
    // No command may rebuild or modify the checked tree before packaging it.
    expect(
      steps.slice(previous + 1, uploadIndex).every((step) => !step.run),
    ).toBe(true);
  });

  it("V87 refuses missing, skipped or failed gates before upload and deployment", () => {
    const steps = workflow.jobs.build.steps as Array<Record<string, any>>;
    const upload = steps.find(
      (step) => step.uses === "actions/upload-pages-artifact@v3",
    );
    // Native GitHub outcome checks require literal success: failure, cancelled,
    // skipped and missing outcomes cannot satisfy any of these comparisons.
    expect(upload?.if.replace(/\s+/g, " ").trim()).toBe(
      "success() && github.event_name != 'pull_request' && " +
        "steps.static-build.outcome == 'success' && " +
        "steps.browser-smoke.outcome == 'success' && " +
        "steps.lighthouse.outcome == 'success'",
    );
    expect(workflow.jobs.deploy.needs).toBe("build");
    expect(workflow.jobs.deploy.if).toBe(
      "github.event_name != 'pull_request' && needs.build.result == 'success'",
    );
    expect(workflow.jobs.deploy.steps).toEqual([
      { id: "deployment", uses: "actions/deploy-pages@v4" },
    ]);
  });
});
