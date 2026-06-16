#!/usr/bin/env node
/**
 * Audits every .md file under src/content for conflicts between
 * path-inferred structural fields and frontmatter-declared values.
 *
 * Exit 0 = clean. Exit 1 = conflicts found.
 * Run: node scripts/check-dir-truth.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { load as parseYaml } from "/home/taylor/Projects/spheres-wiki/node_modules/js-yaml/index.js";

const CONTENT_ROOT = new URL("../src/content", import.meta.url).pathname;
const KNOWN_SYSTEMS = new Set(["power", "might", "guile", "champions"]);

// ── Path inference (mirrors inferFromPath.ts logic) ────────────────────────

/**
 * @param {string} relPath  Path relative to the book dir, e.g. "power/feats/foo.md"
 * @param {string} book     Book slug (first segment of content path)
 * @returns {Record<string, string>}  Inferred fields
 */
function inferFromPath(relPath, book) {
  let parts = relPath.replace(/\.mdx?$/, "").split("/");
  const inferred = { sourceBook: book };

  // Detect system prefix
  if (KNOWN_SYSTEMS.has(parts[0])) {
    inferred.system = parts[0];
    parts = parts.slice(1);
  }

  const [s0, s1, _s2, _s3] = parts;
  const last = parts[parts.length - 1];
  const prev = parts.length > 1 ? parts[parts.length - 2] : "";
  const prev2 = parts.length > 2 ? parts[parts.length - 3] : "";

  // id = filename stem
  inferred.id = last;

  // 2-segment: [type]/[id]
  if (parts.length === 2) {
    const TYPE_MAP = {
      talents: "talent",
      feats: "feat",
      spheres: "sphere",
      classes: "class",
      archetypes: "archetype",
      "archetype-features": "archetype-feature",
      articles: "article",
      tags: "tag",
    };
    if (TYPE_MAP[s0]) {
      inferred.type = TYPE_MAP[s0];
      return inferred;
    }
  }

  // 3-segment legacy: [container]/[sub]/[id]
  if (parts.length === 3) {
    if (s0 === "class-features")
      return { ...inferred, type: "class-feature", className: s1 };
    if (s0 === "class-traits")
      return { ...inferred, type: "class-trait", className: s1 };
    if (s0 === "archetype-features")
      return { ...inferred, type: "archetype-feature", archetypeId: s1 };
  }

  // Flexible nesting — match inferFromPath.ts rules

  if (parts.length >= 4) {
    // archetype-features: .../archetypes/[aid]/archetype-features/[id]
    if (
      prev === "archetype-features" ||
      (prev === "features" &&
        parts[parts.length - 4]?.toLowerCase() === "archetypes")
    ) {
      return {
        ...inferred,
        type: "archetype-feature",
        archetypeId: parts[parts.length - 3],
      };
    }
    // class-traits: .../[cid]/class-features/[fid]/class-traits/[id]
    if (
      prev === "class-traits" ||
      (prev === "traits" &&
        parts[parts.length - 4]?.toLowerCase() === "features")
    ) {
      const fid = parts[parts.length - 3];
      const cid = parts[parts.length - 5] || parts[1];
      return {
        ...inferred,
        type: "class-trait",
        className: cid,
        featureId: fid,
      };
    }
  }

  if (parts.length >= 3) {
    // class-features: .../[cid]/class-features/[id]
    if (prev === "class-features" || prev === "features") {
      return {
        ...inferred,
        type: "class-feature",
        className: parts[parts.length - 3],
      };
    }
    // archetypes: .../[cid]/archetypes/[aid]/[aid]
    if (
      (prev2 === "archetypes" || prev2 === "Archetypes") &&
      (last === prev ||
        last === "index" ||
        last.endsWith(`-${prev}`) ||
        last.includes(prev))
    ) {
      return {
        ...inferred,
        type: "archetype",
        className: parts[parts.length - 4],
        id: prev,
      };
    }
    // talents: .../spheres/[sphere]/talents/[id]
    if (prev === "talents") {
      return { ...inferred, type: "talent", sphere: parts[parts.length - 3] };
    }
    // feats under sphere: .../spheres/[sphere]/feats/[id]
    if (prev === "feats") {
      return { ...inferred, type: "feat", sphere: parts[parts.length - 3] };
    }
    // sphere definition: .../spheres/[sphere]/[sphere] or index
    if (
      parts[parts.length - 3] === "spheres" &&
      (last === prev || last === "index")
    ) {
      return { ...inferred, type: "sphere", id: prev };
    }
  }

  if (s0?.toLowerCase() === "classes") {
    if (last === prev || last === "index") {
      return { ...inferred, type: "class", id: prev };
    }
  }

  return inferred;
}

// ── Parse frontmatter ───────────────────────────────────────────────────────

function parseFrontmatter(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) ?? {};
  } catch {
    return null;
  }
}

// ── Walk content ────────────────────────────────────────────────────────────

const INFERABLE_FIELDS = [
  "type",
  "id",
  "system",
  "sourceBook",
  "sphere",
  "className",
  "featureId",
  "archetypeId",
];

/** @type {Array<{file: string, field: string, inferred: string, declared: string}>} */
const conflicts = [];
let fileCount = 0;
let warnCount = 0;

function walkBook(bookDir, bookSlug) {
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
        fileCount++;
        const relPath = relative(bookDir, fullPath);
        const fm = parseFrontmatter(fullPath);
        if (fm === null) {
          console.warn(
            `WARN  missing/invalid frontmatter: src/content/${bookSlug}/${relPath}`,
          );
          warnCount++;
          return;
        }
        const inferred = inferFromPath(relPath, bookSlug);
        for (const field of INFERABLE_FIELDS) {
          const inferredVal = inferred[field];
          const declaredVal = fm[field];
          if (inferredVal !== undefined && declaredVal !== undefined) {
            const iv = String(inferredVal);
            const dv = String(declaredVal);
            if (iv !== dv) {
              conflicts.push({
                file: `src/content/${bookSlug}/${relPath}`,
                field,
                inferred: iv,
                declared: dv,
              });
            }
          }
        }
      }
    }
  }
  walk(bookDir);
}

for (const entry of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (entry.name.startsWith("__")) continue; // __built-in__
  walkBook(join(CONTENT_ROOT, entry.name), entry.name);
}

// ── Report ──────────────────────────────────────────────────────────────────

if (conflicts.length === 0) {
  console.log(
    `✓ ${fileCount} files checked, 0 conflicts${warnCount ? `, ${warnCount} warnings` : ""}`,
  );
  process.exit(0);
}

// Group by field for summary
const byField = {};
for (const c of conflicts) {
  (byField[c.field] ??= []).push(c);
}

console.log(
  `CONFLICTS FOUND — ${conflicts.length} total across ${Object.keys(byField).length} field(s)\n`,
);

for (const [field, list] of Object.entries(byField)) {
  console.log(`  ${field}: ${list.length} conflict(s)`);
  for (const c of list) {
    console.log(
      `    CONFLICT  field=${c.field}  inferred=${c.inferred}  declared=${c.declared}  ${c.file}`,
    );
  }
}

if (warnCount)
  console.log(
    `\n${warnCount} warning(s) — files with missing/invalid frontmatter`,
  );

process.exit(1);
