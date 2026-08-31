import { describe, expect, it } from "vitest";
import { findLfsPointerAssets } from "../../src/lib/assetIntegrity";

describe("asset integrity", () => {
  it("detects Git LFS pointer files before Astro processes them", () => {
    const pointer = [
      "version https://git-lfs.github.com/spec/v1",
      "oid sha256:76301cd68f0f8aa01afba2fb2860b0a65f75b7ac414f0d0754b7b90540c5c1a8",
      "size 186768",
      "",
    ].join("\n");

    expect(
      findLfsPointerAssets([
        { path: "src/assets/covers/missing.webp", contents: pointer },
        { path: "src/assets/covers/real.webp", contents: "RIFF" },
      ]),
    ).toEqual(["src/assets/covers/missing.webp"]);
  });
});
