#!/usr/bin/env node
// Detect talents/feats tagged (Dual Sphere) on the old wiki that are missing
// the dualSphere field in the current codebase (V58).
// Only the old wiki's explicit labeling defines dual-sphere status — prerequisite
// text is not authoritative for this determination.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");
const expectedFilePath = path.resolve(
  __dirname,
  "../src/config/expected-dual-spheres.json",
);

// Load expected dual sphere entries from generated JSON file
const dualSphereEntries = new Set(
  JSON.parse(fs.readFileSync(expectedFilePath, "utf8")),
);

console.log(`Expected dual-spheres: ${dualSphereEntries.size} entries loaded.`);

// ── 2. Parse current codebase for talents/feats ──────────────────────────
const allFiles = getMarkdownFilesRecursively(contentDir, { skipQuarantine: true });

let hasError = false;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  let fm;
  try {
    fm = parseYaml(match[1]);
  } catch {
    continue;
  }
  if (!fm) continue;
  if (fm.type !== "talent" && fm.type !== "feat") continue;

  const entryName = (fm.name || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  const entrySphere = fm.sphere;
  if (!entrySphere) continue;

  const key = `${entrySphere}::${entryName.toLowerCase()}`;
  if (!dualSphereEntries.has(key)) continue;

  // This entry was tagged (Dual Sphere) on the old wiki — verify it has dualSphere.
  // The dual-sphere tag is now auto-derived from the dualSphere field — never in frontmatter.
  if (!fm.dualSphere) {
    const relPath = path.relative(contentDir, filePath);
    console.error(
      `Missing dualSphere: "${fm.name}" (${relPath}) — tagged (Dual Sphere) on old wiki but no dualSphere field`,
    );
    hasError = true;
  }
}

// ── 3. Also check: any old-wiki (Dual Sphere) entries not found in codebase? ──
// (Uncomment to audit content gaps)
// for (const key of dualSphereEntries) {
//   // Would need to check all entries — expensive, skip for now
// }

if (hasError) {
  console.error("\nDual Sphere check FAILED.");
  process.exit(1);
} else {
  console.log(
    "Dual Sphere check passed — all old-wiki (Dual Sphere) entries have dualSphere field.",
  );
  process.exit(0);
}
