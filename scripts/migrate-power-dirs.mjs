#!/usr/bin/env node
/**
 * Moves flat legacy dirs under [book]/power/ (or the correct system).
 *
 * Before this script, power entries lived at [book]/feats/, [book]/spheres/, etc.
 * After, every system has a uniform [book]/[system]/[type]/ path.
 *
 * Uses `git mv` so history is preserved.
 * Dry-run by default — pass --execute to actually move files.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as parseYaml } from "/home/taylor/Projects/spheres-wiki/node_modules/js-yaml/index.js";

const DRY_RUN = !process.argv.includes("--execute");
const CONTENT_ROOT = new URL("../src/content", import.meta.url).pathname;
const REPO_ROOT = new URL("..", import.meta.url).pathname;

const KNOWN_SYSTEMS = new Set(["power", "might", "guile", "champions"]);
const CONTENT_TYPE_DIRS = new Set([
  "spheres",
  "feats",
  "class-traits",
  "talents",
  "articles",
  "classes",
  "class-features",
  "archetype-features",
  "tags",
]);

if (DRY_RUN) {
  console.log("DRY RUN — pass --execute to apply changes\n");
}

/** Read the `system` field from the first .md file found in a dir (recursive). */
function detectSystemFromFrontmatter(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const raw = readFileSync(join(dir, entry.name), "utf8");
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        try {
          const fm = parseYaml(match[1]);
          if (fm?.system) return fm.system;
        } catch {}
      }
    }
    if (entry.isDirectory()) {
      const found = detectSystemFromFrontmatter(join(dir, entry.name));
      if (found) return found;
    }
  }
  return null;
}

/** Return the single existing system subdir in a book, or null. */
function detectSystemFromSiblings(bookDir) {
  const systemDirs = readdirSync(bookDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && KNOWN_SYSTEMS.has(e.name))
    .map((e) => e.name);
  return systemDirs.length === 1 ? systemDirs[0] : null;
}

/**
 * When a book has no system subdirs (all flat), sample OTHER flat type dirs
 * in the same book to infer system from their frontmatter.
 */
function detectSystemFromPeerDirs(bookDir, skipDirName) {
  for (const entry of readdirSync(bookDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (KNOWN_SYSTEMS.has(entry.name)) continue;
    if (!CONTENT_TYPE_DIRS.has(entry.name)) continue;
    if (entry.name === skipDirName) continue;
    const found = detectSystemFromFrontmatter(join(bookDir, entry.name));
    if (found) return found;
  }
  return null;
}

let moves = 0;
let warnings = 0;

for (const bookEntry of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
  if (!bookEntry.isDirectory()) continue;
  if (bookEntry.name.startsWith("__")) continue; // __built-in__

  const bookDir = join(CONTENT_ROOT, bookEntry.name);

  for (const dirEntry of readdirSync(bookDir, { withFileTypes: true })) {
    if (!dirEntry.isDirectory()) continue;
    if (KNOWN_SYSTEMS.has(dirEntry.name)) continue; // already a system dir
    if (!CONTENT_TYPE_DIRS.has(dirEntry.name)) continue; // _book.yaml, etc.

    const srcDir = join(bookDir, dirEntry.name);

    // Determine target system
    const system =
      detectSystemFromFrontmatter(srcDir) ??
      detectSystemFromSiblings(bookDir) ??
      detectSystemFromPeerDirs(bookDir, dirEntry.name);

    if (!system) {
      console.warn(
        `WARN  cannot determine system for ${bookEntry.name}/${dirEntry.name} — skipping`,
      );
      warnings++;
      continue;
    }

    const destParent = join(bookDir, system);
    const destDir = join(destParent, dirEntry.name);
    const rel = (p) => p.replace(`${CONTENT_ROOT}/`, "src/content/");

    if (existsSync(destDir)) {
      // Dest dir already exists — merge files individually (e.g. might/tags/ already present)
      const srcFiles = readdirSync(srcDir).filter((f) => f.endsWith(".md"));
      for (const file of srcFiles) {
        const srcFile = join(srcDir, file);
        const destFile = join(destDir, file);
        if (existsSync(destFile)) {
          console.warn(
            `WARN  dest file already exists, skipping: ${rel(destFile)}`,
          );
          warnings++;
          continue;
        }
        console.log(`MERGE ${rel(srcFile)}  →  ${rel(destFile)}`);
        if (!DRY_RUN) {
          execSync(`git mv "${srcFile}" "${destFile}"`, { cwd: REPO_ROOT });
        }
        moves++;
      }
      // After merging, remove empty src dir
      if (!DRY_RUN) {
        const remaining = readdirSync(srcDir);
        if (remaining.length === 0) {
          execSync(`rmdir "${srcDir}"`);
        }
      }
      continue;
    }

    console.log(`MOVE  ${rel(srcDir)}  →  ${rel(destDir)}`);

    if (!DRY_RUN) {
      mkdirSync(destParent, { recursive: true });
      execSync(`git mv "${srcDir}" "${destDir}"`, { cwd: REPO_ROOT });
    }
    moves++;
  }
}

console.log(
  `\n${moves} move(s) ${DRY_RUN ? "planned" : "executed"}, ${warnings} warning(s)`,
);
if (DRY_RUN && moves > 0) {
  console.log("Run with --execute to apply.");
}
