#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { FEAT_CATEGORY_SOURCE_MANIFEST } from "./lib/feat-category-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");

const DESCRIPTION_SOURCES = Object.fromEntries(
  FEAT_CATEGORY_SOURCE_MANIFEST.map((spec) => {
    const desc = `${spec.sourceFile}${spec.tab ? `#tab:${spec.tab}` : ""}${spec.sectionHeading ? `#section:${spec.sectionHeading.replace(/^\++\s+/, "")}` : ""}`;
    return [spec.tagId, desc];
  }),
);

const EXPECTED_SYSTEM_SCOPE = Object.fromEntries(
  FEAT_CATEGORY_SOURCE_MANIFEST.map((source) => [
    source.tagId,
    source.tagSystem,
  ]),
);

function markdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(entryPath));
    else if (entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? parseYaml(match[1]) : undefined;
}

function readBody(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match?.[1] ?? "";
}

function hasPlaceholderDescription(value) {
  return (
    typeof value !== "string" ||
    value.trim() === "" ||
    /\b(TBD|PLACEHOLDER)\b/i.test(value)
  );
}

function hasSectionBleed(body) {
  return body
    .split(/\r?\n/)
    .some((line) => /^\s*(?:\+{2,}|#{2,})\s+\S/.test(line));
}

let hasError = false;
let checked = 0;

for (const filePath of markdownFiles(contentDir)) {
  const frontmatter = readFrontmatter(filePath);
  if (frontmatter?.featCategory !== true) continue;
  checked++;
  const relativePath = path.relative(contentDir, filePath);

  if (hasPlaceholderDescription(frontmatter.description)) {
    const source = DESCRIPTION_SOURCES[frontmatter.id] ?? "unmapped source";
    console.error(
      `Feat-category tag "${frontmatter.id}" in ${relativePath} has a missing or placeholder description (source: ${source}).`,
    );
    hasError = true;
  }

  const expectedSystem = EXPECTED_SYSTEM_SCOPE[frontmatter.id];
  if (frontmatter.system !== expectedSystem) {
    const expected = expectedSystem ?? "(none)";
    const actual = frontmatter.system ?? "(none)";
    console.error(
      `Feat-category tag "${frontmatter.id}" in ${relativePath} has system "${actual}", expected "${expected}".`,
    );
    hasError = true;
  }

  if (hasSectionBleed(readBody(filePath))) {
    console.error(
      `Feat-category tag "${frontmatter.id}" in ${relativePath} has section headings in its rules body. This usually means category extraction bled into feat entries or the next category.`,
    );
    hasError = true;
  }
}

if (hasError) {
  console.error("\nFeat-category tag validation FAILED.");
  process.exit(1);
}

console.log(
  `Feat-category tag validation passed. ${checked} category tags checked.`,
);
