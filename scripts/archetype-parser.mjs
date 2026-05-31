#!/usr/bin/env node
/**
 * Wikidot archetype page parser.
 * Converts archetype wiki pages to markdown content files.
 *
 * Usage:
 *   node scripts/archetype-parser.mjs <archetype-slug> [--dry-run|--write|--force]
 *
 * Or batch mode:
 *   node scripts/archetype-parser.mjs --all [--dry-run|--write|--force]
 */

import {
  readFileSync,
  readdirSync,
  existsSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

import { normalizeQuotes, cleanBody } from "./lib/wikidot-markup.mjs";
import { kebab, fmArray } from "./lib/render.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPO = "../wdotcrawl/spheresofpower-repo/pages";
const CONTENT = join(ROOT, "src", "content");

// ─── Book mapping for archetypes ──────────────────────────────────────────────

const PARENT_TO_BOOK = {
  "spheres-of-power": "ultimate-spheres-of-power",
  "spheres-of-might": "spheres-of-might",
  start: "ultimate-spheres-of-power",
};

// ─── Class name → filename mapping (for parent class detection) ───────────────

const CLASS_FILENAMES = new Set([
  "armorist",
  "armiger",
  "elementalist",
  "eliciter",
  "fey-adept",
  "hedgewitch",
  "incanter",
  "mageknight",
  "shifter",
  "soul-weaver",
  "symbiat",
  "thaumaturge",
  "wraith",
  "technician",
  "scholar",
  "commander",
  "conduit",
  "striker",
  "sentinel",
  "blacksmith",
  "bravo",
  "courser",
  "dissident",
  "envoy",
  "guide",
  "reaper",
  "prodigy",
  "truenamer",
  "mountebank",
  "naturalist",
  "pactmaker",
  "raveler-class",
  "runesmith",
]);

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse archetype name and parent class from the title.
 * e.g. "Blooded Knight (Cavalier Archetype)" → { name: "Blooded Knight", className: "Cavalier" }
 */
function parseTitle(title) {
  if (!title) return { name: "Unknown", className: null };
  const match = title.match(
    /^(.+?)\s*\(([^)]+?)\s*(?:Archetype|Prestige Class)\)\s*$/i,
  );
  if (match) {
    return {
      name: normalizeQuotes(match[1].trim()),
      className: match[2].trim(),
    };
  }
  // Some titles don't have the archetype suffix
  return { name: normalizeQuotes(title.trim()), className: null };
}

/**
 * Extract "This replaces/modifies/alters X" from feature body text.
 */
function extractChanges(bodyText) {
  const replaces = [];
  const alters = [];
  const modifies = [];

  const changeRe = /This\s+(replaces|alters|modifies)\s+(.+?)(?:\.|$)/gi;
  for (const m of bodyText.matchAll(changeRe)) {
    const verb = m[1].toLowerCase();
    const target = m[2].trim().replace(/\.$/, "");
    if (verb === "replaces") replaces.push(target);
    else if (verb === "alters") alters.push(target);
    else if (verb === "modifies") modifies.push(target);
  }

  return { replaces, alters, modifies };
}

/**
 * Detect level from body text.
 */
function detectLevel(bodyText) {
  const patterns = [
    /(?:At |Starting at |Beginning at )(\d+)[a-z]{2} level/,
    /(?:gained? at |granted at )(\d+)[a-z]{2} level/,
  ];
  for (const re of patterns) {
    const m = bodyText.match(re);
    if (m) return parseInt(m[1]);
  }
  return 1;
}

/**
 * Parse an archetype source file.
 */
