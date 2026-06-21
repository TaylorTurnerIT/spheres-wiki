#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");

const DESCRIPTION_SOURCES = {
  admixture: "admixture-feats.txt",
  anathema: "anathema-feats.txt",
  champion: "champion-feats.txt",
  chance: "chance-feats.txt",
  channeling: "channeling-feats.txt",
  combat: "combat-feats.txt",
  companion: "companion-feats.txt",
  counterspell: "counterspell-feats.txt",
  drawback: "drawback-feats.txt",
  extra: "extra-feats.txt",
  "item-creation": "item-creation-feats.txt",
  metamagic: "metamagic-feats.txt",
  mythic: "mythic-spheres-3.txt",
  necrosis: "necrosis-feats.txt",
  operative: "operative-feats.txt",
  practitioner: "practitioner-feats.txt",
  protokinesis: "protokinesis-feats.txt",
  proxy: "proxy-feats.txt",
  racial: "racial-feats.txt",
  ritual: "ritual-feats.txt",
  ante: "card-and-deck-feats.txt#ante-feats",
  deck: "card-and-deck-feats.txt#deck-feats",
  saga: "card-and-deck-feats.txt#saga-feats",
  squadron: "squadron-feats.txt",
  surreal: "surreal-feats.txt",
  teamwork: "teamwork-feats.txt",
  "wild-magic": "wild-magic-feats.txt",
};

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

function hasPlaceholderDescription(value) {
  return typeof value !== "string" || value.trim() === "" || /\b(TBD|PLACEHOLDER)\b/i.test(value);
}

let hasError = false;
let checked = 0;

for (const filePath of markdownFiles(contentDir)) {
  const frontmatter = readFrontmatter(filePath);
  if (frontmatter?.featCategory !== true) continue;
  checked++;
  if (!hasPlaceholderDescription(frontmatter.description)) continue;

  const source = DESCRIPTION_SOURCES[frontmatter.id] ?? "unmapped source";
  const relativePath = path.relative(contentDir, filePath);
  console.error(
    `Feat-category tag "${frontmatter.id}" in ${relativePath} has a missing or placeholder description (source: ${source}).`,
  );
  hasError = true;
}

if (hasError) {
  console.error("\nFeat-category tag validation FAILED.");
  process.exit(1);
}

console.log(`Feat-category tag validation passed. ${checked} category tags checked.`);
