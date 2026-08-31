import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lighthouseConfig = JSON.parse(
  readFileSync(new URL("../../lighthouserc.json", import.meta.url), "utf8"),
) as {
  ci: {
    collect: {
      staticDistDir?: string;
      url: string[];
    };
    assert: {
      assertions: Record<string, unknown>;
    };
  };
};
const testWorkflow = readFileSync(
  new URL("../../.github/workflows/test.yml", import.meta.url),
  "utf8",
);

describe("Lighthouse CI deployment-path configuration", () => {
  it("targets Astro Preview under the deployed base path", () => {
    const { collect } = lighthouseConfig.ci;

    expect(collect.staticDistDir).toBeUndefined();
    expect(collect.url.length).toBeGreaterThan(0);

    for (const targetUrl of collect.url) {
      const target = new URL(targetUrl);
      expect(target.origin).toBe("http://127.0.0.1:4321");
      expect(target.pathname.startsWith("/spheres-wiki/")).toBe(true);
    }

    expect(new URL(collect.url[0]).pathname).toBe("/spheres-wiki/");
  });

  it("keeps asset and layout regressions as blocking assertions", () => {
    const { assertions } = lighthouseConfig.ci.assert;

    expect(assertions["errors-in-console"]).toEqual(["error", { minScore: 1 }]);
    expect(assertions["cumulative-layout-shift"]).toEqual([
      "error",
      { maxNumericValue: 0.1 },
    ]);
  });

  it("uses the real Preview server without rewriting the build tree", () => {
    expect(testWorkflow).toContain("bun run preview -- --host 127.0.0.1");
    expect(testWorkflow).not.toContain("ln -sfn . dist/spheres-wiki");
  });
});
