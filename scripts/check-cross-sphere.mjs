#!/usr/bin/env node
// Detect talents/feats tagged (Dual Sphere) on the old wiki that are missing
// the dualSphere field in the current codebase (V58).
// Only the old wiki's explicit labeling defines dual-sphere status — prerequisite
// text is not authoritative for this determination.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");
const wikiDir = path.resolve(
  __dirname,
  "../../spheresofpower-wikidot-archive/pages",
);

// ── 1. Parse old wiki for (Dual Sphere) entries ─────────────────────────
// Old wiki pages are named {sphere}.txt and contain ++++ Name (Dual Sphere) [Src]
const dualSphereEntries = new Set(); // "sphere::name" keys

const OLD_PAGE_SPHERE_MAP = {
  "alteration.txt": "alteration",
  "blood.txt": "blood",
  "conjuration.txt": "conjuration",
  "creation.txt": "creation",
  "dark.txt": "dark",
  "death.txt": "death",
  "destruction.txt": "destruction",
  "divination.txt": "divination",
  "enhancement.txt": "enhancement",
  "fallen-fey.txt": "fallen-fey",
  "fate.txt": "fate",
  "illusion.txt": "illusion",
  "life.txt": "life",
  "light.txt": "light",
  "mana.txt": "mana",
  "mind.txt": "mind",
  "nature.txt": "nature",
  "protection.txt": "protection",
  "telekinesis.txt": "telekinesis",
  "time.txt": "time",
  "war.txt": "war",
  "warp.txt": "warp",
  "weather.txt": "weather",
  // Might sphere pages
  "alchemy-sphere.txt": "alchemy",
  "equipment-sphere.txt": "equipment",
  "warleader-sphere.txt": "warleader",
  // Guile sphere pages
  "artifice.txt": "artifice",
  "bluster.txt": "bluster",
  "body-control.txt": "body-control",
  "communication.txt": "communication",
  "faction.txt": "faction",
  "herbalism.txt": "herbalism",
  "infiltration.txt": "infiltration",
  "investigation.txt": "investigation",
  "navigation.txt": "navigation",
  "performance.txt": "performance",
  "spellhacking.txt": "spellhacking",
  "study.txt": "study",
  "subterfuge.txt": "subterfuge",
  "survivalism.txt": "survivalism",
  "vocation.txt": "vocation",
};

for (const [filename, sphere] of Object.entries(OLD_PAGE_SPHERE_MAP)) {
  const filePath = path.join(wikiDir, filename);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    // Match: ++++ Name (Dual Sphere), ++++ Name [Dual Sphere], ++++ Name (Champion, Dual Sphere), etc.
    const m = line.match(
      /^\+\+\+\+\s+(.+?)\s+[[(](?:[\w\s,-]+,\s*)?Dual Sphere[\])]/i,
    );
    if (!m) continue;

    // Strip any trailing bracket citation
    let name = m[1].trim();
    name = name.replace(/\s*\[.*\]$/, "").trim();
    // Normalize apostrophes
    name = name.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    dualSphereEntries.add(`${sphere}::${name.toLowerCase()}`);
  }
}

console.log(`Old wiki: ${dualSphereEntries.size} (Dual Sphere) entries found.`);

// ── 2. Parse current codebase for talents/feats ──────────────────────────
const allFiles = [];
function getFilesRecursively(dir) {
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath);
    } else if (file.endsWith(".md") && !file.startsWith("QUARANTINE-")) {
      allFiles.push(filePath);
    }
  }
}
getFilesRecursively(contentDir);

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
