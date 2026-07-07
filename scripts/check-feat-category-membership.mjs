#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadFeatCategoryTagMeta,
  loadFeatEntries,
} from "./lib/feat-category-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expectedFilePath = path.resolve(
  __dirname,
  "../src/config/expected-feat-categories.json",
);
const expectedMembership = JSON.parse(fs.readFileSync(expectedFilePath, "utf8"));

const tagMeta = loadFeatCategoryTagMeta();
const feats = loadFeatEntries();

let hasError = false;

for (const [tagId] of [...tagMeta.entries()].sort((a, b) => {
  return (
    (a[1].priority ?? 999) - (b[1].priority ?? 999) || a[0].localeCompare(b[0])
  );
})) {
  const expected = expectedMembership[tagId] ?? [];
  const actual = feats.filter((feat) => feat.tags.includes(tagId));

  const expectedKeys = expected.map((entry) => entry.key);
  const actualKeys = actual.map(
    (feat) => `${feat.bookSlug}:${feat.system}:${feat.id}`,
  );

  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);

  const missing = expected.filter((entry) => !actualSet.has(entry.key));
  const unexpected = actual.filter(
    (feat) => !expectedSet.has(`${feat.bookSlug}:${feat.system}:${feat.id}`),
  );
  const duplicateActualKeys = [
    ...actual.reduce((map, feat) => {
      const key = `${feat.bookSlug}:${feat.system}:${feat.id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map()),
  ].filter(([, count]) => count > 1);

  if (
    missing.length > 0 ||
    unexpected.length > 0 ||
    actual.length !== expected.length ||
    duplicateActualKeys.length > 0
  ) {
    console.error(`Category "${tagId}" FAILED`);
    console.error(`  expected: ${expected.length}`);
    console.error(`  actual:   ${actual.length}`);
    if (missing.length) {
      console.error(
        `  missing:  ${missing.map((entry) => `${entry.key} (${entry.sourceDescription})`).join(", ")}`,
      );
    }
    if (unexpected.length) {
      console.error(
        `  extra:    ${unexpected.map((feat) => `${feat.bookSlug}:${feat.system}:${feat.id}`).join(", ")}`,
      );
    }
    if (duplicateActualKeys.length) {
      console.error(
        `  duplicate actual keys: ${duplicateActualKeys.map(([key, count]) => `${key}x${count}`).join(", ")}`,
      );
    }
    hasError = true;
  }
}

if (hasError) {
  console.error("\nFeat-category membership validation FAILED.");
  process.exit(1);
}

console.log(
  `Feat-category membership validation passed. ${tagMeta.size} categories checked.`,
);
