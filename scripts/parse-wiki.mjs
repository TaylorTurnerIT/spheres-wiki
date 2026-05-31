#!/usr/bin/env node
/**
 * Generalized Wikidot sphere page parser.
 * Converts sphere wiki pages to markdown content files with proper frontmatter.
 *
 * Usage:
 *   node scripts/parse-wiki.mjs <sphere> [--dry-run|--write|--force|--validate]
 *
 *   --dry-run   Print what would be written (default)
 *   --write     Write new files, skip existing
 *   --force     Write all files, overwriting existing
 *   --validate  Compare parser output against existing files, show diffs
 *
 * Add new spheres by adding to SPHERE_CONFIGS below.
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

import {
  normalizeQuotes,
  convertWikidotTable,
  cleanBody,
} from "./lib/wikidot-markup.mjs";
import { kebab, fmArray, writeEntries } from "./lib/render.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Sphere Configurations ────────────────────────────────────────────────────
// Each sphere has:
//   inputFile        - path to raw Wikidot source (relative to project root)
//   sphere           - sphere identifier (lowercase)
//   system           - "power" | "might" | "guile"
//   primaryBook      - default book slug for entries without a source key
//   headingSourceMap - bracket source keys → book slugs (null = resolve from body)
//   bodySourceMap    - ^^Source: Book Name^^ body lines → book slugs

const REPO = "../wdotcrawl/spheresofpower-repo/pages";

// Shared source mappings used by most spheres
const COMMON_HEADING_SOURCES = {
  "3PP": null,
  "Alienist HB": "the-alienists-handbook",
  Apoc: null,
  "Arcforge Addendum": "arcforge-players-compendium",
  "Archmagi's HB": "unknown-source",
  BTH: "beast-tamers-handbook",
  BaP: "blood-and-portents",
  "Cata. HB": "unknown-source",
  "Catgirl HB": "unknown-source",
  CrimDan: "crimson-dancers-handbook",
  DRS: "diamond-spheres-thaumic-potential",
  DbH: "damnation-by-hunger",
  EO3: "unknown-source",
  "Gravecaller's HB": "gravecallers-handbook",
  "Jester's HB": "jesters-handbook",
  "Jester HB": "jesters-handbook",
  LG: "arcforge-players-compendium",
  LotS: "spheres-of-guile",
  "Mana HB": "unknown-source",
  Origin: "spheres-of-origin",
  "RW HB": "unknown-source",
  "SA:BG": null,
  "SM\u2014": "barons-uncanny-gateway",
  Warden: "unknown-source",
};

const COMMON_BODY_SOURCES = {
  "Spheres Apocrypha: Debilitating Talents 2":
    "spheres-apocrypha-debilitating-talents-2",
  "Spheres Apocrypha: Cohorts & Companions":
    "spheres-apocrypha-cohorts-and-companions",
  "Spheres Apocrypha: Protokinesis Feats":
    "spheres-apocrypha-protokinesis-feats",
  "Spheres Apocrypha: Battlefield Manipulation Talents":
    "spheres-apocrypha-battlefield-manipulation-talents",
  "Spheres Apocrypha: Banshee's Gasp": "spheres-apocrypha-banshees-gasp",
  "Baron's Glorious Arena": "barons-glorious-arena",
  "Baron's Uncanny Gateway": "barons-uncanny-gateway",
  "Baron's Hallowed Archive": "barons-hallowed-archive",
  "Baron's Secluded Library": "barons-secluded-library",
  "Expanded Spheres: Baron's Lost Apocrypha":
    "expanded-spheres-barons-lost-apocrypha",
  "Expanded Spheres: Weaves of War": "expanded-spheres-weaves-of-war",
  "Arcforge Players Compendium": "arcforge-players-compendium",
  "Card Casting 2: Counters and Control": "unknown-source",
  "Card Casting 3: Volatile Variance": "unknown-source",
};

const SPHERE_CONFIGS = {
  alteration: {
    inputFile: `${REPO}/alteration.txt`,
    sphere: "alteration",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  blood: {
    inputFile: `${REPO}/blood.txt`,
    sphere: "blood",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  conjuration: {
    inputFile: `${REPO}/conjuration.txt`,
    sphere: "conjuration",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  creation: {
    inputFile: `${REPO}/creation.txt`,
    sphere: "creation",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  dark: {
    inputFile: `${REPO}/dark.txt`,
    sphere: "dark",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  death: {
    inputFile: `${REPO}/death.txt`,
    sphere: "death",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  destruction: {
    inputFile: `${REPO}/destruction.txt`,
    sphere: "destruction",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  divination: {
    inputFile: `${REPO}/divination.txt`,
    sphere: "divination",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  enhancement: {
    inputFile: `${REPO}/enhancement.txt`,
    sphere: "enhancement",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  "fallen-fey": {
    inputFile: `${REPO}/fallen-fey.txt`,
    sphere: "fallen-fey",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  fate: {
    inputFile: `${REPO}/fate.txt`,
    sphere: "fate",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  illusion: {
    inputFile: `${REPO}/illusion.txt`,
    sphere: "illusion",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  life: {
    inputFile: `${REPO}/life.txt`,
    sphere: "life",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  light: {
    inputFile: `${REPO}/light.txt`,
    sphere: "light",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  mana: {
    inputFile: `${REPO}/mana.txt`,
    sphere: "mana",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  mind: {
    inputFile: `${REPO}/mind.txt`,
    sphere: "mind",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  nature: {
    inputFile: `${REPO}/nature.txt`,
    sphere: "nature",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  protection: {
    inputFile: `${REPO}/protection.txt`,
    sphere: "protection",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  telekinesis: {
    inputFile: `${REPO}/telekinesis.txt`,
    sphere: "telekinesis",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  time: {
    inputFile: `${REPO}/time.txt`,
    sphere: "time",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  war: {
    inputFile: `${REPO}/war.txt`,
    sphere: "war",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  warp: {
    inputFile: `${REPO}/warp.txt`,
    sphere: "warp",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
  weather: {
    inputFile: `${REPO}/weather.txt`,
    sphere: "weather",
    system: "power",
    primaryBook: "ultimate-spheres-of-power",
    headingSourceMap: { ...COMMON_HEADING_SOURCES },
    bodySourceMap: { ...COMMON_BODY_SOURCES },
  },
};

// ─── Bracket-style ability type tags (in headings as [tag], not source keys) ──

const BRACKET_TAGS = new Set([
  "instill",
  "mass",
  "utility",
  "range",
  "strike",
  "body",
  "transformation",
  "curse",
  "consecration",
  "ghost strike",
  "word",
]);

// ─── Sphere name registry (for dual-sphere detection) ─────────────────────────

const KNOWN_SPHERES = new Set([
  "alteration",
  "blood",
  "conjuration",
  "creation",
  "dark",
  "death",
  "destruction",
  "divination",
  "enhancement",
  "fate",
  "illusion",
  "life",
  "light",
  "mana",
  "mind",
  "nature",
  "protection",
  "telekinesis",
  "time",
  "war",
  "warp",
  "weather",
]);

// ─── Section context determination ────────────────────────────────────────────

function parseSectionContext(headingText) {
  const lower = headingText.trim().toLowerCase();

  if (/\bfeats?\b/.test(lower)) {
    return { type: "feat", tier: null, sectionTags: [] };
  }
  if (lower.includes("advanced") && lower.includes("talent")) {
    return { type: "talent", tier: "advanced", sectionTags: [] };
  }
  if (lower.includes("body talent")) {
    return { type: "talent", tier: "basic", sectionTags: ["body"] };
  }
  if (lower.includes("transformation talent")) {
    return { type: "talent", tier: "basic", sectionTags: ["transformation"] };
  }
  if (lower.includes("talent")) {
    return { type: "talent", tier: "basic", sectionTags: [] };
  }
  if (lower.includes("drawback")) {
    return { type: "talent", tier: "drawback", sectionTags: [] };
  }
  return null;
}

// ─── Wikidot markup ───────────────────────────────────────────────────────────
// (normalizeQuotes, convertWikidotTable, cleanBody are imported from lib/)

// ─── Heading parsing ──────────────────────────────────────────────────────────

// Tags that appear as (parenthetical) in headings
const PAREN_TAG_MAP = {
  body: "body",
  transformation: "transformation",
  utility: "utility",
  instill: "instill",
  mass: "mass",
  range: "range",
  strike: "strike",
  quicken: "quicken",
  still: "still",
  "blood art": "blood-art",
  form: "form",
  type: "type",
  companion: "companion",
};

/**
 * Parse a ++++ heading line. Returns { name, tags, sourceKey, type, tier }.
 * sectionCtx provides defaults for type/tier/sectionTags.
 */
