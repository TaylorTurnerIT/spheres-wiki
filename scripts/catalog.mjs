#!/usr/bin/env node
/**
 * Catalog all Wikidot source files — classify by content type and target book.
 *
 * This inventories the 1,830 source .txt files from the Wikidot dump and
 * classifies each into its appropriate book and entry type. It then cross-
 * references against the total number of existing .md files per book to
 * estimate migration progress.
 *
 * Usage:
 *   node scripts/catalog.mjs [--summary] [--missing] [--book <slug>]
 *
 * --summary  Print a compact report to stdout
 * --missing  Show only entries that appear unmigrated
 * --book X   Filter entries to a specific book slug
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WIKIDOT_REPO = join(
  ROOT,
  "..",
  "wdotcrawl",
  "spheresofpower-repo",
  "pages",
);
const CONTENT_DIR = join(ROOT, "src", "content");

// ─── Known Sphere Names ───────────────────────────────────────────────────────

const POWER_SPHERES = new Set([
  "alteration",
  "blood",
  "conjuration",
  "creation",
  "dark",
  "death",
  "destruction",
  "divination",
  "enhancement",
  "fallen-fey",
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

const MIGHT_SPHERES = new Set([
  "alchemy",
  "athletics",
  "barrage",
  "barroom",
  "beastmastery",
  "berserker",
  "boxing",
  "brute",
  "dual-wielding",
  "equipment-sphere",
  "fencing",
  "gladiator",
  "guardian",
  "lancer",
  "open-hand",
  "scout",
  "shield",
  "sniper",
  "trap",
  "warleader",
  "wrestling",
]);

// Guile spheres from Spheres of Guile
const GUILE_SPHERES = new Set([
  "espionage",
  "navigation",
  "performance",
  "wordplay",
]);

const KNOWN_SPHERES = new Set([
  ...POWER_SPHERES,
  ...MIGHT_SPHERES,
  ...GUILE_SPHERES,
]);

// Alternate sphere filenames (Wikidot page name → sphere id)
const SPHERE_FILENAME_MAP = {
  equipment: "equipment-sphere", // Might sphere, not the article
  "warleader-sphere": "warleader",
};

// ─── Class Page Names (top-level class definition pages) ──────────────────────

const CLASS_PAGES = new Set([
  // Spheres of Power classes
  "armorist",
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
  // Spheres of Might classes
  "armiger",
  "blacksmith",
  "commander",
  "conduit",
  "scholar",
  "sentinel",
  "striker",
  "technician",
  // Spheres of Guile classes
  "bravo",
  "courser",
  "dissident",
  "envoy",
  "guide",
  "reaper",
  // 3rd-party classes
  "prodigy",
  "truenamer",
  "mountebank",
  "naturalist",
  "ethermagus",
  "etherslinger",
  "runesmith",
  "magical-girl",
  "henshin-hero",
  "advisor",
  "scion-of-discordia",
  "the-primordial-dancer",
  "warrior-poet",
  "warpmaster",
  "atomic-adept",
  "architect",
  "battle-butler",
  "chessmaster-gonzo",
  "dragoon-class",
  "dynamic-warrior",
  "ethermancer",
  "henchling",
  "multiple-master",
  "necros",
  "onmyoji",
  "pactmaker",
  "phantom-thief",
  "raveler-class",
  "sparkle-princess",
  "theorist",
  "ungermaw",
  "volur",
  "biohacker",
  "acupuncturist",
  "antimage",
  "apastron",
  "arbiter",
  "artificer",
  "ascendant-mind",
  "avowed",
  "bastion-of-conviction",
  "herbalist",
  "knight-phantom",
  "librarian",
  "mystic",
  "paragon",
  "savant",
  "cartomancer",
  "dealer",
  "wildcard",
  "ravager",
  "bloodscarred",
  "agent",
  "allusionist",
]);

// ─── Parent → Book + System Mapping ──────────────────────────────────────────

const PARENT_MAP = {
  // Core Drop Dead Studios
  "spheres-of-power": { book: "spheres-of-power-core", system: "power" },
  "spheres-of-might": { book: "spheres-of-might", system: "might" },
  "spheres-of-guile": { book: "spheres-of-guile", system: "guile" },
  feats: { book: "spheres-of-power-core", system: "power" },
  "divine-talents": { book: "spheres-of-power-core", system: "power" },
  "utility-wild-talents": { book: "spheres-of-power-core", system: "power" },

  // 3rd-party systems
  "pact-magic": { book: "pact-magic", system: "pact-magic" },
  "strange-magic": { book: "strange-magic", system: "strange-magic" },
  "cthulhu-mythos": { book: "cthulhu-mythos", system: "cthulhu-mythos" },
  gonzo: { book: "gonzo", system: "gonzo" },
  "heroes-of-the-jade-oath": {
    book: "heroes-of-the-jade-oath",
    system: "jade-oath",
  },
  "akashic-mysteries": {
    book: "akashic-mysteries",
    system: "akashic-mysteries",
  },
  "the-primordial-dancer": { book: "the-primordial-dancer", system: "gonzo" },
  "scion-of-discordia": { book: "scion-of-discordia", system: "gonzo" },

  // Mythic (all mythic content grouped under one system/book)
  "mythic-rules": { book: "mythic-rules", system: "mythic" },
  "creature-templates": { book: "mythic-rules", system: "mythic" },
  templates: { book: "mythic-rules", system: "mythic" },
  "mythos-bestiary": { book: "mythic-rules", system: "mythic" },
  "great-old-ones-outer-gods-and-elder-influences": {
    book: "mythic-rules",
    system: "mythic",
  },

  // Other/Supplemental
  "other-options": { book: "other-options", system: "power" },
  "diamond-recreational-studios": {
    book: "diamond-spheres-thaumic-potential",
    system: "power",
  },
  "ultimate-engineering": { book: "ultimate-engineering", system: "power" },
  start: { book: "spheres-of-power-core", system: "power" }, // hub pages
  arcforge: { book: "arcforge", system: "power" },
  kingking: { book: "kingking", system: "power" },
  newsletters: { book: "newsletters", system: "power" },
  "veil-list-and-descriptions": {
    book: "akashic-mysteries",
    system: "akashic-mysteries",
  },
  "alternate-racial-traits": {
    book: "alternate-racial-traits",
    system: "power",
  },
};

// Build parent → system lookup for mythic creature alphabetized parents
for (let i = 97; i <= 122; i++) {
  const letter = String.fromCharCode(i);
  const key = `mythic-creatures-${letter}`;
  if (!PARENT_MAP[key]) {
    PARENT_MAP[key] = { book: "mythic-rules", system: "mythic" };
  }
}

// ─── Content-based Classification Helpers ─────────────────────────────────────

function parseTitle(content) {
  const m = content.match(/^title:(.+)$/m);
  return m ? m[1].trim() : null;
}

function parseParent(content) {
  const m = content.match(/^parent:(.+)$/m);
  return m ? m[1].trim() : null;
}

function isClassDefinition(content) {
  const classMarkers = [
    /^\+\+ Casting\b/m,
    /^\*\*(Casting Ability Modifier|Spell Pool|Caster Level)/m,
    /^\+\+.*Combat Training/m,
    /^\*\*Practitioner Modifier/m,
    /^\+\+.*\|(Class Features|Class Abilities)\|/m,
  ];
  if (classMarkers.some((re) => re.test(content))) {
    return true;
  }

  // Must have Hit Die AND at least 2 other class-only stat fields
  if (!/^\*\*Hit Die:\*\*/m.test(content)) return false;
  const classOnlyFields = [
    /^\*\*Class Skills:\*\*/m,
    /^\*\*Skill Ranks Per Level:\*\*/m,
    /^\*\*Starting Wealth:\*\*/m,
    /^\*\*Starting Age:\*\*/m,
    /^\*\*Proficiencies:\*\*/m,
    /^\*\*Casting Ability Modifier/m,
    /^\*\*Spell Pool/m,
  ];
  return classOnlyFields.filter((re) => re.test(content)).length >= 2;
}