function parseArchetypeFile(text, filename) {
  // Strip modules and = blocks
  let clean = text
    .replace(/\[\[module[\s\S]*?\[\[\/module\]\]/gi, "")
    .replace(/\[\[=\]\][\s\S]*?\[\[\/=\]\]/gi, "");

  // Extract title and parent
  const titleMatch = clean.match(/^title:(.+)$/m);
  const parentMatch = clean.match(/^parent:(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const parent = parentMatch ? parentMatch[1].trim() : null;

  const { name, className } = parseTitle(title);

  // Determine book
  let book = PARENT_TO_BOOK[parent] || "ultimate-spheres-of-power";
  // If parent is a class filename, use its book
  if (parent && CLASS_FILENAMES.has(parent)) {
    book =
      parent === "armiger" ||
      parent === "blacksmith" ||
      parent === "commander" ||
      parent === "conduit" ||
      parent === "scholar" ||
      parent === "sentinel" ||
      parent === "striker" ||
      parent === "technician"
        ? "spheres-of-might"
        : "ultimate-spheres-of-power";
  }

  // Parse features — bold headings that represent class feature modifications
  const features = [];
  const featureRe = /\*\*(.+?)\*\*/g;
  const featureMatches = [...clean.matchAll(featureRe)];

  for (let i = 0; i < featureMatches.length; i++) {
    let fName = normalizeQuotes(featureMatches[i][1].trim());
    // Strip trailing colon and ability markers
    fName = fName
      .replace(/:$/, "")
      .replace(/\s*\((?:Ex|Su|Sp|Ps)\)$/i, "")
      .trim();

    // Skip stat-block fields and non-feature headings
    const lower = fName.toLowerCase();
    if (
      /^(role|alignment|hit die|starting wealth|starting age|class skills|skill ranks|proficien|prerequisite|benefit|normal|special)$/i.test(
        lower,
      )
    )
      continue;
    if (
      /^(table|level|base attack|fort |ref |will |caster level|magic talent|spell point|spells per)/i.test(
        lower,
      )
    )
      continue;

    const bodyStart = featureMatches[i].index + featureMatches[i][0].length;
    const bodyEnd =
      i + 1 < featureMatches.length
        ? featureMatches[i + 1].index
        : clean.length;
    const bodyRaw = clean.substring(bodyStart, bodyEnd);
    const body = cleanBody(bodyRaw);

    if (body.trim().length < 5) continue;

    const level = detectLevel(bodyRaw);
    const { replaces, alters, modifies } = extractChanges(bodyRaw);

    features.push({
      name: fName,
      level,
      replaces,
      alters,
      modifies,
      body,
    });
  }

  // Extract intro text (between title and first feature/heading)
  // Strip parent line from clean first
  const noParent = clean.replace(/^parent:.+$/m, "");
  const introEnd =
    featureMatches.length > 0
      ? featureMatches[0].index
      : noParent.search(/\+\+ |\n----\n/);
  const introStart = noParent.indexOf("\n", noParent.indexOf("title:")) + 1;
  let intro = "";
  if (introEnd > introStart && introEnd > 0) {
    intro = cleanBody(
      noParent.substring(introStart, Math.min(introEnd, introStart + 3000)),
    );
  }

  return {
    slug: basename(filename, ".txt"),
    name,
    className:
      className || (parent && CLASS_FILENAMES.has(parent) ? parent : null),
    system: book === "spheres-of-might" ? "might" : "power",
    book,
    features,
    body: intro,
  };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderArchetypePage(parsed) {
  const id = kebab(parsed.name);
  const lines = [
    "---",
    `id: ${id}`,
    `name: "${parsed.name}"`,
    "type: archetype",
    `system: ${parsed.system}`,
    ...(parsed.className ? [`className: "${parsed.className}"`] : []),
    "tags: []",
    "---",
  ];
  return `${lines.join("\n")}\n\n${parsed.body.trim()}\n`;
}

function renderArchetypeFeature(parsed, feature) {
  const id = kebab(feature.name);
  const allChanges = [
    ...feature.replaces.map((r) => `"${r}"`),
    ...feature.alters.map((a) => `"${a}"`),
  ];
  const lines = [
    "---",
    `id: ${id}`,
    `name: "${feature.name}"`,
    "type: archetype-feature",
    `system: ${parsed.system}`,
    `archetypeId: ${kebab(parsed.name)}`,
    `level: ${feature.level}`,
    ...(feature.replaces.length > 0
      ? [`replaces: [${feature.replaces.map((r) => `"${r}"`).join(", ")}]`]
      : []),
    ...(feature.alters.length > 0
      ? [`alters: [${feature.alters.map((a) => `"${a}"`).join(", ")}]`]
      : []),
    `tags: []`,
    "---",
  ];
  return `${lines.join("\n")}\n\n${feature.body.trim()}\n`;
}

// ─── Write helper ─────────────────────────────────────────────────────────────

function writeFileIfNeeded(filepath, content, label, mode) {
  if (mode === "--dry-run") {
    console.log(`WOULD WRITE  ${label}`);
    console.log(content.substring(0, 200));
    console.log("---");
    return;
  }
  if (mode === "--write" && existsSync(filepath)) return;
  const dir = dirname(filepath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filepath, content, "utf-8");
  console.log(`WROTE  ${label}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const isMain =
  !!process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    realpathSync(process.argv[1]).replace(/\\/g, "/");

if (isMain) {
  const args = process.argv.slice(2);
  const MODE = args.filter((a) => a.startsWith("--")).pop() ?? "--dry-run";
  const batchMode = args.includes("--all");
  const slug = args.find((a) => !a.startsWith("-"));

  let files = [];
  if (batchMode) {
    files = readdirSync(join(ROOT, REPO))
      .filter((f) => f.endsWith(".txt"))
      .sort();
  } else if (slug) {
    const fname = slug.endsWith(".txt") ? slug : `${slug}.txt`;
    if (existsSync(join(ROOT, REPO, fname))) {
      files = [fname];
    } else {
      console.error(`File not found: ${fname}`);
      process.exit(1);
    }
  } else {
    console.error(
      "Usage: node scripts/archetype-parser.mjs <slug> [--dry-run|--write|--force]",
    );
    console.error(
      "       node scripts/archetype-parser.mjs --all [--dry-run|--write|--force]",
    );
    process.exit(1);
  }

  let totalArchetypes = 0;
  let totalFeatures = 0;

  for (const file of files) {
    const filepath = join(ROOT, REPO, file);
    const text = readFileSync(filepath, "utf-8");

    // Quick check: does this file have an archetype title?
    if (!/Archetype\)|Prestige Class\)/i.test(text)) continue;

    const parsed = parseArchetypeFile(text, file);
    if (!parsed.className) continue; // skip if we can't determine parent class

    // Write archetype page
    const archetypeContent = renderArchetypePage(parsed);
    const archetypeDir = join(CONTENT, parsed.book, "archetypes");
    const archetypePath = join(archetypeDir, `${kebab(parsed.name)}.md`);
    writeFileIfNeeded(
      archetypePath,
      archetypeContent,
      `${parsed.book}/archetypes/${kebab(parsed.name)}.md`,
      MODE,
    );
    totalArchetypes++;

    // Write archetype features
    if (parsed.features.length > 0) {
      const featureDir = join(CONTENT, parsed.book, "archetype-features");
      for (const feature of parsed.features) {
        const featureContent = renderArchetypeFeature(parsed, feature);
        const featurePath = join(featureDir, `${kebab(feature.name)}.md`);
        writeFileIfNeeded(
          featurePath,
          featureContent,
          `${parsed.book}/archetype-features/${kebab(feature.name)}.md`,
          MODE,
        );
        totalFeatures++;
      }
    }
  }

  if (MODE !== "--dry-run") {
    console.log(
      `\nGenerated ${totalArchetypes} archetypes, ${totalFeatures} features.`,
    );
  } else {
    console.log(
      `\nWould generate ~${totalArchetypes} archetypes, ~${totalFeatures} features.`,
    );
  }
}
