#!/usr/bin/env node
/**
 * Parses shifter-class.md (Wikidot source) and generates class-trait markdown files
 * for all Bestial Trait entries.
 *
 * Usage:
 *   node scripts/generate-bestial-traits.mjs            # dry-run (print diffs only)
 *   node scripts/generate-bestial-traits.mjs --write    # write new files, skip existing
 *   node scripts/generate-bestial-traits.mjs --force    # write all (overwrite existing)
 *   node scripts/generate-bestial-traits.mjs --validate # compare existing files vs parsed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { normalizeQuotes, cleanBody } from "./lib/wikidot-markup.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(
  ROOT,
  "src/content/ultimate-spheres-of-power/class-traits/shifter",
);

const MODE = process.argv[2] ?? "--dry-run";

// ─── Source mappings ─────────────────────────────────────────────────────────

const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "nor",
  "but",
  "yet",
  "so",
  "with",
  "by",
  "from",
  "into",
  "up",
  "as",
]);

const SOURCE_MAP = {
  Apoc: "Spheres Apocrypha: Apex Shifter",
  Origin: "Spheres of Origin",
  "Alienist HB": "The Alienist's Handbook",
  BTH: "Beast Tamer's Handbook",
  CotS: "Champions of the Spheres",
  DRS: "Drop Dead Studios",
};

// ─── Parse the raw Wikidot source ────────────────────────────────────────────

const rawText = readFileSync(join(ROOT, "shifter-class.md"), "utf-8");

// Extract the Bestial Trait body: starts at first ++++ heading after "++++ Accommodating Form",
// ends at "++ Endurance" (the next ++ section).
const sectionStart = rawText.indexOf("\n++++ Accommodating Form");
const sectionEnd = rawText.indexOf("\n++ Endurance (Ex)");
if (sectionStart === -1 || sectionEnd === -1) {
  console.error(
    "Could not locate Bestial Trait section boundaries in shifter-class.md",
  );
  process.exit(1);
}
const section = rawText.slice(sectionStart, sectionEnd);

// Split on ++++ lines — each is a new trait
const rawChunks = section.split(/\n(?=\+\+\+\+ )/);

const traits = rawChunks
  .map((chunk) => chunk.trim())
  .filter((c) => c.startsWith("++++"))
  .map(parseChunk)
  .filter(Boolean);

console.log(`Parsed ${traits.length} bestial traits from shifter-class.md\n`);

// ─── Validate or write ───────────────────────────────────────────────────────

let newCount = 0,
  skipCount = 0,
  diffCount = 0;

for (const trait of traits) {
  const filename = `shifter-${kebab(trait.name)}.md`;
  const filepath = join(OUT_DIR, filename);
  const content = renderFile(trait);

  if (MODE === "--validate") {
    if (existsSync(filepath)) {
      const existing = readFileSync(filepath, "utf-8");
      if (existing.trim() !== content.trim()) {
        console.log(`DIFF  ${filename}`);
        showDiff(existing, content);
        diffCount++;
      } else {
        console.log(`OK    ${filename}`);
      }
    } else {
      console.log(`MISS  ${filename}  (not yet created)`);
    }
    continue;
  }

  if (MODE === "--dry-run") {
    console.log(`WOULD WRITE  ${filename}`);
    console.log(content);
    console.log("---");
    continue;
  }

  if (existsSync(filepath) && MODE !== "--force") {
    skipCount++;
    continue;
  }

  writeFileSync(filepath, content, "utf-8");
  console.log(`WROTE  ${filename}`);
  newCount++;
}

if (MODE === "--validate") {
  console.log(`\n${diffCount} diff(s) found.`);
} else if (MODE !== "--dry-run") {
  console.log(
    `\nWrote ${newCount} new file(s), skipped ${skipCount} existing.`,
  );
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

function parseChunk(chunk) {
  const lines = chunk.split("\n");
  const heading = lines[0].replace(/^\+\+\+\+\s+/, "").trim();
  let bodyLines = lines.slice(1);

  // --- Extract source bracket e.g. "[Origin]" or "[Alienist HB]" ---
  const sourceMatch = heading.match(/\[([^\]]+)\]\s*$/);
  const sourceKey = sourceMatch?.[1] ?? null;
  let head = sourceMatch ? heading.slice(0, sourceMatch.index).trim() : heading;

  // --- Extract (Ex), (Su), (Sp) type marker ---
  const typeMatch = head.match(/\((Ex|Su|Sp)\)/i);
  const abilityType = typeMatch ? typeMatch[1].toLowerCase() : null;
  head = head.replace(/\((Ex|Su|Sp)\)/i, "").trim();

  // --- Extract inline (requires ...) ---
  // May appear multiple times: "(requires foo, bar) (requires baz)" — unlikely but handle
  let requires = null;
  const reqMatch = head.match(/\(requires ([^)]+)\)/i);
  if (reqMatch) {
    requires = titleCase(reqMatch[1].trim());
    head = head.replace(/\(requires [^)]+\)/i, "").trim();
  }

  // head is now the clean name
  const name = normalizeQuotes(head.replace(/\s+/g, " ").trim());
  if (!name) return null;

  // --- Clean up body lines ---
  // Strip Wikidot ^^...^^ superscript source lines
  bodyLines = bodyLines.filter((l) => !l.trim().startsWith("^^"));

  // Extract **Requires:** lines from body (Shifting Style style)
  const reqLineIdx = bodyLines.findIndex((l) =>
    /^\*\*Requires:\*\*/i.test(l.trim()),
  );
  if (reqLineIdx !== -1 && !requires) {
    const reqLine = bodyLines[reqLineIdx].trim();
    requires = reqLine.replace(/^\*\*Requires:\*\*\s*/i, "").trim();
    bodyLines.splice(reqLineIdx, 1);
  }

  // Strip leading/trailing blank lines from body
  while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim())
    bodyLines.pop();

  const body = cleanBody(bodyLines.join("\n"));

  return { name, abilityType, requires, sourceKey, body };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderFile(trait) {
  const id = `shifter-${kebab(trait.name)}`;
  const tags = trait.abilityType ? `[${trait.abilityType}]` : "[]";
  // Source is now handled by the template via frontmatter sourceBook metadata

  const fm = [
    "---",
    `id: ${id}`,
    `name: "${trait.name}"`,
    `type: class-trait`,
    `system: power`,
    `tags: ${tags}`,
    `className: shifter`,
    `featureId: shifter-bestial-trait`,
    trait.requires ? `requires: "${trait.requires}"` : null,
    "---",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return `${fm}\n\n${trait.body}\n`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kebab(name) {
  return name
    .toLowerCase()
    .replace(/,/g, "") // "Adaptation, Improved" → "adaptation improved"
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function titleCase(str) {
  return str
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      return i === 0 || !LOWERCASE_WORDS.has(lower)
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : lower;
    })
    .join(" ");
}

function showDiff(existing, generated) {
  const eLines = existing.split("\n");
  const gLines = generated.split("\n");
  const maxLen = Math.max(eLines.length, gLines.length);
  let shown = 0;
  for (let i = 0; i < maxLen && shown < 20; i++) {
    const e = eLines[i] ?? "(none)";
    const g = gLines[i] ?? "(none)";
    if (e !== g) {
      console.log(`  line ${i + 1}:`);
      console.log(`    EXISTING:  ${e}`);
      console.log(`    GENERATED: ${g}`);
      shown++;
    }
  }
  if (shown === 0) console.log("  (whitespace difference only)");
  console.log("");
}