function isSphereDefinition(content) {
  return /^\+\++\s*(Basic Talents|Base Abilities|Basic Abilities|Advanced Talents|Legendary Talents)/m.test(
    content,
  );
}

function isFeatContent(content) {
  return (
    /\(Combat\)|\(Metamagic\)|\(Item Creation\)|\(Psionic\)/.test(
      content.substring(0, 800),
    ) ||
    /^\*\*Prerequisites?:/m.test(content) ||
    /^\+\+\+?\s*\[.*?\]\s*\(feat\)/m.test(content)
  );
}

function isCreatureContent(content) {
  return (
    /CR \d+/i.test(content.substring(0, 500)) ||
    /^\*\*[A-Z][a-z]+ Subtype:?/m.test(content) ||
    /^\*\*Creating a .+ [Cc]reature\*\*/m.test(content)
  );
}

const CREATURE_PARENTS = new Set([
  "creature-templates",
  "templates",
  "mythos-bestiary",
  "great-old-ones-outer-gods-and-elder-influences",
]);

const ARTICLE_PARENTS = new Set([
  "mythic-rules",
  "other-options",
  "start",
  "newsletters",
  "diamond-recreational-studios",
  "ultimate-engineering",
  "alternate-racial-traits",
  "arcforge",
  "kingking",
  "veil-list-and-descriptions",
]);

