#!/usr/bin/env node
// Build guard: shared-idiom greps (V72). Fails the build when a page or
// component reimplements an idiom that has a canonical shared home:
//   a) `.talent-header-top` markup outside EntryCard.astro / the search
//      client's result renderer / global.css (V70).
//   b) `'champions' ? 'champ'`-style cssKey ternaries — use systemCssKey()
//      from src/lib/systems.ts (V53).
//   c) per-system `var(--clr-power|might|guile|champ)` rules in page styles —
//      theme through --clr-ns / --clr-active set by global.css (V10).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const ENTRY_CARD_ALLOWLIST = new Set([
  "src/components/EntryCard.astro",
  "src/pages/search/index.astro",
  "src/styles/global.css",
]);

function listSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (/\.(astro|ts|tsx|css)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function findMatches(files, pattern, exclude = new Set()) {
  const violations = [];
  for (const file of files) {
    const rel = path.relative(rootDir, file);
    if (exclude.has(rel)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (pattern.test(line))
        violations.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
  }
  return violations;
}

const srcFiles = listSourceFiles(path.join(rootDir, "src"));
const pageAndComponentFiles = srcFiles.filter((f) =>
  /src\/(pages|components)\//.test(
    path.relative(rootDir, f).replaceAll(path.sep, "/"),
  ),
);
const pageFiles = srcFiles.filter((f) =>
  /src\/pages\//.test(path.relative(rootDir, f).replaceAll(path.sep, "/")),
);

const failures = [];

const headerReimpl = findMatches(
  srcFiles,
  /talent-header-top/,
  ENTRY_CARD_ALLOWLIST,
);
if (headerReimpl.length > 0) {
  failures.push(
    "V70: `.talent-header-top` markup outside EntryCard.astro — use the EntryCard component:",
    ...headerReimpl,
  );
}

const cssKeyTernaries = findMatches(
  pageAndComponentFiles,
  /['"]champions['"]\s*\?\s*['"]champ['"]/,
);
if (cssKeyTernaries.length > 0) {
  failures.push(
    "V53: inline champions→champ cssKey ternary — use systemCssKey() from src/lib/systems.ts:",
    ...cssKeyTernaries,
  );
}

const perSystemRules = findMatches(
  pageFiles,
  /var\(--clr-(power|might|guile|champ)\)/,
);
if (perSystemRules.length > 0) {
  failures.push(
    "V10: per-system color var in page styles — theme via --clr-ns/--clr-active:",
    ...perSystemRules,
  );
}

if (failures.length > 0) {
  console.error("Idiom guard failed:\n");
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}

console.log("Idiom guard passed — shared idioms intact.");
