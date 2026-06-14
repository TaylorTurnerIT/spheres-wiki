#!/usr/bin/env node
// Post-build audit: detect headings with valid id attr in page body that have
// no corresponding data-toc-item entry in the sidebar TOC (V57).
// Run after `npm run build` — reads dist/ HTML files.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  console.log("dist/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

// Only check sphere pages (power/might/guile/champ/spheres/*/index.html)
function findSpherePages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSpherePages(fullPath));
    } else if (entry.name === "index.html") {
      // Check if parent path matches {system}/spheres/{sphere}/
      const parent = path.dirname(fullPath);
      const grandparent = path.dirname(parent);
      if (grandparent.endsWith("spheres") || parent.endsWith("spheres")) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const SPHERE_TYPES = new Set(["power", "might", "guile", "champ"]);
const SPHERE_PAGES = findSpherePages(distDir).filter(f => {
  // filter to sphere pages: matches {system}/spheres/{sphere}/index.html
  const parts = f.split(path.sep);
  const idx = parts.indexOf("spheres");
  if (idx === -1) return false;
  const system = parts[idx - 1];
  return SPHERE_TYPES.has(system);
});

// Feature blocks that should have TOC items matching their id
const TRACKED_CLASSES = [
  "talent-entry",
  "base-ability-block",
  "class-feature-block",
  "archetype-feature-block",
  "class-traits-section",
  "article-section",
  "equipment-section",
];

let totalOrphans = 0;

for (const pagePath of SPHERE_PAGES) {
  const html = fs.readFileSync(pagePath, "utf8");
  const relPath = path.relative(distDir, pagePath);

  // Extract all data-toc-item values from sidebar
  const tocItems = new Set();
  const tocRegex = /data-toc-item="([^"]+)"/g;
  let tocMatch;
  while ((tocMatch = tocRegex.exec(html)) !== null) {
    tocItems.add(tocMatch[1]);
  }

  // Find feature blocks with id attributes that should be in TOC
  for (const cls of TRACKED_CLASSES) {
    const blockRegex = new RegExp(
      `class="[^"]*\\b${cls}\\b[^"]*"[^>]*\\bid="([^"]+)"`,
      "g"
    );
    let blockMatch;
    while ((blockMatch = blockRegex.exec(html)) !== null) {
      const id = blockMatch[1];
      if (!tocItems.has(id)) {
        console.warn(`TOC-orphan: [${cls}] #${id} in ${relPath}`);
        totalOrphans++;
      }
    }
  }
}

if (totalOrphans > 0) {
  console.warn(`\n${totalOrphans} TOC-orphaned item(s) found.`);
} else {
  console.log("TOC audit passed — no orphaned items.");
}
process.exit(0);