const THIRD_PARTY_PARENTS = new Set([
  "pact-magic",
  "strange-magic",
  "gonzo",
  "cthulhu-mythos",
  "heroes-of-the-jade-oath",
  "akashic-mysteries",
  "the-primordial-dancer",
  "scion-of-discordia",
]);

// ─── Classification ───────────────────────────────────────────────────────────

function defaultBookForSystem(system, includeGuile = true) {
  if (system === "might") return "spheres-of-might";
  if (includeGuile && system === "guile") return "spheres-of-guile";
  return "spheres-of-power-core";
}

function setDefaultBook(entry, book) {
  if (!entry.book) entry.book = book;
}

function getParentMetadata(parent) {
  if (!parent) return null;
  if (PARENT_MAP[parent]) return PARENT_MAP[parent];
  return parent.startsWith("mythic-creatures-")
    ? { system: "mythic", book: "mythic-rules" }
    : null;
}

function assignParentMetadata(entry) {
  const pm = getParentMetadata(entry.parent);
  if (!pm) return;
  entry.system = pm.system;
  if (pm.book) entry.book = pm.book;
}

function assignCrMr(entry) {
  const crMr =
    (entry.title || "").match(/\(CR (\d+)\/MR (\d+)\)/) ||
    entry.basename.match(/cr-(\d+)-mr-(\d+)/);
  if (!crMr) return;
  entry.cr = parseInt(crMr[1], 10);
  entry.mr = parseInt(crMr[2], 10);
}

const MIXED_CONTENT_TYPE_TESTS = [
  ["class", (_entry, content) => isClassDefinition(content)],
  ["feat", (_entry, content) => isFeatContent(content)],
  ["creature", (_entry, content) => isCreatureContent(content)],
  ["archetype", (entry) => entry.title?.includes("Archetype")],
];

const POWER_MIGHT_SUBTYPE_TESTS = [
  [
    "feat",
    (entry, content) => isFeatContent(content) || entry.title?.includes("Feat"),
  ],
  ["archetype", (entry) => entry.title?.includes("Archetype")],
  ["sphere", (_entry, content) => isSphereDefinition(content)],
];

function firstMatchingType(tests, entry, content) {
  return tests.find(([, matches]) => matches(entry, content))?.[0] ?? "article";
}

function assignMixedContentType(entry, content) {
  entry.type = firstMatchingType(MIXED_CONTENT_TYPE_TESTS, entry, content);
}

function assignPowerOrMightSubtype(entry, content, book) {
  entry.type = firstMatchingType(POWER_MIGHT_SUBTYPE_TESTS, entry, content);
  setDefaultBook(entry, book);
}

function isCreatureEntry(entry) {
  return Boolean(
    entry.cr ||
      entry.mr ||
      CREATURE_PARENTS.has(entry.parent) ||
      entry.parent?.startsWith("mythic-creatures-"),
  );
}

function classifyCreature(entry) {
  if (!isCreatureEntry(entry)) return false;
  entry.type = "creature";
  return true;
}

function classifySphereChild(entry, content) {
  if (!entry.parent || !KNOWN_SPHERES.has(entry.parent)) return false;
  entry.sphereName = entry.parent;
  entry.type = isFeatContent(content) ? "feat" : "talent";
  setDefaultBook(entry, "spheres-of-power-core");
  return true;
}

