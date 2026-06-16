#!/usr/bin/env node
/**
 * Removes path-derivable fields from frontmatter of every .md file
 * under src/content (excluding __built-in__).
 *
 * Only strips a field when inferFromPath would provide that field for
 * the given file — so e.g. `sphere` is stripped from talents/feats
 * but kept on tag definitions (where it's genuine metadata).
 *
 * Dry-run by default — pass --execute to write files.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DRY_RUN = !process.argv.includes("--execute");
const CONTENT_ROOT = new URL("../src/content", import.meta.url).pathname;
const KNOWN_SYSTEMS = new Set(["power", "might", "guile", "champions"]);

if (DRY_RUN) console.log("DRY RUN — pass --execute to write changes\n");

// ── Inline path inference (mirrors inferFromPath.ts) ───────────────────────

function inferFromPath(relPath, book) {
  let parts = relPath.replace(/\.mdx?$/, "").split("/");
  const inferred = { sourceBook: book };

  if (KNOWN_SYSTEMS.has(parts[0])) {
    inferred.system = parts[0];
    parts = parts.slice(1);
  }

  const last = parts[parts.length - 1];
  const prev = parts.length > 1 ? parts[parts.length - 2] : "";
  const prev2 = parts.length > 2 ? parts[parts.length - 3] : "";

  inferred.id = last;

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
    if (TYPE_MAP[parts[0]]) {
      inferred.type = TYPE_MAP[parts[0]];
      return inferred;
    }
  }

  if (parts.length === 3) {
    if (parts[0] === "class-features")
      return { ...inferred, type: "class-feature", className: parts[1] };
    if (parts[0] === "class-traits")
      return { ...inferred, type: "class-trait", className: parts[1] };
    if (parts[0] === "archetype-features")
      return { ...inferred, type: "archetype-feature", archetypeId: parts[1] };
  }

  if (parts.length >= 4) {
    if (
      prev === "archetype-features" ||
      (prev === "features" &&
        parts[parts.length - 4]?.toLowerCase() === "archetypes")
    )
      return {
        ...inferred,
        type: "archetype-feature",
        archetypeId: parts[parts.length - 3],
      };
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
    if (prev === "class-features" || prev === "features")
      return {
        ...inferred,
        type: "class-feature",
        className: parts[parts.length - 3],
      };
    if (
      (prev2 === "archetypes" || prev2 === "Archetypes") &&
      (last === prev ||
        last === "index" ||
        last.endsWith(`-${prev}`) ||
        last.includes(prev))
    )
      return {
        ...inferred,
        type: "archetype",
        className: parts[parts.length - 4],
        id: prev,
      };
    if (prev === "talents")
      return { ...inferred, type: "talent", sphere: parts[parts.length - 3] };
    if (prev === "feats")
      return { ...inferred, type: "feat", sphere: parts[parts.length - 3] };
    if (
      parts[parts.length - 3] === "spheres" &&
      (last === prev || last === "index")
    )
      return { ...inferred, type: "sphere", id: prev };
  }

  if (
    parts[0]?.toLowerCase() === "classes" &&
    (last === prev || last === "index")
  )
    return { ...inferred, type: "class", id: prev };

  return inferred;
}

// ── Frontmatter line-level field removal ───────────────────────────────────

/**
 * Remove top-level YAML keys from frontmatter block using line-level surgery.
 * Avoids full YAML round-trip to preserve formatting of kept fields.
 */
function stripFields(content, fieldsToStrip) {
  if (fieldsToStrip.length === 0) return content;

  // Match frontmatter block: "---\n...\n---"
  const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
  if (!fmMatch) return content;

  const header = fmMatch[1];
  const fmText = fmMatch[2];
  const closer = fmMatch[3];
  const body = content.slice(fmMatch[0].length);

  const pattern = new RegExp(
    `^(?:${fieldsToStrip.map((f) => f.replace(/[-]/g, "\\-")).join("|")}):[ \\t].*\\r?\\n?`,
    "gm",
  );
  const stripped = fmText.replace(pattern, "");

  return header + stripped + closer + body;
}

// ── Walk and strip ──────────────────────────────────────────────────────────

let modified = 0;
let unchanged = 0;

function walkBook(bookDir, bookSlug) {
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".md") && !entry.name.endsWith(".mdx")) continue;

      const relPath = relative(bookDir, fullPath);
      const inferred = inferFromPath(relPath, bookSlug);
      const fieldsToStrip = Object.keys(inferred);

      if (fieldsToStrip.length === 0) continue;

      const original = readFileSync(fullPath, "utf8");
      const stripped = stripFields(original, fieldsToStrip);

      if (stripped === original) {
        unchanged++;
        return;
      }

      const display = `src/content/${bookSlug}/${relPath}`;
      console.log(`STRIP  ${display}  [${fieldsToStrip.join(", ")}]`);
      if (!DRY_RUN) writeFileSync(fullPath, stripped, "utf8");
      modified++;
    }
  }
  walk(bookDir);
}

for (const entry of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith("__")) continue;
  walkBook(join(CONTENT_ROOT, entry.name), entry.name);
}

console.log(
  `\n${modified} file(s) ${DRY_RUN ? "would be modified" : "modified"}, ${unchanged} unchanged`,
);
if (DRY_RUN && modified > 0) console.log("Run with --execute to apply.");
