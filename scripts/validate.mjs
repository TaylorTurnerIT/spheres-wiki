#!/usr/bin/env node
// Single-pass validation: v2 consistency (id matches filename) + tag integrity.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");

const BUILTIN_TAGS = new Set(["ex", "su", "sp", "advanced", "3pp", "sphere"]);

function isSyntheticTag(tag) {
  return BUILTIN_TAGS.has(tag) || tag.endsWith("-sphere");
}

function getFilesRecursively(dir) {
  const results = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith(".md")) {
      results.push(filePath);
    }
  }
  return results;
}

if (!fs.existsSync(contentDir)) {
  console.log("Content directory does not exist.");
  process.exit(0);
}

const allFiles = getFilesRecursively(contentDir);
const definedTags = new Set();
const referencedTags = new Map(); // tagId -> [filePaths]
const idMap = new Map(); // id -> [filePaths]
let hasError = false;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    console.error(`Error: No frontmatter found in ${filePath}`);
    hasError = true;
    continue;
  }

  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch (e) {
    console.error(`Error parsing YAML in ${filePath}: ${e.message}`);
    hasError = true;
    continue;
  }

  if (!frontmatter) continue;

  // v2 check: frontmatter id must match filename
  const fileSlug = path.basename(filePath, ".md");
  if (frontmatter.id) {
    if (frontmatter.id !== fileSlug) {
      console.error(
        `V2 Violation: ${filePath} has frontmatter ID "${frontmatter.id}" but filename is "${fileSlug}.md"`,
      );
      hasError = true;
    }

    // Global ID uniqueness check
    if (!idMap.has(frontmatter.id)) {
      idMap.set(frontmatter.id, []);
    }
    idMap.get(frontmatter.id).push(filePath);
  }

  // tag checks
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

for (const [id, files] of idMap.entries()) {
  if (files.length > 1) {
    console.error(
      `Error: Duplicate ID "${id}" found in ${files.length} files:`,
    );
    for (const f of files) {
      console.error(`  ${path.relative(contentDir, f)}`);
    }
    hasError = true;
  }
}

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
  console.error("\nValidation FAILED.");
  process.exit(1);
} else {
  console.log(
    `Validation passed. ${allFiles.length} files checked, ${definedTags.size} tags defined, ${referencedTags.size} unique tags referenced.`,
  );
  process.exit(0);
}