function topLevelSphereSystem(sphereId) {
  if (POWER_SPHERES.has(sphereId)) return "power";
  return MIGHT_SPHERES.has(sphereId) ? "might" : "guile";
}

function topLevelSphereId(entry) {
  if (entry.parent) return null;
  const sphereId = SPHERE_FILENAME_MAP[entry.basename] || entry.basename;
  return KNOWN_SPHERES.has(sphereId) ? sphereId : null;
}

function classifyTopLevelSphere(entry) {
  const sphereId = topLevelSphereId(entry);
  if (!sphereId) return false;
  entry.type = "sphere";
  entry.sphereName = sphereId;
  entry.system = topLevelSphereSystem(sphereId);
  setDefaultBook(entry, defaultBookForSystem(entry.system));
  return true;
}

function isTopLevelClassPage(entry) {
  return CLASS_PAGES.has(entry.basename) && !entry.parent;
}

function hasMinimalClassFormatting(content) {
  return [/^\*\*Hit Die:\*\*/m, /^\*\*Role:\*\*/m, /^\+\+.*\|/m].some((re) =>
    re.test(content),
  );
}

function assignTopLevelClass(entry, includeGuile) {
  entry.type = "class";
  setDefaultBook(entry, defaultBookForSystem(entry.system, includeGuile));
  return true;
}

function classifyTopLevelClass(entry, content) {
  if (!isTopLevelClassPage(entry)) return false;
  if (isClassDefinition(content)) {
    return assignTopLevelClass(entry, true);
  }
  return hasMinimalClassFormatting(content)
    ? assignTopLevelClass(entry, false)
    : false;
}

function isClassChild(entry) {
  return Boolean(entry.parent && CLASS_PAGES.has(entry.parent));
}

function classChildType(title) {
  return title?.includes("Archetype") ? "archetype" : "class-feature";
}

function classChildBook(system) {
  return system === "might" ? "spheres-of-might" : "spheres-of-power-core";
}

function classifyClassChild(entry) {
  if (!isClassChild(entry)) return false;
  entry.type = classChildType(entry.title);
  setDefaultBook(entry, classChildBook(entry.system));
  return true;
}

function classifyExplicitArchetype(entry) {
  if (!entry.title?.includes("Archetype")) return false;
  entry.type = "archetype";
  setDefaultBook(entry, "spheres-of-power-core");
  return true;
}

function classifyExplicitFeat(entry) {
  if (entry.parent !== "feats" && entry.parent !== "divine-talents")
    return false;
  entry.type = "feat";
  setDefaultBook(entry, "spheres-of-power-core");
  return true;
}

function classifyArticleParent(entry) {
  if (!ARTICLE_PARENTS.has(entry.parent)) return false;
  entry.type = "article";
  setDefaultBook(entry, entry.parent);
  return true;
}

function classifyThirdPartyParent(entry, content) {
  if (!THIRD_PARTY_PARENTS.has(entry.parent)) return false;
  assignMixedContentType(entry, content);
  setDefaultBook(entry, entry.parent);
  return true;
}

function classifySpheresOfPowerParent(entry, content) {
  if (entry.parent !== "spheres-of-power") return false;
  assignPowerOrMightSubtype(entry, content, "spheres-of-power-core");
  return true;
}

function isMightSpherePage(content, mightSphereId) {
  return MIGHT_SPHERES.has(mightSphereId) || isSphereDefinition(content);
}

function assignMightSphere(entry, mightSphereId) {
  entry.type = "sphere";
  entry.sphereName = mightSphereId;
  entry.system = "might";
  entry.book = "spheres-of-might";
}

function classifySpheresOfMightParent(entry, content) {
  if (entry.parent !== "spheres-of-might") return false;
  const mightSphereId = SPHERE_FILENAME_MAP[entry.basename] || entry.basename;
  if (isMightSpherePage(content, mightSphereId)) {
    assignMightSphere(entry, mightSphereId);
  } else {
    assignPowerOrMightSubtype(entry, content, "spheres-of-might");
  }
  return true;
}

