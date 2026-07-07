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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanBody, normalizeQuotes } from "./lib/wikidot-markup.mjs";

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
  const heading = parseTraitHeading(lines[0]);
  if (!heading.name) return null;

  const sourceStrippedLines = stripBodySourceLines(lines.slice(1));
  const { bodyLines, requires } = extractBodyRequires(
    sourceStrippedLines,
    heading.requires,
  );
  const body = cleanBody(trimBlankLines(bodyLines).join("\n"));

  return { ...heading, requires, body };
}

function parseTraitHeading(rawHeading) {
  const initialHead = rawHeading.replace(/^\+\+\+\+\s+/, "").trim();
  const { head: withoutSource, sourceKey } = stripHeadingSource(initialHead);
  const { head: withoutType, abilityType } = stripAbilityType(withoutSource);
  const { head, requires } = stripInlineRequires(withoutType);
  return {
    name: normalizeQuotes(head.replace(/\s+/g, " ").trim()),
    abilityType,
    requires,
    sourceKey,
  };
}

function stripHeadingSource(head) {
  const sourceMatch = head.match(/\[([^\]]+)\]\s*$/);
  return {
    sourceKey: sourceMatch?.[1] ?? null,
    head: sourceMatch ? head.slice(0, sourceMatch.index).trim() : head,
  };
}

function stripAbilityType(head) {
  const typeMatch = head.match(/\((Ex|Su|Sp)\)/i);
  return {
    abilityType: typeMatch ? typeMatch[1].toLowerCase() : null,
    head: head.replace(/\((Ex|Su|Sp)\)/i, "").trim(),
  };
}

function stripInlineRequires(head) {
  const reqMatch = head.match(/\(requires ([^)]+)\)/i);
  return {
    requires: reqMatch ? titleCase(reqMatch[1].trim()) : null,
    head: head.replace(/\(requires [^)]+\)/i, "").trim(),
  };
}

function stripBodySourceLines(lines) {
  return lines.filter((line) => !line.trim().startsWith("^^"));
}

function extractBodyRequires(bodyLines, currentRequires) {
  const reqLineIdx = bodyLines.findIndex((line) =>
    /^\*\*Requires:\*\*/i.test(line.trim()),
  );
  if (reqLineIdx === -1 || currentRequires) {
    return { bodyLines, requires: currentRequires };
  }
  const reqLine = bodyLines[reqLineIdx].trim();
  return {
    bodyLines: bodyLines.toSpliced(reqLineIdx, 1),
    requires: reqLine.replace(/^\*\*Requires:\*\*\s*/i, "").trim(),
  };
}

function trimBlankLines(lines) {
  const firstContent = lines.findIndex((line) => line.trim());
  if (firstContent === -1) return [];
  let lastContent = lines.length - 1;
  while (lastContent > firstContent && !lines[lastContent].trim())
    lastContent--;
  return lines.slice(firstContent, lastContent + 1);
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
  const diffs = differingLines(existing, generated).slice(0, 20);
  for (const diff of diffs) printDiffLine(diff);
  if (diffs.length === 0) console.log("  (whitespace difference only)");
  console.log("");
}

function differingLines(existing, generated) {
  const eLines = existing.split("\n");
  const gLines = generated.split("\n");
  return Array.from(
    { length: Math.max(eLines.length, gLines.length) },
    (_, index) => diffLine(eLines, gLines, index),
  ).filter(Boolean);
}

function diffLine(eLines, gLines, index) {
  const existing = eLines[index] ?? "(none)";
  const generated = gLines[index] ?? "(none)";
  return existing === generated
    ? null
    : { lineNumber: index + 1, existing, generated };
}

function printDiffLine(diff) {
  console.log(`  line ${diff.lineNumber}:`);
  console.log(`    EXISTING:  ${diff.existing}`);
  console.log(`    GENERATED: ${diff.generated}`);
}