function parseHeading(headingLine, sectionCtx, config) {
  let head = headingLine.replace(/^\++\s+/, "").trim();

  // Strip Wikidot color markup: ##rrggbb|text## or ##colorname|text## → text
  head = head.replace(/##[^|#]+\|([^#]+)##/g, "$1");

  const tags = [...(sectionCtx.sectionTags ?? [])];
  let sourceKey = null;
  let type = sectionCtx.type;
  let tier = sectionCtx.tier;

  // Extract all [bracket] items
  for (const m of head.matchAll(/\[([^\]]+)\]/g)) {
    const content = m[1].trim();
    const lower = content.toLowerCase().replace(/[\s-]+/g, " ");

    if (lower === "dual sphere") {
      if (!tags.includes("dual-sphere")) tags.push("dual-sphere");
      type = "feat";
    } else if (lower === "combat") {
      if (!tags.includes("combat")) tags.push("combat");
      type = "feat";
    } else if (BRACKET_TAGS.has(lower)) {
      if (!tags.includes(lower)) tags.push(lower);
    } else if (
      Object.prototype.hasOwnProperty.call(config.headingSourceMap, content)
    ) {
      sourceKey = content;
    } else {
      sourceKey = content;
    }
  }
  head = head.replace(/\s*\[[^\]]+\]/g, "").trim();

  // Extract parenthetical markers: (body), (quicken, still), (Dual Sphere), (Combat), etc.
  for (const m of head.matchAll(/\(([^)]+)\)/g)) {
    for (const part of m[1].split(",")) {
      const lower = part
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, " ");
      if (lower === "dual sphere") {
        if (!tags.includes("dual-sphere")) tags.push("dual-sphere");
        type = "feat";
      } else if (lower === "combat") {
        if (!tags.includes("combat")) tags.push("combat");
        type = "feat";
      } else if (PAREN_TAG_MAP[lower]) {
        const tag = PAREN_TAG_MAP[lower];
        if (!tags.includes(tag)) tags.push(tag);
      }
    }
  }
  head = head.replace(/\s*\([^)]+\)/g, "").trim();

  const name = normalizeQuotes(head.replace(/\s+/g, " ").trim());
  return { name, tags, sourceKey, type, tier };
}

