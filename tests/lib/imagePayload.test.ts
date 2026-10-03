import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { measureSphereImages } from "../../scripts/lib/image-payload.mjs";

const temporaryDirectories: string[] = [];

function buildFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "sphere-images-"));
  temporaryDirectories.push(dir);
  mkdirSync(path.join(dir, "_astro"));
  writeFileSync(path.join(dir, "_astro/icon.webp"), Buffer.alloc(125));
  return dir;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("V91 sphere image payload", () => {
  it("measures emitted files once across inert templates and visible native images", () => {
    const dir = buildFixture();
    const result = measureSphereImages(
      `<template data-sphere-icon-template="test"><img data-sphere-image src="/spheres-wiki/_astro/icon.webp" width="180" height="180" loading="lazy"></template>
       <img data-sphere-image src="/spheres-wiki/_astro/icon.webp" width="180" height="180" loading="lazy"><img src="unrelated.webp">`,
      dir,
    );
    expect(result.count).toBe(1);
    expect(result.bytes).toBe(125);
  });

  it("fails on absent, missing, external or escaped image references", () => {
    const dir = buildFixture();
    expect(() => measureSphereImages("<svg></svg>", dir)).toThrow();
    for (const source of [
      "",
      "https://example.com/icon.webp",
      "/spheres-wiki/_astro/missing.webp",
      "/spheres-wiki/_astro/../../outside.webp",
    ]) {
      expect(() =>
        measureSphereImages(
          `<template data-sphere-icon-template="test"><img data-sphere-image src="${source}" width="180" height="180" loading="lazy"></template>`,
          dir,
        ),
      ).toThrow();
    }
  });

  it("rejects live SVG raster fetches and unreserved or eager list images", () => {
    const dir = buildFixture();
    expect(() =>
      measureSphereImages(
        '<svg data-sphere-sprite><image href="/spheres-wiki/_astro/icon.webp" /></svg>',
        dir,
      ),
    ).toThrow("eager SVG");
    for (const attributes of [
      'width="180" height="180"',
      'loading="lazy"',
      'width="180" height="180" loading="eager"',
    ]) {
      expect(() =>
        measureSphereImages(
          `<img data-sphere-image src="/spheres-wiki/_astro/icon.webp" ${attributes}>`,
          dir,
        ),
      ).toThrow();
    }
    expect(
      measureSphereImages(
        '<h1><img data-sphere-image src="/spheres-wiki/_astro/icon.webp" width="180" height="180" loading="eager"></h1>',
        dir,
      ).count,
    ).toBe(1);
  });
});
