#!/usr/bin/env node
/**
 * purge-class-content.mjs
 *
 * Identifies (and optionally deletes) all class-family content files.
 * Type is PATH-derived (per inferFromPath.ts), not frontmatter — any .md file
 * under a `classes/` directory segment is a purge target.
 *
 * Flags:
 *   (default / --dry-run)  Scan only — print targets + skipped, write /tmp/class-purge-targets.txt
 *   --delete               Actually delete the identified files and remove emptied class dirs
 *
 * Used by T-001 (scan) and T-002 (delete).
 */

import {
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = resolve(__dirname, "../src/content");
const TARGETS_FILE = "/tmp/class-purge-targets.txt";

const args = process.argv.slice(2);
const DELETE_MODE = args.includes("--delete");

// ── Walk src/content/**/*.md ──────────────────────────────────────────────────

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, results);
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

// ── Classify by path ──────────────────────────────────────────────────────────
// Mirrors inferFromPath.ts: any file under a `classes/` path segment is
// class-family content (class | class-feature | class-trait | archetype |
// archetype-feature). This is path-only — no frontmatter inspection required.

function isClassFamily(absolutePath) {
  const rel = absolutePath.slice(CONTENT_ROOT.length);
  const segments = rel.split(sep).filter(Boolean);
  return segments.includes("classes");
}

// ── Main ──────────────────────────────────────────────────────────────────────

const allFiles = walk(CONTENT_ROOT);
const targets = [];
const others = [];

for (const f of allFiles) {
  if (isClassFamily(f)) {
    targets.push(f);
  } else {
    others.push(f);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n=== Purge Scan Results ===`);
console.log(`Total .md files scanned: ${allFiles.length}`);
console.log(`Targets (class-family):  ${targets.length}`);
console.log(`Non-targets (untouched): ${others.length}`);

console.log(`\n--- Targets (first 20 shown) ---`);
for (const f of targets.slice(0, 20)) {
  console.log(`  ${f.replace(CONTENT_ROOT, "src/content")}`);
}
if (targets.length > 20) console.log(`  ... and ${targets.length - 20} more`);

// Write target list for T-002
writeFileSync(TARGETS_FILE, targets.join("\n") + (targets.length ? "\n" : ""));
console.log(
  `\nTarget list written to ${TARGETS_FILE} (${targets.length} entries)`,
);

if (!DELETE_MODE) {
  console.log(
    `\nMode: DRY RUN — no files deleted. Re-run with --delete to execute.`,
  );
  process.exit(0);
}

// ── Delete mode (T-002) ───────────────────────────────────────────────────────

console.log(`\nMode: DELETE — removing ${targets.length} files...`);
let deleted = 0;
for (const f of targets) {
  unlinkSync(f);
  deleted++;
}
console.log(`Deleted: ${deleted} files.`);

// Remove emptied directories under classes/
function removeEmptyDirs(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e);
    try {
      if (statSync(full).isDirectory()) removeEmptyDirs(full);
    } catch {
      /* already gone */
    }
  }
  try {
    const remaining = readdirSync(dir);
    if (remaining.length === 0) {
      rmdirSync(dir);
      console.log(`  RMDIR  ${dir.replace(CONTENT_ROOT, "src/content")}`);
    }
  } catch {
    /* dir not empty or already gone */
  }
}

function sweepClassDirs(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      if (!statSync(full).isDirectory()) continue;
      if (entry === "classes") {
        removeEmptyDirs(full);
      } else {
        sweepClassDirs(full);
      }
    } catch {
      /* skip */
    }
  }
}

sweepClassDirs(CONTENT_ROOT);
console.log(`Empty class dir sweep complete.`);
