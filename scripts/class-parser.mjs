#!/usr/bin/env node
/**
 * Wikidot class page parser.
 * Converts class wiki pages to markdown content files with proper frontmatter.
 *
 * Usage:
 *   node scripts/class-parser.mjs <class> [--dry-run|--write|--force|--validate]
 */

import {
  readFileSync,
  existsSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { normalizeQuotes, cleanBody } from "./lib/wikidot-markup.mjs";
import { kebab, fmArray, writeEntries } from "./lib/render.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPO = "../wdotcrawl/spheresofpower-repo/pages";

// ─── Class Configurations ─────────────────────────────────────────────────────

const CLASS_CONFIGS = {
  // ── Power classes ──────────────────────────────────────────────────────
  armorist: {
    file: `${REPO}/armorist.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  elementalist: {
    file: `${REPO}/elementalist.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  eliciter: {
    file: `${REPO}/eliciter.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  "fey-adept": {
    file: `${REPO}/fey-adept.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  hedgewitch: {
    file: `${REPO}/hedgewitch.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  incanter: {
    file: `${REPO}/incanter.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  mageknight: {
    file: `${REPO}/mageknight.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  shifter: {
    file: `${REPO}/shifter.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  "soul-weaver": {
    file: `${REPO}/soul-weaver.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  symbiat: {
    file: `${REPO}/symbiat.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  thaumaturge: {
    file: `${REPO}/thaumaturge.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  wraith: {
    file: `${REPO}/wraith.txt`,
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
  },
  // ── Might classes ──────────────────────────────────────────────────────
  armiger: {
    file: `${REPO}/armiger.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  blacksmith: {
    file: `${REPO}/blacksmith.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  commander: {
    file: `${REPO}/commander.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  conduit: {
    file: `${REPO}/conduit.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  scholar: {
    file: `${REPO}/scholar.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  sentinel: {
    file: `${REPO}/sentinel.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  striker: {
    file: `${REPO}/striker.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
  technician: {
    file: `${REPO}/technician.txt`,
    system: "might",
    primaryBook: "spheres-of-might",
  },
};

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a class stat block and the class progression table from the source.
 * Returns { name, system, hitDie, alignment, startingWealth, skillRanks,
 *           classSkills, babProgression, fortSave, refSave, willSave, bodyText }
 */
function parseClassFile(text, config) {
  // Strip modules and = blocks (but NOT tabview — stat blocks live inside tabs)
  let clean = text
    .replace(/\[\[module[\s\S]*?\[\[\/module\]\]/gi, "")
    .replace(/\[\[=\]\][\s\S]*?\[\[\/=\]\]/gi, "")
    // Strip individual tabview/tab tag lines but KEEP content
    .replace(/^\[\[\/?tab(view)?\b[^\]]*\]\]/gim, "");

  // Extract title
  const titleMatch = clean.match(/^title:(.+)$/m);
  const name = titleMatch
    ? normalizeQuotes(titleMatch[1].trim())
    : config.className;

  // Parse stat block fields
  const fields = {};
  const fieldPatterns = {
    alignment: /\*\*Alignment:\*\*\s*(.+)$/m,
    hitDie: /\*\*Hit Die:\*\*\s*d(\d+)/im,
    startingWealth: /\*\*Starting Wealth:\*\*\s*(.+)$/m,
    skillRanks: /\*\*Skill Ranks Per Level:\*\*\s*(\d+)/i,
    classSkills: /\*\*Class Skills:\*\*\s*(.+)$/m,
  };

  for (const [key, re] of Object.entries(fieldPatterns)) {
    const m = clean.match(re);
    if (m) fields[key] = m[1].trim();
  }

  // Parse class skills into array — split on comma/and, then clean each
  let classSkills = [];
  if (fields.classSkills) {
    // First strip the leading "The X's class skills are..." prefix
    let skillsText = fields.classSkills
      .replace(/^[^.]*?(?:class skills are |class skills include )/i, "")
      .replace(/\.\s*In addition, if this is[^.]+\.[^.]*\.?/gi, "")
      .replace(/\.$/g, "");

    // Split on comma or " and " (but not "and" inside parentheticals)
    // First split on comma
    const parts = skillsText.split(/,\s*/);
    for (const part of parts) {
      // Handle "X and Y" at the end
      const andParts = part.split(/\s+and\s+/);
      for (const ap of andParts) {
        let cleaned = ap
          .replace(/\(Dex\)|\(Str\)|\(Con\)|\(Int\)|\(Wis\)|\(Cha\)/gi, "")
          .replace(/the .+'s class skills are/gi, "")
          .replace(/^and\s+/i, "")
          .trim();
        if (cleaned.length > 0 && cleaned.length < 50) {
          classSkills.push(cleaned);
        }
      }
    }
    // Deduplicate
    classSkills = [...new Set(classSkills)];
  }

  // Parse class table for BAB/save progressions
  const tableMatch = clean.match(
    /\|\|~ Level \|\|~ Base Attack Bonus \|\|~ Fort Save \|\|~ Ref Save \|\|~ Will Save/i,
  );
  let babProgression = null;
  let fortSave = null,
    refSave = null,
    willSave = null;

  if (tableMatch) {
    const tableStart = tableMatch.index;
    const tableText = clean.substring(tableStart, tableStart + 3000);
    const rows = tableText
      .split("\n")
      .filter((l) => l.startsWith("||") && /\d/.test(l));

    const babValues = [];
    const fortValues = [];
    const refValues = [];
    const willValues = [];

    for (const row of rows) {
      const cells = row.split("||").filter((c) => c.trim());
      if (cells.length >= 5) {
        const bab = parseInt(cells[1]?.replace(/[^+\-\d]/g, "")) || 0;
        const fort = parseInt(cells[2]?.replace(/[^+\-\d]/g, "")) || 0;
        const ref = parseInt(cells[3]?.replace(/[^+\-\d]/g, "")) || 0;
        const will = parseInt(cells[4]?.replace(/[^+\-\d]/g, "")) || 0;
        if (bab !== 0 || cells[1]?.includes("+0") || cells[1]?.includes("0"))
          babValues.push(bab);
        fortValues.push(fort);
        refValues.push(ref);
        willValues.push(will);
      }
    }

    // Determine BAB progression from last value
    if (babValues.length >= 20) {
      const lastBab = babValues[babValues.length - 1];
      if (lastBab >= 20) babProgression = "full";
      else if (lastBab >= 14) babProgression = "3/4";
      else babProgression = "half";
    }

    // Determine save progressions from last value
    if (fortValues.length >= 20) {
      fortSave = fortValues[fortValues.length - 1] >= 12 ? "good" : "poor";
      refSave = refValues[refValues.length - 1] >= 12 ? "good" : "poor";
      willSave = willValues[willValues.length - 1] >= 12 ? "good" : "poor";
    }
  }

  // Extract body text — intro prose between title and stat block
  // Stop at the first stat-block field or archetype section
  const statBlockStart = clean.search(
    /\*\*(Role|Alignment|Hit Die|Starting Wealth|Starting Age|Class Skills|Skill Ranks|Proficiencies|Table):\*\*/i,
  );
  const archetypeStart = clean.search(/\n\+ Archetypes\b/);
  const bodyStart =
    clean.indexOf(
      "\n",
      clean.indexOf("parent:") > 0
        ? clean.indexOf("parent:")
        : clean.indexOf("title:"),
    ) + 1;
  const bodyEnd = Math.min(
    statBlockStart > bodyStart ? statBlockStart : Infinity,
    archetypeStart > bodyStart ? archetypeStart : Infinity,
  );
  let bodyText = "";
  if (bodyEnd > bodyStart && bodyEnd < Infinity) {
    bodyText = cleanBody(clean.substring(bodyStart, bodyEnd));
  }

  return {
    name,
    system: config.system,
    hitDie: fields.hitDie ? parseInt(fields.hitDie) : null,
    alignment: fields.alignment || "",
    startingWealth: fields.startingWealth || "",
    skillRanks: fields.skillRanks ? parseInt(fields.skillRanks) : null,
    classSkills,
    babProgression: babProgression || "3/4",
    fortSaveProgression: fortSave || "good",
    refSaveProgression: refSave || "poor",
    willSaveProgression: willSave || "good",
    bodyText,
  };
}

// ─── Appendix section stripping ───────────────────────────────────────────────

/**
 * Known appendix heading texts (after stripping Wikidot color markup).
 * These section headings appear in ---- -delimited blocks at the end of class
 * source files and contain archetype lists, feats, equipment, etc. — not class
 * features. We match them by substring so "Armorist Feats" matches "Feats".
 */
const APPENDIX_HEADINGS = [
  "Archetypes",
  "Favored Class Bonuses",
  "Class Equipment",
  "Alternate Class Features",
  "Feats",
  "Note:",
];

/**
 * Check whether a trimmed line is a whole-line Wikidot structural tag
 * that can appear between a ---- delimiter and an appendix heading.
 * Only matches lines that are entirely a structural tag.
 */
function isStructuralTag(line) {
  return /^\[\[\/?(?:div\b.*?\]\]|=\]\])[ \t]*$/i.test(line);
}

/**
 * Check whether a trimmed line is a + heading and its content matches one of
 * the known appendix patterns.
 */
function isAppendixHeading(line) {
  // Match: + heading with optional color markup like + ##993300|Archetypes##
  const m = line.match(/^\+ (?:##[^|]+\|)?(.+?)(?:##)?$/);
  if (!m) return false;
  return APPENDIX_HEADINGS.some((h) => m[1].includes(h));
}

/**
 * Strip appendix sections from class source text before feature parsing.
 *
 * Appendix sections are ---- -delimited blocks that appear at the end of class
 * files. They list archetypes, favored class bonuses, feats, equipment, alternate
 * class features, and design notes — content that belongs to other parsers, not
 * to class features.
 *
 * We detect them by scanning for ---- lines and checking whether the next
 * substantive line (skipping blanks and [[div]] tags) is a + heading whose text
 * matches a known appendix pattern. If so, the entire ---- -delimited block is
 * removed.
 */
function stripAppendixSections(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Potential appendix delimiter?
    if (/^----[ \t]*$/.test(line)) {
      // Scan forward past blanks and Wikidot structural tags
      let peek = i + 1;
      while (
        peek < lines.length &&
        (/^[ \t]*$/.test(lines[peek]) || isStructuralTag(lines[peek].trim()))
      ) {
        peek++;
      }

      // Is the next substantive line an appendix heading?
      if (peek < lines.length && isAppendixHeading(lines[peek].trim())) {
        // Found an appendix block — skip the opening ---- and all content
        // up to (but NOT including) the closing ---- line. We leave the
        // closing ---- for the next iteration so that consecutive appendix
        // sections (which share ---- delimiters) are all detected.
        i++; // skip opening ----
        while (i < lines.length && !/^----[ \t]*$/.test(lines[i])) {
          i++;
        }
        // i now points at the closing ----; let the next iteration handle it
        continue;
      }
    }

    out.push(line);
    i++;
  }

  // Trim orphaned ---- lines left over from the last appendix block.
  // Also trim trailing blank lines for a clean result.
  while (out.length > 0 && /^----[ \t]*$/.test(out[out.length - 1])) {
    out.pop();
  }
  while (out.length > 0 && /^[ \t]*$/.test(out[out.length - 1])) {
    out.pop();
  }

  return out.join("\n");
}

// ─── Trait chunk parsing ──────────────────────────────────────────────────────

/**
 * Parse a single trait from a ++++ chunk extracted from a feature body.
 * Follows the same extraction pattern as generate-bestial-traits.mjs.
 *
 * Returns { name, slug, requires, tags, body } or null if the chunk is empty.
 */
function parseTraitChunk(chunk, featureId) {
  const lines = chunk.split("\n");
  const heading = lines[0].replace(/^\+\+\+\+\s+/, "").trim();
  let bodyLines = lines.slice(1);

  // --- Extract source bracket e.g. "[Origin]" or "[Alienist HB]" ---
  // (We don't resolve these to book names here; they're informational)
  const sourceMatch = heading.match(/\[([^\]]+)\]\s*$/);
  const sourceKey = sourceMatch?.[1] ?? null;
  let head = sourceMatch ? heading.slice(0, sourceMatch.index).trim() : heading;

  // --- Extract (Ex), (Su), (Sp) type marker ---
  const typeMatch = head.match(/\((Ex|Su|Sp)\)/i);
  const abilityType = typeMatch ? typeMatch[1].toLowerCase() : null;
  head = head.replace(/\((Ex|Su|Sp)\)/i, "").trim();

  // --- Extract inline (requires ...) ---
  let requires = null;
  const reqMatch = head.match(/\(requires ([^)]+)\)/i);
  if (reqMatch) {
    requires = reqMatch[1].trim();
    head = head.replace(/\(requires [^)]+\)/i, "").trim();
  }

  // --- Clean name: strip Wikidot color markup and wikilinks ---
  const name = normalizeQuotes(
    head
      .replace(/##[^|#]+\|([^#]+)##/g, "$1")
      .replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, "$1")
      .replace(/^[-–—]\s*/, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

  if (!name) return null;

  // --- Clean up body lines ---
  // Strip Wikidot ^^...^^ superscript source lines
  bodyLines = bodyLines.filter((l) => !l.trim().startsWith("^^"));

  // Extract **Requires:** lines from body
  const reqLineIdx = bodyLines.findIndex((l) =>
    /^\*\*Requires:\*\*/i.test(l.trim()),
  );
  if (reqLineIdx !== -1 && !requires) {
    requires = bodyLines[reqLineIdx]
      .trim()
      .replace(/^\*\*Requires:\*\*\s*/i, "")
      .trim();
    bodyLines.splice(reqLineIdx, 1);
  }

  // Strip leading/trailing blank lines
  while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim())
    bodyLines.pop();

  let body = cleanBody(bodyLines.join("\n"));

  // Add source annotation if present
  if (sourceKey) {
    body = `${body}\n\n*Source: ${sourceKey}*`;
  }

  const tags = abilityType ? [abilityType] : [];
  const slug = kebab(name);

  return { name, slug, requires, tags, body, featureId };
}

// ─── Class feature extraction ─────────────────────────────────────────────────

function parseClassFeatures(text) {
  // Strip appendix sections before parsing features
  text = stripAppendixSections(text);

  const features = [];
  const allTraits = []; // accumulated across all features
  // Match exactly ++ headings (not +++, ++++)
  const headingRe = /^\+{2}\s(?!\+)(.+)$/gm;
  const matches = [...text.matchAll(headingRe)];

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    // Strip color markup, wikilinks, AND leading dashes/bullets from heading
    const name = normalizeQuotes(
      heading
        .replace(/##[^|#]+\|([^#]+)##/g, "$1")
        .replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, "$1")
        .replace(/^[-–—]\s*/, "")
        .trim(),
    );

    // Determine type: talent progression, class feature, etc.
    const lower = name.toLowerCase();
    if (
      /magic talents|combat talents|blended training|combat training/i.test(
        lower,
      )
    ) {
      features.push({ name, type: "talent-progression", level: 1 });
      continue;
    }

    // Extract body text until next ++ heading or end
    const bodyStart = matches[i].index + matches[i][0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const bodyRaw = text.substring(bodyStart, bodyEnd);

    // Determine level from name or body
    let level = 1;
    const levelMatch = bodyRaw.match(
      /(?:At |Starting at |Beginning at )(\d+)[a-z]{2} level/,
    );
    if (levelMatch) level = parseInt(levelMatch[1]);

    // Check for trait sub-entries (++++ headings within the feature body).
    // Split on ++++ boundaries — the first chunk is the feature description,
    // subsequent chunks are individual trait entries.
    const traitChunks = bodyRaw.split(/\n(?=\+\+\+\+ )/);
    const hasTraits = traitChunks.length > 1;

    let body = cleanBody(traitChunks[0]);
    let isTraitContainer = false;
    const featureTraits = [];

    if (hasTraits) {
      isTraitContainer = true;
      const featureId = kebab(name);
      for (let t = 1; t < traitChunks.length; t++) {
        const chunk = traitChunks[t].trim();
        if (!chunk.startsWith("++++")) continue;
        const trait = parseTraitChunk(chunk, featureId);
        if (trait) {
          featureTraits.push(trait);
          allTraits.push(trait);
        }
      }
    }

    features.push({
      name,
      type: "class-feature",
      level,
      body,
      isTraitContainer,
      traits: featureTraits,
    });
  }

  return { features, traits: allTraits };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderClassPage(parsed, config) {
  const id = kebab(parsed.name);
  const skills = JSON.stringify(parsed.classSkills);
  const lines = [
    "---",
    `id: ${id}`,
    `name: "${parsed.name}"`,
    "type: class",
    `system: ${parsed.system}`,
    "tags: []",
    `hitDie: ${parsed.hitDie}`,
    `alignment: "${parsed.alignment}"`,
    `startingWealth: "${parsed.startingWealth}"`,
    `skillRanks: ${parsed.skillRanks}`,
    `classSkills:`,
    ...parsed.classSkills.map((s) => `  - ${s.includes(",") ? `"${s}"` : s}`),
    `babProgression: "${parsed.babProgression}"`,
    `fortSaveProgression: ${parsed.fortSaveProgression}`,
    `refSaveProgression: ${parsed.refSaveProgression}`,
    `willSaveProgression: ${parsed.willSaveProgression}`,
    "---",
  ];
  return `${lines.join("\n")}\n\n${parsed.bodyText.trim()}\n`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const isMain =
  !!process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    realpathSync(process.argv[1]).replace(/\\/g, "/");

if (isMain) {
  const args = process.argv.slice(2);
  const className = args.find((a) => !a.startsWith("-")) ?? null;
  const MODE = args.find((a) => a.startsWith("--")) ?? "--dry-run";

  if (!className || !CLASS_CONFIGS[className]) {
    console.error(
      "Usage: node scripts/class-parser.mjs <class> [--dry-run|--write|--force|--validate]",
    );
    console.error(
      `Available classes: ${Object.keys(CLASS_CONFIGS).join(", ")}`,
    );
    process.exit(1);
  }

  const config = CLASS_CONFIGS[className];
  const inputPath = join(ROOT, config.file);

  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${config.file}`);
    process.exit(1);
  }

  const rawText = readFileSync(inputPath, "utf-8");

  // Parse class page
  const parsed = parseClassFile(rawText, { ...config, className });
  const classContent = renderClassPage(parsed, config);

  const classDir = join(ROOT, "src", "content", config.primaryBook, "classes");
  const classPath = join(classDir, `${kebab(parsed.name)}.md`);
  const classLabel = `${config.primaryBook}/classes/${kebab(parsed.name)}.md`;

  // Write/validate class page
  if (MODE === "--dry-run") {
    console.log(`WOULD WRITE  ${classLabel}`);
    console.log(classContent);
    console.log("---");
  } else if (MODE === "--validate") {
    if (existsSync(classPath)) {
      const existing = readFileSync(classPath, "utf-8");
      if (existing.trim() !== classContent.trim()) {
        console.log(`DIFF  ${classLabel}`);
      } else {
        console.log(`OK    ${classLabel}`);
      }
    } else {
      console.log(`MISS  ${classLabel}`);
    }
  } else if (MODE === "--force" || !existsSync(classPath)) {
    if (!existsSync(classDir)) mkdirSync(classDir, { recursive: true });
    writeFileSync(classPath, classContent, "utf-8");
    console.log(`WROTE  ${classLabel}`);
  }

  // Parse and write class features
  const { features, traits } = parseClassFeatures(rawText);
  console.log(
    `Parsed ${features.length} features, ${traits.length} traits from ${config.file}`,
  );

  const featureEntries = features
    .filter((f) => f.type === "class-feature")
    .map((f) => ({
      name: f.name,
      bookSlug: config.primaryBook,
      type: "class-feature",
      subdir: "class-features",
      body: f.body || "",
      tags: [],
      tier: "feature",
      dualSphere: null,
      level: f.level,
      isTraitContainer: f.isTraitContainer || false,
    }));

  const contentRoot = join(ROOT, "src", "content");
  const renderFn = (entry) => {
    const id = kebab(entry.name);
    const lines = [
      "---",
      `id: ${id}`,
      `name: "${entry.name}"`,
      `type: class-feature`,
      `system: ${config.system}`,
      `className: ${className}`,
      `level: ${entry.level}`,
      "tags: []",
    ];
    if (entry.isTraitContainer) {
      lines.push("isTraitContainer: true");
    }
    lines.push("---", "", entry.body || "");
    return lines.join("\n") + "\n";
  };

  const { newCount, skipCount } = writeEntries(
    featureEntries,
    contentRoot,
    renderFn,
    MODE,
  );

  // Write class traits
  if (traits.length > 0) {
    const traitEntries = traits.map((t) => ({
      id: `${className}-${t.slug}`,
      name: t.name,
      slug: t.slug,
      bookSlug: config.primaryBook,
      type: "class-trait",
      subdir: `class-traits/${className}`,
      body: t.body || "",
      tags: t.tags || [],
      className,
      featureId: t.featureId,
      requires: t.requires || null,
    }));

    const traitRenderFn = (entry) => {
      const lines = [
        "---",
        `id: ${className}-${entry.slug}`,
        `name: "${entry.name}"`,
        `type: class-trait`,
        `system: ${config.system}`,
        `tags: ${JSON.stringify(entry.tags)}`,
        `className: ${entry.className}`,
        `featureId: ${entry.featureId}`,
      ];
      if (entry.requires) {
        lines.push(`requires: "${entry.requires}"`);
      }
      lines.push("---", "", entry.body || "");
      return lines.join("\n") + "\n";
    };

    const { newCount: traitNew, skipCount: traitSkip } = writeEntries(
      traitEntries,
      contentRoot,
      traitRenderFn,
      MODE,
    );

    if (MODE !== "--dry-run") {
      console.log(
        `Wrote ${traitNew} new trait(s), skipped ${traitSkip} existing.`,
      );
    }
  }

  if (MODE !== "--dry-run") {
    console.log(
      `Wrote ${newCount} new feature(s), skipped ${skipCount} existing.`,
    );
  }
}