const TOP_LEVEL_TYPE_TESTS = [
  ["class", (_entry, content) => isClassDefinition(content)],
  ["sphere", (_entry, content) => isSphereDefinition(content)],
  ["creature", (_entry, content) => isCreatureContent(content)],
  ["feat", (_entry, content) => isFeatContent(content)],
];

function topLevelBook(entry) {
  if (MIGHT_SPHERES.has(entry.basename)) return "spheres-of-might";
  if (entry.basename === "spheres-of-might") return "spheres-of-might";
  return entry.basename === "spheres-of-guile"
    ? "spheres-of-guile"
    : "spheres-of-power-core";
}

function classifyTopLevel(entry, content) {
  if (entry.parent) return false;
  entry.type = firstMatchingType(TOP_LEVEL_TYPE_TESTS, entry, content);
  setDefaultBook(entry, topLevelBook(entry));
  return true;
}

function classifyFallback(entry, content) {
  if (isCreatureContent(content)) entry.type = "creature";
  else if (isClassDefinition(content)) entry.type = "class";
  else if (isFeatContent(content)) entry.type = "feat";
  else entry.type = "article";
  return true;
}

const CLASSIFIERS = [
  classifyCreature,
  classifySphereChild,
  classifyTopLevelSphere,
  classifyTopLevelClass,
  classifyClassChild,
  classifyExplicitArchetype,
  classifyExplicitFeat,
  classifyArticleParent,
  classifyThirdPartyParent,
  classifySpheresOfPowerParent,
  classifySpheresOfMightParent,
  classifyTopLevel,
  classifyFallback,
];

function classifyFile(filename, content) {
  const name = filename.replace(/\.txt$/, "");
  const entry = {
    basename: name,
    filename,
    title: parseTitle(content),
    parent: parseParent(content),
    type: "article",
    system: "power",
    book: null,
    cr: null,
    mr: null,
    sphereName: null,
  };

  assignCrMr(entry);
  assignParentMetadata(entry);
  CLASSIFIERS.find((classify) => classify(entry, content));
  return entry;
}

// ─── Existing content counting ────────────────────────────────────────────────

function countExistingMdByBook() {
  const counts = {};
  if (!existsSync(CONTENT_DIR)) return counts;

  function walk(dir, depth) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      countMarkdownFile(counts, full, entry.name, depth);
    }
  }
  walk(CONTENT_DIR, 0);
  return counts;
}

function countMarkdownFile(counts, full, filename, depth) {
  if (!shouldCountMarkdown(filename, depth)) return;
  const parts = full.split("/");
  const contentIdx = parts.indexOf("content");
  const book = parts[contentIdx + 1] || "(unknown)";
  counts[book] = (counts[book] || 0) + 1;
}

