import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { cleanBody, normalizeQuotes } from "./wikidot-markup.mjs";
import { kebab } from "./render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARCHIVE_DIR = path.resolve(
  __dirname,
  "../../../spheresofpower-wikidot-archive/pages",
);
export const CONTENT_DIR = path.resolve(__dirname, "../../src/content");

export const FEAT_CATEGORY_SOURCE_MANIFEST = [
  { tagId: "admixture", contentSystem: "power", tagSystem: "power", sourceFile: "admixture-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "anathema", contentSystem: "power", tagSystem: "power", sourceFile: "anathema-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  {
    tagId: "champion",
    contentSystem: "power",
    contentSystems: ["power", "might", "guile", "champions"],
    tagSystem: "champions",
    sourceFile: "champion-feats.txt",
    featHeadingLevel: 4,
    defaultBookSlug: "champions-of-the-spheres",
  },
  { tagId: "chance", contentSystem: "power", tagSystem: "power", sourceFile: "chance-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "channeling", contentSystem: "power", tagSystem: "power", sourceFile: "channeling-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "combat", contentSystem: "power", tagSystem: "power", sourceFile: "combat-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "companion", contentSystem: "power", tagSystem: "power", sourceFile: "companion-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "counterspell", contentSystem: "power", tagSystem: "power", sourceFile: "counterspell-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "drawback", contentSystem: "power", tagSystem: "power", sourceFile: "drawback-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "extra", contentSystem: "power", tagSystem: "power", sourceFile: "extra-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  {
    tagId: "general",
    contentSystem: "power",
    tagSystem: "power",
    sourceFile: "general-feats.txt",
    tab: "Ultimate",
    featHeadingLevel: 3,
    defaultBookSlug: "ultimate-spheres-of-power",
  },
  { tagId: "item-creation", contentSystem: "power", tagSystem: "power", sourceFile: "item-creation-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  {
    tagId: "mythic",
    contentSystem: "power",
    tagSystem: undefined,
    sourceFile: "mythic-spheres-3.txt",
    tab: "Mythic Feats",
    sectionHeading: "+ Mythic Feats",
    featHeadingLevel: 4,
    defaultBookSlug: "mythic-spheres-3",
  },
  { tagId: "metamagic", contentSystem: "power", tagSystem: "power", sourceFile: "metamagic-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "necrosis", contentSystem: "power", tagSystem: "power", sourceFile: "necrosis-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "operative", contentSystem: "guile", tagSystem: "guile", sourceFile: "operative-feats.txt", tab: "Spheres of Guile", featHeadingLevel: 4, defaultBookSlug: "spheres-of-guile" },
  { tagId: "practitioner", contentSystem: "might", tagSystem: "might", sourceFile: "practitioner-feats.txt", featHeadingLevel: 4, defaultBookSlug: "spheres-of-might" },
  { tagId: "protokinesis", contentSystem: "power", tagSystem: "power", sourceFile: "protokinesis-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "proxy", contentSystem: "power", tagSystem: "power", sourceFile: "proxy-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "racial", contentSystem: "power", tagSystem: "power", sourceFile: "racial-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "ritual", contentSystem: "power", tagSystem: "power", sourceFile: "ritual-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  {
    tagId: "ante",
    contentSystem: "power",
    tagSystem: "power",
    sourceFile: "card-and-deck-feats.txt",
    sectionHeading: "+++ Ante Feats",
    featHeadingLevel: 4,
    defaultBookSlug: "expanded-spheres-cardcasters-gamble",
  },
  {
    tagId: "deck",
    contentSystem: "power",
    tagSystem: "power",
    sourceFile: "card-and-deck-feats.txt",
    sectionHeading: "+++ Deck Feats",
    featHeadingLevel: 4,
    defaultBookSlug: "expanded-spheres-cardcasters-gamble",
  },
  {
    tagId: "saga",
    contentSystem: "power",
    tagSystem: "power",
    sourceFile: "card-and-deck-feats.txt",
    sectionHeading: "+++ Saga Feats",
    featHeadingLevel: 4,
    defaultBookSlug: "expanded-spheres-cardcasters-gamble",
  },
  { tagId: "squadron", contentSystem: "power", tagSystem: "power", sourceFile: "squadron-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "surreal", contentSystem: "power", tagSystem: "power", sourceFile: "surreal-feats.txt", tab: "Ultimate", featHeadingLevel: 3, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "teamwork", contentSystem: "power", tagSystem: "power", sourceFile: "teamwork-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
  { tagId: "wild-magic", contentSystem: "power", tagSystem: "power", sourceFile: "wild-magic-feats.txt", featHeadingLevel: 4, defaultBookSlug: "ultimate-spheres-of-power" },
];

const STRUCTURAL_MARKERS = new Set(["combat", "dual sphere"]);
const SOURCE_KEY_TO_SLUG = {
  "Alienist HB": "alienists-handbook",
  Apoc: null,
  BaP: "blood-and-portents",
  BTH: "beast-tamers-handbook",
  "Cata. HB": "cataclysm-handbook",
  "Catgirl HB": "catgirl-handbook",
  Core: "pathfinder-core-rulebook",
  CrimDan: "crimson-dancers-handbook",
  DbH: "diabolists-handbook",
  DRS: null,
  "Gravecaller's HB": "gravecallers-handbook",
  HMH: "high-magic-handbook",
  "High. HB": "highlanders-handbook",
  "Jester's HB": "jesters-handbook",
  LG: "arcforge-players-compendium",
  LotS: "legends-of-the-spheres",
  "Mana HB": "initiates-handbook",
  Plan: null,
  "S&P": "champions-of-the-spheres-study-and-practice",
  "SM—": null,
  Warden: "the-warden",
  "Youxia HB": "youxia-handbook",
  Origin: "spheres-of-origin",
  "3PP": null,
};

const EXPECTED_FEAT_OVERRIDES = {
  "champions-of-the-spheres-study-and-practice:improved-assistance": {
    system: "champions",
    homeCategory: "champion",
  },
  "champions-of-the-spheres-study-and-practice:ready-initiation": {
    system: "champions",
    homeCategory: "champion",
  },
  "legends-of-the-spheres:eldritch-supplies": {
    system: "guile",
    homeCategory: "champion",
    sphere: "faction",
  },
  "legends-of-the-spheres:insinuating-incantation": {
    system: "guile",
    homeCategory: "champion",
    sphere: "bluster",
  },
  "spheres-of-origin:rigorous-student": {
    system: "might",
    homeCategory: "practitioner",
  },
  "spheres-of-origin:versed-student": {
    system: "might",
    homeCategory: "practitioner",
  },
};

function normalizeMarker(value) {
  return value.toLowerCase().replace(/[\s-]+/g, " ").trim();
}

function readFileLines(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").split("\n");
}

function sliceTab(lines, tabName) {
  const start = lines.findIndex(
    (line) => line.trim() === `[[tab ${tabName}]]`,
  );
  if (start === -1) {
    throw new Error(`Could not find tab "${tabName}" in source page.`);
  }

  const end = lines.findIndex(
    (line, index) => index > start && line.trim() === "[[/tab]]",
  );
  return lines.slice(start + 1, end === -1 ? lines.length : end);
}

// fallow-ignore-next-line complexity
function sliceSection(lines, sectionHeading) {
  const start = lines.findIndex((line) => line.trim() === sectionHeading.trim());
  if (start === -1) {
    throw new Error(`Could not find section heading "${sectionHeading}".`);
  }

  const levelMatch = sectionHeading.trim().match(/^(\++)\s+/);
  if (!levelMatch) {
    throw new Error(`Invalid section heading "${sectionHeading}".`);
  }
  const sectionLevel = levelMatch[1].length;
  const stopPattern = new RegExp(`^\\+{${sectionLevel}}\\s+`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (stopPattern.test(lines[index].trim())) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end);
}

function parseSourceFeatHeading(line) {
  return parseSourceFeatHeadingWithTags(line, new Set());
}

export function loadAllTagIds() {
  return new Set(
    walkMarkdownFiles(CONTENT_DIR)
      .map((filePath) => readFrontmatter(filePath))
      .filter((frontmatter) => frontmatter?.id && frontmatter?.label)
      .map((frontmatter) => frontmatter.id),
  );
}

// Repository-wide content scan over mixed book metadata layouts.
// fallow-ignore-next-line complexity
export function loadBookMetaMap() {
  const meta = new Map();
  for (const filePath of walkMarkdownFiles(CONTENT_DIR)) {
    if (!filePath.endsWith("_book.yaml") && path.basename(filePath) !== "_book.yaml") {
      continue;
    }
  }
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const yamlPath = path.join(CONTENT_DIR, entry.name, "_book.yaml");
    if (!fs.existsSync(yamlPath)) continue;
    meta.set(entry.name, parseYaml(fs.readFileSync(yamlPath, "utf8")) ?? {});
  }
  return meta;
}

function loadKnownSphereIds() {
  const sphereIds = new Set();
  for (const filePath of walkMarkdownFiles(CONTENT_DIR)) {
    const relativePath = path.relative(CONTENT_DIR, filePath).split(path.sep);
    if (relativePath[2] === "spheres" && relativePath.length >= 5) {
      sphereIds.add(relativePath[3]);
    }
  }
  return sphereIds;
}

// Repository-wide sphere scan over mixed content layouts.
// fallow-ignore-next-line complexity
export function loadSphereSystemMap() {
  const systems = new Map();
  for (const filePath of walkMarkdownFiles(CONTENT_DIR)) {
    const relativePath = path.relative(CONTENT_DIR, filePath).split(path.sep);
    if (relativePath[2] !== "spheres" || relativePath.length < 5) continue;
    const sphereId = relativePath[3];
    const system = relativePath[1];
    if (!systems.has(sphereId)) {
      systems.set(sphereId, new Set());
    }
    systems.get(sphereId).add(system);
  }
  return systems;
}

export function loadBookSystemMap() {
  const systems = new Map();
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const systemDirs = fs
      .readdirSync(path.join(CONTENT_DIR, entry.name), { withFileTypes: true })
      .filter((child) => child.isDirectory())
      .map((child) => child.name)
      .filter((name) => ["power", "might", "guile", "champions", "tags", "articles"].includes(name));
    systems.set(
      entry.name,
      systemDirs.filter((name) =>
        ["power", "might", "guile", "champions"].includes(name),
      ),
    );
  }
  return systems;
}

// Wikidot feat headings mix source keys and category tags in one line.
// fallow-ignore-next-line complexity
function parseSourceFeatHeadingWithTags(line, knownTagIds) {
  let head = line.replace(/^\++\s+/, "").trim();
  head = head.replace(/##[^|#]+\|([^#]+)##/g, "$1");

  let sourceKey = null;
  const tags = [];
  let isDualSphere = false;

  for (const match of head.matchAll(/\[([^\]]+)\]/g)) {
    const marker = match[1].trim();
    const normalized = normalizeMarker(marker);
    const tagId = kebab(normalized);
    if (normalized === "dual sphere") {
      isDualSphere = true;
    } else if (knownTagIds.has(tagId)) {
      if (!tags.includes(tagId)) tags.push(tagId);
    } else if (!STRUCTURAL_MARKERS.has(normalized)) {
      sourceKey = marker;
    }
  }
  head = head.replace(/\s*\[[^\]]+\]/g, "").trim();

  for (const match of head.matchAll(/\(([^)]+)\)/g)) {
    for (const part of match[1].split(",")) {
      const normalized = normalizeMarker(part);
      const tagId = kebab(normalized);
      if (normalized === "dual sphere") {
        isDualSphere = true;
      } else if (knownTagIds.has(tagId)) {
        if (!tags.includes(tagId)) tags.push(tagId);
      }
    }
  }
  head = head.replace(/\s*\([^)]+\)/g, "").trim();
  head = head.replace(/\s+/g, " ").trim();

  return {
    name: normalizeQuotes(head),
    id: kebab(head),
    sourceKey,
    tags,
    isDualSphere,
  };
}