// ─── Source resolution ────────────────────────────────────────────────────────

function resolveSourceBook(sourceKey, bodySource, config) {
  if (!sourceKey) return config.primaryBook;

  const mapped = config.headingSourceMap[sourceKey];
  if (mapped !== undefined && mapped !== null) return mapped;

  if (bodySource) {
    const normalizedSource = normalizeQuotes(bodySource);
    for (const [pattern, slug] of Object.entries(config.bodySourceMap)) {
      if (normalizedSource.includes(normalizeQuotes(pattern))) return slug;
    }
  }

  console.warn(
    `  [WARN] Unknown source: [${sourceKey}]${bodySource ? ` / "${bodySource}"` : ""} -> unknown-source`,
  );
  return "unknown-source";
}

// ─── Dual-sphere extraction ───────────────────────────────────────────────────

function extractDualSphere(bodyText, primarySphere) {
  const prereqMatch = bodyText.match(/\*\*Prerequisite(?:s)?:\*\*([^\n]+)/i);
  if (!prereqMatch) return null;

  const prereqText = prereqMatch[1];
  for (const match of prereqText.matchAll(/\b(\w+)\s+[Ss]phere\b/g)) {
    const sphere = match[1].toLowerCase();
    if (sphere !== primarySphere && KNOWN_SPHERES.has(sphere)) return sphere;
  }
  return null;
}