function shouldCountMarkdown(filename, depth) {
  return filename.endsWith(".md") && depth >= 1;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function parseCatalogArgs(args) {
  const bookArgIndex = args.indexOf("--book");
  return {
    showSummary: args.includes("--summary"),
    showMissing: args.includes("--missing"),
    bookFilter: bookArgIndex === -1 ? null : args[bookArgIndex + 1],
  };
}

function readSourceEntries() {
  console.error("Reading source files...");
  const files = readdirSync(WIKIDOT_REPO)
    .filter((f) => f.endsWith(".txt"))
    .sort();
  console.error(`Found ${files.length} .txt files`);
  console.error("Classifying...");
  return files.map((file) => {
    const content = readFileSync(join(WIKIDOT_REPO, file), "utf-8");
    return classifyFile(file, content);
  });
}

function incrementCount(counts, key) {
  counts[key] = (counts[key] || 0) + 1;
}

function sortedEntriesObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

function emptyStats() {
  return {
    typeCounts: {},
    systemCounts: {},
    parentCounts: {},
    bookCounts: {},
    unmappedSystemParents: new Set(),
  };
}

function recordStatsEntry(stats, entry) {
  incrementCount(stats.typeCounts, entry.type);
  incrementCount(stats.systemCounts, entry.system);
  incrementCount(stats.parentCounts, entry.parent || "(none)");
  incrementCount(stats.bookCounts, entry.book || "(unmapped)");
  recordUnmappedParent(stats, entry);
}

function recordUnmappedParent(stats, entry) {
  if (entry.book || !entry.parent) return;
  stats.unmappedSystemParents.add(entry.parent);
}

function totalCount(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function buildStats(entries, existingMdByBook) {
  const stats = emptyStats();
  for (const entry of entries) recordStatsEntry(stats, entry);
  return { ...stats, totalExistingMd: totalCount(existingMdByBook) };
}

function shouldIncludeEntry(entry, options, existingMdByBook) {
  if (options.bookFilter) return entry.book === options.bookFilter;
  if (options.showMissing) return !existingMdByBook[entry.book];
  return true;
}

function buildCatalog(entries, existingMdByBook, stats, options) {
  return {
    generatedAt: new Date().toISOString(),
    sourceRepo: WIKIDOT_REPO,
    summary: {
      totalSourceFiles: entries.length,
      totalExistingMd: stats.totalExistingMd,
      // "Migrated" here means: we have some .md content in the target book
      // It's a rough estimate; 1 source file can produce many .md files.
      booksWithContent: Object.keys(existingMdByBook).length,
      existingMdByBook,
      byType: Object.fromEntries(
        Object.entries(stats.typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => [type, { total: count }]),
      ),
      bySystem: sortedEntriesObject(stats.systemCounts),
      byParent: sortedEntriesObject(stats.parentCounts),
      byBook: sortedEntriesObject(stats.bookCounts),
      unmappedParents: [...stats.unmappedSystemParents].sort(),
    },
    entries: entries.filter((entry) =>
      shouldIncludeEntry(entry, options, existingMdByBook),
    ),
  };
}

function writeCatalog(catalog) {
  const outputPath = join(__dirname, "catalog.json");
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
  console.error(`\nCatalog written to: ${outputPath}`);
}

function printCountSection(title, entries, labelWidth, valueMapper = (v) => v) {
  console.log(`\n${title}:`);
  for (const [label, value] of entries) {
    console.log(
      `  ${label.padEnd(labelWidth)} ${String(valueMapper(value)).padStart(4)}`,
    );
  }
}

function printTopBooks(catalog, existingMdByBook) {
  console.log(`\nTop Books (source files → existing .md):`);
  for (const [book, count] of Object.entries(catalog.summary.byBook).slice(
    0,
    25,
  )) {
    const mdCount = existingMdByBook[book] || 0;
    console.log(
      `  ${book.padEnd(40)} ${String(count).padStart(4)} src → ${String(mdCount).padStart(4)} md`,
    );
  }
}

function printUnmappedParents(unmappedParents) {
  if (unmappedParents.length === 0) return;
  console.log(`\nUnmapped Parents (${unmappedParents.length}):`);
  console.log(`  ${unmappedParents.join(", ")}`);
}

function printCatalogSummary(catalog, existingMdByBook) {
  console.log(`\n=== Catalog Summary ===`);
  console.log(`Source files (.txt):  ${catalog.summary.totalSourceFiles}`);
  console.log(
    `Existing .md files:   ${catalog.summary.totalExistingMd} in ${catalog.summary.booksWithContent} books`,
  );
  printCountSection(
    "By Type",
    Object.entries(catalog.summary.byType),
    18,
    (info) => info.total,
  );
  printCountSection("By System", Object.entries(catalog.summary.bySystem), 18);
  printTopBooks(catalog, existingMdByBook);
  printCountSection(
    "Top Parents",
    Object.entries(catalog.summary.byParent).slice(0, 20),
    35,
  );
  printUnmappedParents(catalog.summary.unmappedParents);
}

function ensureWikidotRepo() {
  if (existsSync(WIKIDOT_REPO)) return;
  console.error(`Wikidot repo not found at: ${WIKIDOT_REPO}`);
  process.exit(1);
}

function main() {
  const options = parseCatalogArgs(process.argv.slice(2));
  ensureWikidotRepo();
  const entries = readSourceEntries();
  const existingMdByBook = countExistingMdByBook();
  const stats = buildStats(entries, existingMdByBook);
  const catalog = buildCatalog(entries, existingMdByBook, stats, options);
  writeCatalog(catalog);
  if (options.showSummary) printCatalogSummary(catalog, existingMdByBook);
  else console.log(JSON.stringify(catalog, null, 2));
}

main();
