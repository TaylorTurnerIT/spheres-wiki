#!/usr/bin/env node
// Post-build audit: detect headings with valid id attr in page body that have
// no corresponding data-toc-item entry in the sidebar TOC (V57).
// Run after `npm run build` — reads dist/ HTML files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEMS } from "../src/config/site.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  console.log("dist/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

// The current file-based route is /{system}/{sphere}/, so generated output is
// /{system}/{sphere}/index.html (not /{system}/spheres/{sphere}/index.html).
const SPHERE_TYPES = new Set(Object.keys(SYSTEMS));

function isIndexFile(entry) {
  return entry.isFile() && entry.name === "index.html";
}

function hasSphereRouteShape(fullPath) {
  const parts = path.relative(distDir, fullPath).split(path.sep);
  return (
    parts.length === 3 &&
    SPHERE_TYPES.has(parts[0]) &&
    parts[2] === "index.html"
  );
}

function isSphereIndex(entry, fullPath) {
  return isIndexFile(entry) && hasSphereRouteShape(fullPath);
}

// Keep this check tied to the actual route shape so an empty page selection
// cannot produce a false-green audit.
function findSpherePages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSpherePages(fullPath));
      continue;
    }
    if (isSphereIndex(entry, fullPath)) results.push(fullPath);
  }
  return results;
}

const SPHERE_PAGES = findSpherePages(distDir);

// Feature blocks that should have TOC items matching their id
const TRACKED_CLASSES = [
  "talent-entry",
  "entry-card-block",
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
      "g",
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

if (SPHERE_PAGES.length === 0) {
  console.error(
    "TOC audit failed — no generated sphere pages matched the route shape.",
  );
  process.exit(1);
}

if (totalOrphans > 0) {
  console.error(`\n${totalOrphans} TOC-orphaned item(s) found.`);
  process.exit(1);
} else {
  console.log(
    `TOC audit passed across ${SPHERE_PAGES.length} sphere pages — no orphaned items.`,
  );
}
