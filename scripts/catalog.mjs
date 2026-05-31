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

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";

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
  // Power classes — must have Casting section or stat block
  if (/^\+\+ Casting\b/m.test(content)) return true;
  if (/^\*\*(Casting Ability Modifier|Spell Pool|Caster Level)/m.test(content))
    return true;
  // Might classes — Combat Training is the key marker
  if (/^\+\+.*Combat Training/m.test(content)) return true;
  if (/^\*\*Practitioner Modifier/m.test(content)) return true;
  // Broad class section headers (color-annotated Wikidot format)
  if (/^\+\+.*\|(Class Features|Class Abilities)\|/m.test(content)) return true;
  // Must have Hit Die AND at least 2 other class-only stat fields
  const hasHitDie = /^\*\*Hit Die:\*\*/m.test(content);
  if (!hasHitDie) return false;
  const classOnlyFields = [
    /^\*\*Class Skills:\*\*/m,
    /^\*\*Skill Ranks Per Level:\*\*/m,
    /^\*\*Starting Wealth:\*\*/m,
    /^\*\*Starting Age:\*\*/m,
    /^\*\*Proficiencies:\*\*/m,
    /^\*\*Casting Ability Modifier/m,
    /^\*\*Spell Pool/m,
  ];
  let count = 0;
  for (const re of classOnlyFields) {
    if (re.test(content)) count++;
  }
  return count >= 2;
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

function hasClassFeatures(content) {
  return /^\+\+\+?\s*(Class Features|Path Abilities|Class Abilities)/m.test(
    content,
  );
}

// ─── Classification ───────────────────────────────────────────────────────────

