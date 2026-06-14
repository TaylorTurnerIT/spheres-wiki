#!/usr/bin/env node
// Single-pass validation: v2 consistency (id matches filename) + tag integrity.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");

const BUILTIN_TAGS = new Set([
  "extraordinary",
  "supernatural",
  "spell-like",
  "advanced",
  "3pp",
  "sphere",
]);

function isSyntheticTag(tag) {
  return BUILTIN_TAGS.has(tag) || tag.endsWith("-sphere");
}

function getFilesRecursively(dir) {
  const results = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith(".md") && !file.startsWith("QUARANTINE-")) {
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
    // V59: reject hex-prefix slugs (Wikidot color code artifacts like 993300).
    // Require at least one digit in the first 6 chars to avoid false positives on
    // a-f-only words like "deadcaller" or "beefsteak".
    const prefix6 = frontmatter.id.slice(0, 6);
    if (prefix6.length === 6 && /^[0-9a-fA-F]+$/.test(prefix6) && /[0-9]/.test(prefix6)) {
      console.error(
        `V59 Violation: ${filePath} has hex-prefixed ID "${frontmatter.id}"`,
      );
      hasError = true;
    }
    if (frontmatter.id !== fileSlug) {
      console.error(
        `V2 Violation: ${filePath} has frontmatter ID "${frontmatter.id}" but filename is "${fileSlug}.md"`,
      );
      hasError = true;
    }

    // Book+type-scoped ID uniqueness: same talent name in different books (e.g.
    // two systems both having a "mobility" talent) is valid — only flag same-book dupes.
    const relPath = path.relative(contentDir, filePath);
    const bookSlug = relPath.split(path.sep)[0];
    const typeIdKey = `${frontmatter.type}:${bookSlug}:${frontmatter.id}`;
    if (!idMap.has(typeIdKey)) {
      idMap.set(typeIdKey, []);
    }
    idMap.get(typeIdKey).push(filePath);
  }

  // tag checks
  if (frontmatter.type === "tag") {
    definedTags.add(frontmatter.id);
    continue;
  }

  // Body setext heading check: "text\n---" (no blank line before ---)
  // renders the preceding text as an <h2>. Intentional <hr> has blank lines
  // above and below. YAML frontmatter already stripped — this is body-only.
  const fmEnd = match.index + match[0].length;
  const bodyText = content.substring(fmEnd);
  const lines = bodyText.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const prev = lines[i - 1].trim();
    // A setext heading: previous line has text, this line is exactly --- or ===
    if (prev.length > 0 && (line === "---" || line === "===")) {
      const relPath = path.relative(contentDir, filePath);
      console.error(
        `Body setext: "${prev}" followed by "${line}" in ${relPath} — renders as accidental <h2>/<h1>. Insert blank line if <hr> intended.`,
      );
      hasError = true;
      break; // one violation per file is enough
    }
  }

  const tags = frontmatter.tags;
  if (!Array.isArray(tags)) continue;

  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    if (!referencedTags.has(tag)) referencedTags.set(tag, []);
    referencedTags.get(tag).push(filePath);
  }
}

for (const [key, files] of idMap.entries()) {
  if (files.length > 1) {
    const fileList = files.map((f) => path.relative(contentDir, f)).join(", ");
    console.error(
      `Error: Duplicate ID "${key}" found in ${files.length} files: [${fileList}]`,
    );
    hasError = true;
  }
}

for (const [tag, files] of [...referencedTags.entries()].sort()) {
  if (definedTags.has(tag) || isSyntheticTag(tag)) continue;
  const fileList = files.map((f) => path.relative(contentDir, f)).join(", ");
  console.error(
    `Undefined tag "${tag}" referenced in ${files.length} file(s): [${fileList}]`,
  );
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
