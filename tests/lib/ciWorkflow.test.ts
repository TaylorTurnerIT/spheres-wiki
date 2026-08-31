import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL("../../.github/workflows/test.yml", import.meta.url),
    "utf8",
  ),
);

describe("CI build contract", () => {
  it("gives Fallow a fetchable base ref in the detached Lighthouse checkout", () => {
    const job = workflow.jobs.lighthouse;
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
});