function extractRulesBody(lines, featHeadingLevel) {
  const featPattern = new RegExp(`^\\+{${featHeadingLevel}}\\s+`);
  const firstFeatIndex = lines.findIndex((line) => featPattern.test(line.trim()));
  return (firstFeatIndex === -1 ? lines : lines.slice(0, firstFeatIndex))
    .join("\n")
    .trim();
}

function extractExpectedEntries(lines, featHeadingLevel) {
  const featPattern = new RegExp(`^\\+{${featHeadingLevel}}\\s+`);
  return lines
    .filter((line) => featPattern.test(line.trim()))
    .map((line) => parseSourceFeatHeading(line.trim()));
}

// fallow-ignore-next-line complexity
function extractExpectedEntriesWithBodies(lines, featHeadingLevel, pageTagId, knownTagIds) {
  const featPattern = new RegExp(`^\\+{${featHeadingLevel}}\\s+`);
  const entries = [];

  for (let index = 0; index < lines.length; index++) {
    if (!featPattern.test(lines[index].trim())) continue;

    let end = index + 1;
    while (end < lines.length && !featPattern.test(lines[end].trim())) end++;

    const parsed = parseSourceFeatHeadingWithTags(lines[index].trim(), knownTagIds);
    const tags = [...new Set([pageTagId, ...parsed.tags])].sort();
    entries.push({
      ...parsed,
      tags,
      rawBody: lines.slice(index + 1, end).join("\n").trim(),
      headingLine: lines[index].trim(),
    });

    index = end - 1;
  }

  return entries;
}