// ─── Wiki file parser ─────────────────────────────────────────────────────────

function parseWikiFile(text, config) {
  const entries = [];
  const seenIds = new Set();
  let sectionCtx = { type: "talent", tier: "basic", sectionTags: [] };

  const lines = text.split("\n");
  let inDiv = false;
  const divBuffer = [];
  let baseMode = null;

  const flushBase = () => {
    if (!baseMode) return;
    const { name, bodyLines, subSections } = baseMode;
    baseMode = null;
    if (!name) return;
    const id = kebab(name);
    if (seenIds.has(id)) return;
    seenIds.add(id);
    const cleanedProse = cleanBody(bodyLines.join("\n"));
    let body;
    if (subSections.length > 0) {
      const subParts = subSections
        .map((s) => `#### ${s.name}\n\n${s.body}`)
        .join("\n\n---\n\n");
      body = `${cleanedProse}\n\n---\n\n${subParts}\n\n---`;
    } else {
      body = cleanedProse;
    }
    if (body) {
      entries.push({
        name,
        tags: [],
        type: "talent",
        tier: "base",
        bookSlug: config.primaryBook,
        body,
        dualSphere: null,
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\[\[div\b/i.test(trimmed)) {
      inDiv = true;
      divBuffer.length = 0;
      continue;
    }

    if (/^\[\[\/div\]\]/i.test(trimmed)) {
      if (inDiv && divBuffer.length > 0) {
        const divText = divBuffer.join("\n");
        if (/^\+{4}\s/m.test(divText)) {
          if (baseMode) {
            const parsed = parseEntryBlock(
              divText,
              { type: "talent", tier: "basic", sectionTags: [] },
              config,
            );
            if (parsed)
              baseMode.subSections.push({
                name: parsed.name,
                body: parsed.body,
              });
          } else {
            const parsed = parseEntryBlock(divText, { ...sectionCtx }, config);
            if (parsed) {
              const id = kebab(parsed.name);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                entries.push(parsed);
              }
            }
          }
        } else if (baseMode) {
          baseMode.bodyLines.push(...divBuffer);
        }
      }
      inDiv = false;
      divBuffer.length = 0;
      continue;
    }

    if (inDiv) {
      divBuffer.push(line);
      continue;
    }

    const headingMatch = trimmed.match(/^(\+{1,3})(?!\+)\s+(.+)/);
    if (headingMatch) {
      const ctx = parseSectionContext(headingMatch[2]);
      if (ctx) {
        flushBase();
        sectionCtx = ctx;
      } else if (headingMatch[1] === "++") {
        if (baseMode) {
          const sectionName = normalizeQuotes(
            headingMatch[2].replace(/\s*\[[^\]]+\]/g, "").trim(),
          );
          baseMode.bodyLines.push(`### ${sectionName}`);
        } else {
          flushBase();
          const baseName = normalizeQuotes(
            headingMatch[2].replace(/\s*\[[^\]]+\]/g, "").trim(),
          );
          baseMode = { name: baseName, bodyLines: [], subSections: [] };
        }
      }
      continue;
    }

    if (baseMode) {
      const subHeadingMatch = trimmed.match(/^(\+{4,})\s+(.+)$/);
      if (subHeadingMatch) {
        const hashes = "#".repeat(subHeadingMatch[1].length);
        baseMode.bodyLines.push(
          `${hashes} ${normalizeQuotes(subHeadingMatch[2])}`,
        );
      } else {
        baseMode.bodyLines.push(line);
      }
    }
  }

  flushBase();
  return entries;
}

function parseEntryBlock(divContent, sectionCtx, config) {
  const lines = divContent.split("\n");
  const headingIdx = lines.findIndex((l) => /^\+{4}\s/.test(l.trim()));
  if (headingIdx === -1) return null;

  const headingLine = lines[headingIdx].trim();
  const { name, tags, sourceKey, type, tier } = parseHeading(
    headingLine,
    sectionCtx,
    config,
  );
  if (!name) return null;

  const bodyLines = lines.slice(headingIdx + 1);

  let bodySource = null;
  const cleanedLines = bodyLines.filter((l) => {
    const t = l.trim();
    if (/^\^\^.+\^\^$/.test(t)) {
      const m = t.match(/\^\^\*?\*?Source:\*?\*?\s*(.+?)\*?\*?\^\^/i);
      if (m) {
        bodySource = m[1]
          .replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, "$1")
          .replace(/\[https?[^\s\]]+\s+([^\]]+)\]/g, "$1")
          .trim();
      }
      return false;
    }
    return true;
  });

  const body = cleanBody(cleanedLines.join("\n"));

  if (/^See\s+(\[\[\[|General\b)/i.test(body.trimStart())) return null;

  const bookSlug = resolveSourceBook(sourceKey, bodySource, config);

  let dualSphere = null;
  if (tags.includes("dual-sphere")) {
    dualSphere = extractDualSphere(body, config.sphere);
  }

  return { name, tags, type, tier, bookSlug, body, dualSphere };
}

// ─── Rendering ────────────────────────────────────────────────────────────────
// (kebab, fmArray are imported from lib/render.mjs)

/**
 * Generate a sphere definition page (.md) with intro text and auto-detected
 * sectionDefinitions based on the talents and feat tags found in the source.
 */
function generateSpherePage(text, config) {
  // 1. Extract intro text — strip blocks whose content should NOT appear, then clean
  let clean = text
    // Strip module blocks entirely (CSS has no place in body text)
    .replace(/\[\[module[\s\S]*?\[\[\/module\]\]/gi, "")
    // Strip [[=]]...[[/=]] blocks entirely (purchase sidebars)
    .replace(/\[\[=\]\][\s\S]*?\[\[\/=\]\]/gi, "")
    // Strip tabview/tab tags as individual lines but KEEP content between them
    .replace(/^\[\[\/?tab(view)?\b[^\]]*\]\]/gim, "");

  // Find first ++ heading in cleaned text
  const titleEndIdx = clean.indexOf("\n") + 1;
  const firstH2Idx = clean.search(/\n\+{2}\s/);
  let intro = "";
  if (firstH2Idx > titleEndIdx) {
    const segment = clean.substring(titleEndIdx, firstH2Idx);
    intro = cleanBody(segment);
  }

  // 2. Parse entries to discover tag usage
  const entries = parseWikiFile(text, config);
  const talents = entries.filter(
    (e) => e.type === "talent" && e.tier !== "base",
  );
  const feats = entries.filter((e) => e.type === "feat");

  // Collect tags, separated by organizational vs mechanical
  const usedOrgTags = new Set();
  const usedFeatTags = new Set();
  const hasAdvanced = talents.some((e) => e.tier === "advanced");
  const hasLegendary = talents.some((e) => e.tier === "legendary");

  // Tags that create separate UI sections (vs mechanical descriptors that don't)
  const ORG_TAGS = new Set([
    "body",
    "transformation",
    "blood-art",
    "consecration",
    "ghost strike",
    "word",
    "curse",
    "quicken",
    "still",
    "form",
    "type",
    "companion",
  ]);

  for (const e of talents) {
    for (const t of e.tags) {
      if (ORG_TAGS.has(t)) usedOrgTags.add(t);
    }
  }
  for (const e of feats) {
    for (const t of e.tags) {
      if (t === "combat" || t === "dual-sphere") usedFeatTags.add(t);
    }
  }

  // 3. Build talent categories from organizational tags only
  const talentCategories = [];
  const talentExcludeAll = [];

  const TAG_LABELS = {
    body: "Body Talents",
    transformation: "Transformation Talents",
    "blood-art": "Blood Art Talents",
    consecration: "Consecration Talents",
    "ghost strike": "Ghost Strike Talents",
    word: "Word Talents",
    curse: "Curse Talents",
    quicken: "Quicken Talents",
    still: "Still Talents",
    form: "Form Talents",
    type: "Type Talents",
    companion: "Companion Talents",
  };

  for (const tag of usedOrgTags) {
    const label = TAG_LABELS[tag] || `${capitalize(tag)} Talents`;
    talentCategories.push({
      label,
      tiers: ["basic"],
      tags: [tag],
    });
    talentExcludeAll.push(tag);
  }

  // Main talent category (excludes all org tags)
  talentCategories.unshift({
    label: `${capitalize(config.sphere)} Talents`,
    tiers: ["basic"],
    ...(talentExcludeAll.length > 0 ? { excludeTags: talentExcludeAll } : {}),
  });

  if (hasAdvanced) {
    talentCategories.push({
      label: `Advanced ${capitalize(config.sphere)} Talents`,
      tiers: ["advanced"],
    });
  }

  if (hasLegendary) {
    talentCategories.push({
      label: `Legendary ${capitalize(config.sphere)} Talents`,
      tiers: ["legendary"],
    });
  }

  // 4. Feat categories
  const featCategories = [];
  const featExcludeAll = [];
  if (usedFeatTags.has("combat")) featExcludeAll.push("combat");
  if (usedFeatTags.has("dual-sphere")) featExcludeAll.push("dual-sphere");

  featCategories.push({
    label: `${capitalize(config.sphere)} Feats`,
    tiers: ["feat"],
    ...(featExcludeAll.length > 0 ? { excludeTags: featExcludeAll } : {}),
  });

  if (usedFeatTags.has("combat")) {
    featCategories.push({
      label: "Combat Feats",
      tiers: ["feat"],
      tags: ["combat"],
    });
  }
  if (usedFeatTags.has("dual-sphere")) {
    featCategories.push({
      label: "Dual Sphere Feats",
      tiers: ["feat"],
      tags: ["dual-sphere"],
    });
  }

  // 5. Build sectionDefinitions
  const sectionDefinitions = [];
  if (talentCategories.length > 0) {
    sectionDefinitions.push({ label: "Talents", categories: talentCategories });
  }
  if (featCategories.length > 0) {
    sectionDefinitions.push({ label: "Feats", categories: featCategories });
  }

  // 6. Render to YAML frontmatter
  const lines = ["---"];
  lines.push(`id: ${config.sphere}`);
  lines.push(`name: "${capitalize(config.sphere)}"`);
  lines.push(`system: ${config.system}`);
  lines.push("type: sphere");
  lines.push(`icon: ${config.sphere}`);
  lines.push("tags: []");
  lines.push("sectionDefinitions:");
  for (const section of sectionDefinitions) {
    lines.push(`  - label: "${section.label}"`);
    lines.push("    categories:");
    for (const cat of section.categories) {
      lines.push(`      - label: "${cat.label}"`);
      lines.push(`        tiers: ${JSON.stringify(cat.tiers)}`);
      if (cat.tags) lines.push(`        tags: ${JSON.stringify(cat.tags)}`);
      if (cat.excludeTags)
        lines.push(`        excludeTags: ${JSON.stringify(cat.excludeTags)}`);
    }
  }
  lines.push("---");

  return `${lines.join("\n")}\n\n${intro.trim()}\n`;
}

function capitalize(str) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderTalent(entry, config) {
  const id = kebab(entry.name);
  const tags = fmArray(entry.tags);
  const lines = [
    "---",
    `id: ${id}`,
    `name: "${entry.name}"`,
    `system: ${config.system}`,
    `type: talent`,
    `sphere: ${config.sphere}`,
    `tier: ${entry.tier}`,
    `tags: ${tags}`,
    "---",
  ];
  return `${lines.join("\n")}\n\n${entry.body}\n`;
}

function renderFeat(entry, config) {
  const id = kebab(entry.name);
  const tags = fmArray(entry.tags);
  const lines = [
    "---",
    `id: ${id}`,
    `name: "${entry.name}"`,
    `type: feat`,
    `system: ${config.system}`,
    `sphere: ${config.sphere}`,
  ];
  if (entry.dualSphere) lines.push(`dualSphere: ${entry.dualSphere}`);
  lines.push(`tags: ${tags}`, "---");
  return `${lines.join("\n")}\n\n${entry.body}\n`;
}

function renderEntry(entry, config) {
  return entry.type === "feat"
    ? renderFeat(entry, config)
    : renderTalent(entry, config);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  normalizeQuotes,
  kebab,
  convertWikidotTable,
  cleanBody,
  parseSectionContext,
  parseHeading,
  resolveSourceBook,
  extractDualSphere,
  parseWikiFile,
  generateSpherePage,
  parseEntryBlock,
  SPHERE_CONFIGS,
  BRACKET_TAGS,
  PAREN_TAG_MAP,
  KNOWN_SPHERES,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const isMain =
  !!process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    realpathSync(process.argv[1]).replace(/\\/g, "/");

if (isMain) {
  const args = process.argv.slice(2);
  const sphereName = args.find((a) => !a.startsWith("-")) ?? null;
  const MODE = args.find((a) => a.startsWith("--")) ?? "--dry-run";

  if (!sphereName || !SPHERE_CONFIGS[sphereName]) {
    console.error(
      "Usage: node scripts/parse-wiki.mjs <sphere> [--dry-run|--write|--force|--validate]",
    );
    console.error(
      `Available spheres: ${Object.keys(SPHERE_CONFIGS).join(", ")}`,
    );
    process.exit(1);
  }

  const config = SPHERE_CONFIGS[sphereName];
  const inputPath = join(ROOT, config.inputFile);

  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  const rawText = readFileSync(inputPath, "utf-8");

  // ── Sphere page ─────────────────────────────────────────────────────────
  const sphereContent = generateSpherePage(rawText, config);
  const sphereDir = join(ROOT, "src", "content", config.primaryBook, "spheres");
  const spherePath = join(sphereDir, `${config.sphere}.md`);
  const sphereLabel = `${config.primaryBook}/spheres/${config.sphere}.md`;

  if (MODE === "--dry-run") {
    console.log(`WOULD WRITE  ${sphereLabel}`);
    console.log(sphereContent);
    console.log("---");
  } else if (MODE === "--validate") {
    if (existsSync(spherePath)) {
      const existing = readFileSync(spherePath, "utf-8");
      if (existing.trim() !== sphereContent.trim()) {
        console.log(`DIFF  ${sphereLabel}`);
        // dynamic import to avoid circular issues
        const { showDiff } = await import("./lib/render.mjs");
        showDiff(existing, sphereContent);
      } else {
        console.log(`OK    ${sphereLabel}`);
      }
    } else {
      console.log(`MISS  ${sphereLabel}`);
    }
  } else if (MODE === "--force" || !existsSync(spherePath)) {
    if (!existsSync(sphereDir)) mkdirSync(sphereDir, { recursive: true });
    writeFileSync(spherePath, sphereContent, "utf-8");
    console.log(`WROTE  ${sphereLabel}`);
  }

  // ── Talent & feat entries ───────────────────────────────────────────────
  const entries = parseWikiFile(rawText, config);

  const talents = entries.filter((e) => e.type === "talent");
  const feats = entries.filter((e) => e.type === "feat");
  const other = entries.filter((e) => e.type !== "talent" && e.type !== "feat");

  console.log(`Parsed ${entries.length} entries from ${config.inputFile}`);
  console.log(
    `  ${talents.length} talents, ${feats.length} feats${other.length ? `, ${other.length} other` : ""}\n`,
  );

  const contentRoot = join(ROOT, "src", "content");
  const renderFn = (entry) => renderEntry(entry, config);
  const { newCount, skipCount, diffCount, okCount, missCount } = writeEntries(
    entries,
    contentRoot,
    renderFn,
    MODE,
  );

  if (MODE === "--validate") {
    console.log(`\n${okCount} OK, ${diffCount} diff(s), ${missCount} missing.`);
  } else if (MODE !== "--dry-run") {
    console.log(
      `\nWrote ${newCount} new file(s), skipped ${skipCount} existing.`,
    );
  }
}