function classifyFile(filename, content) {
  const name = filename.replace(/\.txt$/, "");
  const title = parseTitle(content);
  const parent = parseParent(content);

  const entry = {
    basename: name,
    filename,
    title,
    parent,
    type: "article", // default
    system: "power",
    book: null,
    cr: null,
    mr: null,
    sphereName: null,
  };

  // Parse CR/MR from filename or title
  const crMr =
    (title || "").match(/\(CR (\d+)\/MR (\d+)\)/) ||
    name.match(/cr-(\d+)-mr-(\d+)/);
  if (crMr) {
    entry.cr = parseInt(crMr[1]);
    entry.mr = parseInt(crMr[2]);
  }

  // ─── Determine system and book from parent ──────────────────────────

  if (parent && PARENT_MAP[parent]) {
    const pm = PARENT_MAP[parent];
    entry.system = pm.system;
    if (pm.book) entry.book = pm.book;
  } else if (parent && parent.startsWith("mythic-creatures-")) {
    entry.system = "mythic";
    entry.book = "mythic-rules";
  }

  // ─── Type classification ────────────────────────────────────────────

  // 1. Bestiary / creature entries
  if (
    entry.cr ||
    entry.mr ||
    (parent &&
      (parent === "creature-templates" ||
        parent === "templates" ||
        parent.startsWith("mythic-creatures-") ||
        parent === "mythos-bestiary" ||
        parent === "great-old-ones-outer-gods-and-elder-influences"))
  ) {
    entry.type = "creature";
    return entry;
  }

  // 2. Content under a sphere page (sub-pages like talents, feats, etc.)
  if (parent && KNOWN_SPHERES.has(parent)) {
    entry.sphereName = parent;
    // These are usually sub-feats or standalone pages under spheres
    if (isFeatContent(content)) {
      entry.type = "feat";
    } else {
      entry.type = "talent"; // could be a talent sub-page
    }
    if (!entry.book) entry.book = "spheres-of-power-core";
    return entry;
  }

  // 3. Top-level sphere definition pages (no parent, but in SPHERE list)
  const sphereId = SPHERE_FILENAME_MAP[name] || name;
  if (!parent && KNOWN_SPHERES.has(sphereId)) {
    entry.type = "sphere";
    entry.sphereName = sphereId;
    entry.system = POWER_SPHERES.has(sphereId)
      ? "power"
      : MIGHT_SPHERES.has(sphereId)
        ? "might"
        : "guile";
    if (!entry.book) {
      entry.book =
        entry.system === "might"
          ? "spheres-of-might"
          : entry.system === "guile"
            ? "spheres-of-guile"
            : "spheres-of-power-core";
    }
    return entry;
  }

  // 4. Top-level class definition pages
  if (CLASS_PAGES.has(name) && !parent) {
    if (isClassDefinition(content)) {
      entry.type = "class";
      if (!entry.book)
        entry.book =
          entry.system === "might"
            ? "spheres-of-might"
            : entry.system === "guile"
              ? "spheres-of-guile"
              : "spheres-of-power-core";
      return entry;
    }
    // Some class pages have minimal wiki formatting but are still classes
    if (
      /^\*\*Hit Die:\*\*/m.test(content) ||
      /^\*\*Role:\*\*/m.test(content) ||
      /^\+\+.*\|/m.test(content)
    ) {
      entry.type = "class";
      if (!entry.book)
        entry.book =
          entry.system === "might"
            ? "spheres-of-might"
            : "spheres-of-power-core";
      return entry;
    }
  }

  // 5. Class feature / archetype sub-pages (parent is a class name)
  if (parent && CLASS_PAGES.has(parent)) {
    if (title && title.includes("Archetype")) {
      entry.type = "archetype";
    } else {
      entry.type = "class-feature";
    }
    if (!entry.book)
      entry.book =
        entry.system === "might" ? "spheres-of-might" : "spheres-of-power-core";
    return entry;
  }

  // 6. Explicit archetype pages (title says "Archetype")
  if (title && title.includes("Archetype")) {
    entry.type = "archetype";
    if (!entry.book) entry.book = "spheres-of-power-core";
    return entry;
  }

  // 7. Explicit feat pages (parent is 'feats' or 'divine-talents')
  if (parent === "feats" || parent === "divine-talents") {
    entry.type = "feat";
    if (!entry.book) entry.book = "spheres-of-power-core";
    return entry;
  }

  // 8. Articles under mythic-rules, other-options, etc.
  if (
    parent === "mythic-rules" ||
    parent === "other-options" ||
    parent === "start" ||
    parent === "newsletters" ||
    parent === "diamond-recreational-studios" ||
    parent === "ultimate-engineering" ||
    parent === "alternate-racial-traits" ||
    parent === "arcforge" ||
    parent === "kingking" ||
    parent === "veil-list-and-descriptions"
  ) {
    entry.type = "article";
    if (!entry.book) entry.book = parent;
    return entry;
  }

  // 9. Content under 3rd-party system parents
  if (
    parent &&
    [
      "pact-magic",
      "strange-magic",
      "gonzo",
      "cthulhu-mythos",
      "heroes-of-the-jade-oath",
      "akashic-mysteries",
      "the-primordial-dancer",
      "scion-of-discordia",
    ].includes(parent)
  ) {
    // May be mixed types - use content analysis
    if (isClassDefinition(content)) entry.type = "class";
    else if (isFeatContent(content)) entry.type = "feat";
    else if (isCreatureContent(content)) entry.type = "creature";
    else if (title && title.includes("Archetype")) entry.type = "archetype";
    else entry.type = "article";
    if (!entry.book) entry.book = parent;
    return entry;
  }

  // 10. Spheres-of-Power/Might sub-content
  if (parent === "spheres-of-power") {
    if (isFeatContent(content) || title?.includes("Feat")) entry.type = "feat";
    else if (title?.includes("Archetype")) entry.type = "archetype";
    else if (isSphereDefinition(content)) entry.type = "sphere";
    else entry.type = "article";
    if (!entry.book) entry.book = "spheres-of-power-core";
    return entry;
  }

  if (parent === "spheres-of-might") {
    // Might sphere pages live under this parent in some Wikidot structures
    const mightSphereId = SPHERE_FILENAME_MAP[name] || name;
    if (MIGHT_SPHERES.has(mightSphereId) || isSphereDefinition(content)) {
      entry.type = "sphere";
      entry.sphereName = mightSphereId;
      entry.system = "might";
      entry.book = "spheres-of-might";
      return entry;
    }
    if (isFeatContent(content) || title?.includes("Feat")) entry.type = "feat";
    else if (title?.includes("Archetype")) entry.type = "archetype";
    else entry.type = "article";
    if (!entry.book) entry.book = "spheres-of-might";
    return entry;
  }

  // 11. Top-level hub/guide pages (no parent, known patterns)
  if (!parent) {
    if (isClassDefinition(content)) {
      entry.type = "class";
    } else if (isSphereDefinition(content)) {
      entry.type = "sphere";
    } else if (isCreatureContent(content)) {
      entry.type = "creature";
    } else if (isFeatContent(content)) {
      entry.type = "feat";
    } else {
      entry.type = "article";
    }

    // Assign book for top-level pages based on known patterns
    if (!entry.book) {
      if (MIGHT_SPHERES.has(name)) {
        entry.book = "spheres-of-might";
      } else if (name === "spheres-of-might") {
        entry.book = "spheres-of-might";
      } else if (name === "spheres-of-guile") {
        entry.book = "spheres-of-guile";
      } else {
        // Default most top-level pages to spheres-of-power-core
        entry.book = "spheres-of-power-core";
      }
    }
    return entry;
  }

  // 12. Fallback content analysis
  if (isCreatureContent(content)) {
    entry.type = "creature";
  } else if (isClassDefinition(content)) {
    entry.type = "class";
  } else if (isFeatContent(content)) {
    entry.type = "feat";
  } else {
    entry.type = "article";
  }

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
      } else if (entry.name.endsWith(".md") && depth >= 1) {
        // depth 0 = content/ root (ignore)
        // depth 1 = book directories (e.g. content/spheres-of-power-core/)
        const parts = full.split("/");
        const contentIdx = parts.indexOf("content");
        const book = parts[contentIdx + 1] || "(unknown)";
        counts[book] = (counts[book] || 0) + 1;
      }
    }
  }
  walk(CONTENT_DIR, 0);
  return counts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const showSummary = args.includes("--summary");
  const showMissing = args.includes("--missing");
  const bookFilter = args.includes("--book")
    ? args[args.indexOf("--book") + 1]
    : null;

  if (!existsSync(WIKIDOT_REPO)) {
    console.error(`Wikidot repo not found at: ${WIKIDOT_REPO}`);
    process.exit(1);
  }

  console.error("Reading source files...");
  const files = readdirSync(WIKIDOT_REPO)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  console.error(`Found ${files.length} .txt files`);

  console.error("Classifying...");
  const entries = [];
  for (const file of files) {
    const content = readFileSync(join(WIKIDOT_REPO, file), "utf-8");
    const entry = classifyFile(file, content);
    entries.push(entry);
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  const existingMdByBook = countExistingMdByBook();
  const totalExistingMd = Object.values(existingMdByBook).reduce(
    (a, b) => a + b,
    0,
  );

  const typeCounts = {};
  const systemCounts = {};
  const parentCounts = {};
  const bookCounts = {};
  const unmappedBooks = new Set();
  const unmappedSystemParents = new Set();

  for (const entry of entries) {
    typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    systemCounts[entry.system] = (systemCounts[entry.system] || 0) + 1;
    parentCounts[entry.parent || "(none)"] =
      (parentCounts[entry.parent || "(none)"] || 0) + 1;

    const book = entry.book || "(unmapped)";
    bookCounts[book] = (bookCounts[book] || 0) + 1;

    if (!entry.book) {
      if (entry.parent) unmappedSystemParents.add(entry.parent);
    }
  }

  // ─── Output ────────────────────────────────────────────────────────────

  const catalog = {
    generatedAt: new Date().toISOString(),
    sourceRepo: WIKIDOT_REPO,
    summary: {
      totalSourceFiles: entries.length,
      totalExistingMd: totalExistingMd,
      // "Migrated" here means: we have some .md content in the target book
      // It's a rough estimate; 1 source file can produce many .md files.
      booksWithContent: Object.keys(existingMdByBook).length,
      existingMdByBook,
      byType: Object.fromEntries(
        Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => [type, { total: count }]),
      ),
      bySystem: Object.fromEntries(
        Object.entries(systemCounts).sort((a, b) => b[1] - a[1]),
      ),
      byParent: Object.fromEntries(
        Object.entries(parentCounts).sort((a, b) => b[1] - a[1]),
      ),
      byBook: Object.fromEntries(
        Object.entries(bookCounts).sort((a, b) => b[1] - a[1]),
      ),
      unmappedParents: [...unmappedSystemParents].sort(),
    },
    entries: entries.filter((e) => {
      if (bookFilter) return e.book === bookFilter;
      if (showMissing) return !existingMdByBook[e.book];
      return true;
    }),
  };

  const outputPath = join(__dirname, "catalog.json");
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
  console.error(`\nCatalog written to: ${outputPath}`);

  if (showSummary) {
    console.log(`\n=== Catalog Summary ===`);
    console.log(`Source files (.txt):  ${entries.length}`);
    console.log(
      `Existing .md files:   ${totalExistingMd} in ${catalog.summary.booksWithContent} books`,
    );
    console.log(`\nBy Type:`);
    for (const [type, info] of Object.entries(catalog.summary.byType)) {
      console.log(`  ${type.padEnd(18)} ${String(info.total).padStart(4)}`);
    }
    console.log(`\nBy System:`);
    for (const [sys, count] of Object.entries(catalog.summary.bySystem)) {
      console.log(`  ${sys.padEnd(18)} ${String(count).padStart(4)}`);
    }
    console.log(`\nTop Books (source files → existing .md):`);
    const topBooks = Object.entries(catalog.summary.byBook).slice(0, 25);
    for (const [book, count] of topBooks) {
      const mdCount = existingMdByBook[book] || 0;
      console.log(
        `  ${book.padEnd(40)} ${String(count).padStart(4)} src → ${String(mdCount).padStart(4)} md`,
      );
    }
    console.log(`\nTop Parents:`);
    const topParents = Object.entries(catalog.summary.byParent).slice(0, 20);
    for (const [parent, count] of topParents) {
      console.log(`  ${parent.padEnd(35)} ${String(count).padStart(4)}`);
    }
    if (catalog.summary.unmappedParents.length > 0) {
      console.log(
        `\nUnmapped Parents (${catalog.summary.unmappedParents.length}):`,
      );
      console.log(`  ${catalog.summary.unmappedParents.join(", ")}`);
    }
  } else {
    console.log(JSON.stringify(catalog, null, 2));
  }
}

main();
