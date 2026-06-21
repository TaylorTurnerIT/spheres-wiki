#!/usr/bin/env node
// Validates that every tag ID referenced in entry frontmatter has a corresponding
// type:tag definition file. Exits 1 if any undefined tags are found.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, "../src/content");

// Built-in synthetic tags from resolveEntries.ts — no definition file required.
const BUILTIN_TAGS = new Set(["ex", "su", "sp", "advanced", "3pp", "sphere"]);

if (!fs.existsSync(contentDir)) {
  console.log("Content directory does not exist.");
  process.exit(0);
}

const allFiles = getMarkdownFilesRecursively(contentDir);

// Collect all defined tag IDs.
const definedTags = new Set();
// Collect all referenced tags: tagId -> [filePaths]
const referencedTags = new Map();

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch {
    continue;
  }

  if (!frontmatter) continue;

  if (frontmatter.type === "tag") {
    definedTags.add(frontmatter.id);
    continue;
  }

  const tags = frontmatter.tags;
  if (!Array.isArray(tags)) continue;

  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    if (!referencedTags.has(tag)) referencedTags.set(tag, []);
    referencedTags.get(tag).push(filePath);
  }
}

// Auto-generated sphere tags: {sphereId}-sphere — always defined at runtime.
// Detect them by suffix rather than enumerating all spheres.
function isSyntheticTag(tag) {
  return BUILTIN_TAGS.has(tag) || tag.endsWith("-sphere");
}

let hasError = false;

for (const [tag, files] of [...referencedTags.entries()].sort()) {
  if (definedTags.has(tag) || isSyntheticTag(tag)) continue;
  console.error(
    `Undefined tag "${tag}" referenced in ${files.length} file(s):`,
  );
  for (const f of files) {
    console.error(`  ${path.relative(contentDir, f)}`);
  }
  hasError = true;
}

if (hasError) {
  console.error(
    "\nTag validation FAILED. Create a type:tag definition file for each undefined tag.",
  );
  process.exit(1);
} else {
  console.log(
    `Tag validation passed. ${definedTags.size} tags defined, ${referencedTags.size} unique tags referenced.`,
  );
  process.exit(0);
}