export function renderExpectedEntryBody(entry) {
  return cleanBody(entry.rawBody ?? "");
}

// Source pages vary by tabs, sections, and heading depth.
// fallow-ignore-next-line complexity
function getFeatCategorySource(tagId) {
  const spec = FEAT_CATEGORY_SOURCE_MANIFEST.find((entry) => entry.tagId === tagId);
  if (!spec) {
    throw new Error(`Unknown feat-category source "${tagId}".`);
  }

  let lines = readFileLines(path.join(ARCHIVE_DIR, spec.sourceFile));
  if (spec.tab) lines = sliceTab(lines, spec.tab);
  if (spec.sectionHeading) lines = sliceSection(lines, spec.sectionHeading);

  const expectedEntries = extractExpectedEntries(lines, spec.featHeadingLevel);
  return {
    ...spec,
    contentSystems: spec.contentSystems ?? [spec.contentSystem],
    descriptionSource: `${spec.sourceFile}${spec.tab ? `#tab:${spec.tab}` : ""}${spec.sectionHeading ? `#section:${spec.sectionHeading.replace(/^\++\s+/, "")}` : ""}`,
    expectedEntries,
    expectedIds: expectedEntries.map((entry) => entry.id),
    rulesBody: extractRulesBody(lines, spec.featHeadingLevel),
  };
}

