#!/usr/bin/env node
// Build guard: shared-idiom greps (V72). Fails the build when a page or
// component reimplements an idiom that has a canonical shared home:
//   a) `.talent-header-top` markup outside EntryCard.astro / the search
//      client's result renderer / global.css (V70).
//   b) `'champions' ? 'champ'`-style cssKey ternaries — use systemCssKey()
//      from src/lib/systems.ts (V53).
//   c) per-system `var(--clr-power|might|guile|champ)` rules in page styles —
//      theme through --clr-ns / --clr-active set by global.css (V10).
//   d) bare `new TomSelect(` construction in pages/components — every dropdown
//      must go through createTomSelect() in src/lib/tomSelectInit.ts (SPEC §5).
//   e) inline `.section-heading` markup in pages — use SectionHeading /
//      CollapsibleSectionHeading (V70–V72).
//   f) retired per-site button classes — compose the shared .btn utility
//      (builder save/copy/reset/catalog, toggle-all).
//   g) inline tag-row markup in pages — use TagRow.astro.
//   h) per-system decorative art `<svg viewBox="0 0 800 140"` / `0 0 200 80`
//      in pages/components — use SystemArt.astro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const ENTRY_CARD_ALLOWLIST = new Set([
  "src/components/EntryCard.astro",
  "src/pages/search/index.astro",
  "src/lib/searchClient.ts",
  "src/styles/global.css",
]);

// The sole home for `new TomSelect(...)`. Every dropdown constructs its
// instance through createTomSelect() (SPEC §5); the helper itself is exempt.
const TOM_SELECT_ALLOWLIST = new Set(["src/lib/tomSelectInit.ts"]);

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

const tomSelectReimpl = findMatches(
  srcFiles,
  /new\s+TomSelect\s*\(/,
  TOM_SELECT_ALLOWLIST,
);
if (tomSelectReimpl.length > 0) {
  failures.push(
    "SPEC §5: bare `new TomSelect(` — construct dropdowns via createTomSelect() from src/lib/tomSelectInit.ts:",
    ...tomSelectReimpl,
  );
}

// Inline section-heading markup in pages — use SectionHeading /
// CollapsibleSectionHeading (V70–V72). Components may emit the classes.
const inlineSectionHeading = findMatches(
  pageFiles,
  /class="section-heading[ "]|class=\{?\[`?section-heading/,
);
if (inlineSectionHeading.length > 0) {
  failures.push(
    "V72: inline .section-heading markup in a page — use SectionHeading.astro (CollapsibleSectionHeading for toggles):",
    ...inlineSectionHeading,
  );
}

// Retired per-site small-button classes — use the shared .btn utilities.
const retiredBtnClasses = findMatches(
  pageAndComponentFiles,
  /class=["'{`=]*(?:[^"'`]*\s)?(toggle-all-btn|builder-save-btn|builder-copy-btn|builder-reset-btn|builder-catalog-btn)\b/,
);
if (retiredBtnClasses.length > 0) {
  failures.push(
    "V72: retired button class — use the shared .btn/.btn--solid utilities (global.css):",
    ...retiredBtnClasses,
  );
}

// Inline tag-row markup in pages — use TagRow.astro.
const inlineTagRow = findMatches(
  pageAndComponentFiles.filter((f) => !f.endsWith("TagRow.astro")),
  /class="tag-row"|tag-row-desc/,
  new Set(["src/components/TagRow.astro"]),
);
if (inlineTagRow.length > 0) {
  failures.push(
    "tags-index idiom: inline tag-row markup — use TagRow.astro:",
    ...inlineTagRow,
  );
}

if (failures.length > 0) {
  console.error("Idiom guard failed:\n");
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}

console.log("Idiom guard passed — shared idioms intact.");