export function getAllFeatCategorySources() {
  return FEAT_CATEGORY_SOURCE_MANIFEST.map((entry) => getFeatCategorySource(entry.tagId));
}

function getFeatCategorySourceEntries(tagId, knownTagIds = loadAllTagIds()) {
  const source = getFeatCategorySource(tagId);
  let lines = readFileLines(path.join(ARCHIVE_DIR, source.sourceFile));
  if (source.tab) lines = sliceTab(lines, source.tab);
  if (source.sectionHeading) lines = sliceSection(lines, source.sectionHeading);
  return {
    ...source,
    expectedEntries: extractExpectedEntriesWithBodies(
      lines,
      source.featHeadingLevel,
      source.tagId,
      knownTagIds,
    ),
  };
}

function normalizeLookup(value) {
  return normalizeQuotes(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Book resolution reconciles body source lines, source keys, and defaults.
// fallow-ignore-next-line complexity
function resolveSourceBookSlug(sourceSpec, entry, bookMetaMap) {
  const titleToSlug = new Map();
  for (const [slug, meta] of bookMetaMap.entries()) {
    if (meta?.title) titleToSlug.set(normalizeLookup(meta.title), slug);
  }

  const bodySourceMatch = entry.rawBody.match(
    /\^\^\s*\*?\*?Source:\*?\*?\s*(.+?)\s*\^\^/i,
  );
  const bodySourceText = bodySourceMatch?.[1]
    ?.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$2")
    ?.trim();
  if (bodySourceText) {
    const normalized = normalizeLookup(bodySourceText);
    const sortedTitles = [...titleToSlug.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [title, slug] of sortedTitles) {
      if (normalized.includes(title)) return slug;
    }
  }

  if (entry.sourceKey) {
    const mapped = SOURCE_KEY_TO_SLUG[entry.sourceKey];
    if (mapped) return mapped;
  }

  return sourceSpec.defaultBookSlug ?? "unknown-source";
}

// fallow-ignore-next-line complexity
function inferSphereFields(entry, knownSphereIds = loadKnownSphereIds()) {
  const sphereMatches = [];
  const spherePattern = /\b([A-Za-z][A-Za-z' -]+?) sphere\b/g;
  const sourceText = `${entry.headingLine}\n${entry.rawBody}`;

  for (const match of sourceText.matchAll(spherePattern)) {
    const sphereId = kebab(normalizeQuotes(match[1]));
    if (!knownSphereIds.has(sphereId) || sphereMatches.includes(sphereId)) continue;
    sphereMatches.push(sphereId);
  }

  return {
    sphere: sphereMatches[0],
    dualSphere: entry.isDualSphere ? sphereMatches[1] : undefined,
  };
}

// Champion source pages legitimately route across multiple systems.
// fallow-ignore-next-line complexity
function inferEntrySystem(
  sourceSpec,
  entry,
  {
    sphereFields = inferSphereFields(entry),
    sphereSystemMap = loadSphereSystemMap(),
    bookSystemMap = loadBookSystemMap(),
    bookSlug = sourceSpec.defaultBookSlug,
  } = {},
) {
  if (
    Array.isArray(sourceSpec.contentSystems) &&
    sourceSpec.contentSystems.length === 1
  ) {
    return sourceSpec.contentSystems[0];
  }
  if (sourceSpec.contentSystem && !Array.isArray(sourceSpec.contentSystems)) {
    return sourceSpec.contentSystem;
  }

  const sphereCandidates = [sphereFields.sphere, sphereFields.dualSphere].filter(Boolean);
  for (const sphereId of sphereCandidates) {
    const systems = [...(sphereSystemMap.get(sphereId) ?? [])];
    if (systems.length === 1) return systems[0];
  }

  const systemsForBook = bookSystemMap.get(bookSlug) ?? [];
  if (systemsForBook.length === 1) return systemsForBook[0];

  return sourceSpec.tagId === "champion" ? "champions" : sourceSpec.contentSystem;
}

function getCanonicalCategoryForExpectedEntry(entry, tagMeta) {
  const categoryTags = (entry.tags ?? [])
    .filter((tagId) => tagMeta.get(tagId))
    .sort((a, b) => compareTagPriority(a, b, tagMeta));

  return categoryTags[0] ?? entry.sphere ?? "general";
}

// fallow-ignore-next-line complexity
function compareTagPriority(a, b, tagMeta) {
  const priorityA = tagMeta.get(a)?.priority ?? 999;
  const priorityB = tagMeta.get(b)?.priority ?? 999;
  return priorityA - priorityB || a.localeCompare(b);
}

// Expected placements merge overlapping category sources into one canonical content record.
// fallow-ignore-next-line complexity
export function getExpectedFeatPlacements(
  knownTagIds = loadAllTagIds(),
  bookMetaMap = loadBookMetaMap(),
  sphereSystemMap = loadSphereSystemMap(),
  bookSystemMap = loadBookSystemMap(),
  tagMeta = loadFeatCategoryTagMeta(),
) {
  const rawPlacements = FEAT_CATEGORY_SOURCE_MANIFEST.flatMap((spec) => {
    const source = getFeatCategorySourceEntries(spec.tagId, knownTagIds);
    return source.expectedEntries.map((entry) => {
      const bookSlug = resolveSourceBookSlug(source, entry, bookMetaMap);
      const sphereFields = inferSphereFields(entry);
      const system = inferEntrySystem(source, entry, {
        sphereFields,
        sphereSystemMap,
        bookSystemMap,
        bookSlug,
      });
      const withFields = {
        ...entry,
        ...sphereFields,
        system,
        bookSlug,
        sourceTagId: source.tagId,
        sourceFile: source.sourceFile,
        sourceDescription: source.descriptionSource,
      };
      return {
        ...withFields,
        canonicalCategory: getCanonicalCategoryForExpectedEntry(withFields, tagMeta),
        homeCategory: source.tagId,
        sourceCategories: [source.tagId],
        key: `${bookSlug}:${system}:${entry.id}`,
      };
    });
  });

  const aggregated = new Map();
  for (const placement of rawPlacements) {
    const aggregateKey = `${placement.bookSlug}:${placement.id}`;
    const current = aggregated.get(aggregateKey) ?? {
      ...placement,
      tags: new Set(placement.tags),
      sourceCategories: new Set(placement.sourceCategories ?? [placement.sourceTagId]),
      sourceDescriptions: new Set([placement.sourceDescription]),
    };
    for (const tagId of placement.tags) current.tags.add(tagId);
    for (const sourceCategory of placement.sourceCategories ?? [placement.sourceTagId]) {
      current.sourceCategories.add(sourceCategory);
    }
    current.sourceDescriptions.add(placement.sourceDescription);
    if (!aggregated.has(aggregateKey)) aggregated.set(aggregateKey, current);
  }

  // fallow-ignore-next-line complexity
  return [...aggregated.entries()].map(([aggregateKey, placement]) => {
    const override = EXPECTED_FEAT_OVERRIDES[aggregateKey];
    const tags = [...placement.tags].sort();
    const sourceCategories = [...placement.sourceCategories].sort();
    const sphere = override?.sphere ?? placement.sphere;
    const system = override?.system ?? placement.system;
    const homeCategory =
      override?.homeCategory ??
      sourceCategories[0] ??
      placement.homeCategory ??
      placement.sourceTagId;
    const withResolved = {
      ...placement,
      tags,
      sphere,
      system,
      homeCategory,
      sourceCategories,
      sourceDescription: [...placement.sourceDescriptions].join(" | "),
    };

    return {
      ...withResolved,
      canonicalCategory: getCanonicalCategoryForExpectedEntry(withResolved, tagMeta),
      key: `${placement.bookSlug}:${system}:${placement.id}`,
    };
  });
}

// Category membership is a many-to-many projection over merged expected placements.
// fallow-ignore-next-line complexity
export function getExpectedCategoryMembership(tagMeta = loadFeatCategoryTagMeta()) {
  const membership = new Map();
  for (const placement of getExpectedFeatPlacements()) {
    for (const tagId of placement.tags.filter((tag) => tagMeta.has(tag))) {
      if (!membership.has(tagId)) membership.set(tagId, []);
      membership.get(tagId).push(placement);
    }
  }

  for (const [tagId, placements] of membership.entries()) {
    const deduped = new Map();
    for (const placement of placements) {
      deduped.set(placement.key, placement);
    }
    membership.set(tagId, [...deduped.values()].sort((a, b) => a.key.localeCompare(b.key)));
  }

  return membership;
}

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? parseYaml(match[1]) : {};
}

function walkMarkdownFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdownFiles(entryPath, files);
    else if (entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

// Feat files currently span both legacy sphere-nested and category-nested layouts.
// fallow-ignore-next-line complexity
export function loadFeatEntries() {
  const feats = [];

  for (const filePath of walkMarkdownFiles(CONTENT_DIR)) {
    if (!filePath.includes(`${path.sep}feats${path.sep}`)) continue;

    const relativePath = path.relative(CONTENT_DIR, filePath);
    const parts = relativePath.split(path.sep);
    const frontmatter = readFrontmatter(filePath);
    if (!frontmatter?.id || !frontmatter?.name) continue;

    let category;
    let sphereFromPath;

    if (parts[2] === "feats" && parts.length === 5) {
      category = parts[3];
    } else if (parts[2] === "spheres" && parts[4] === "feats" && parts.length === 6) {
      sphereFromPath = parts[3];
    } else if (parts[2] === "feats" && parts.length === 4) {
      category = undefined;
    } else {
      continue;
    }

    feats.push({
      filePath,
      relativePath,
      bookSlug: parts[0],
      system: parts[1],
      id: frontmatter.id,
      name: frontmatter.name,
      tags: frontmatter.tags ?? [],
      sphere: frontmatter.sphere ?? sphereFromPath,
      category,
      frontmatter,
    });
  }

  return feats;
}

// fallow-ignore-next-line complexity
export function loadFeatCategoryTagMeta() {
  const meta = new Map();

  for (const filePath of walkMarkdownFiles(CONTENT_DIR)) {
    const frontmatter = readFrontmatter(filePath);
    if (frontmatter?.featCategory !== true || !frontmatter?.id) continue;
    meta.set(frontmatter.id, {
      id: frontmatter.id,
      priority: frontmatter.priority ?? 999,
      system: frontmatter.system,
      filePath,
    });
  }

  return meta;
}
