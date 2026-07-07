#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  CONTENT_DIR,
  getExpectedFeatPlacements,
  loadAllTagIds,
  loadBookMetaMap,
  loadBookSystemMap,
  loadFeatCategoryTagMeta,
  loadFeatEntries,
  loadSphereSystemMap,
  renderExpectedEntryBody,
} from "./lib/feat-category-sources.mjs";

const WRITE = process.argv.includes("--write");

const FEAT_CATEGORY_TAG_IDS = new Set(loadFeatCategoryTagMeta().keys());
const RAW_EXPECTED_PLACEMENTS = getExpectedFeatPlacements(
  loadAllTagIds(),
  loadBookMetaMap(),
  loadSphereSystemMap(),
  loadBookSystemMap(),
  loadFeatCategoryTagMeta(),
);

const STUB_TITLES = {
  "high-magic-handbook": "The High Magic Handbook",
  "pathfinder-core-rulebook": "Pathfinder Core Rulebook",
  "damnation-by-hunger": "Damnation by Hunger",
  "champions-of-the-spheres-study-and-practice":
    "Champions of the Spheres: Study and Practice",
};

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// fallow-ignore-next-line complexity
function isCrossBookTaggedCandidate(feat, expected) {
  return (
    feat.id === expected.id &&
    normalizeName(feat.name) === normalizeName(expected.name) &&
    ((feat.tags ?? []).includes(expected.sourceTagId) ||
      feat.category === expected.sourceTagId)
  );
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function splitFrontmatter(filePath) {
  const original = readFile(filePath);
  const match = original.match(/^---\n([\s\S]*?)\n---(\n[\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing frontmatter: ${filePath}`);
  }
  return {
    original,
    yamlText: match[1],
    body: match[2],
    frontmatter: parseYaml(match[1]),
  };
}

function writeFrontmatterFile(filePath, frontmatter, body) {
  const next = `---\n${stringifyYaml(frontmatter).trimEnd()}\n---${body.startsWith("\n") ? body : `\n${body}`}`;
  if (WRITE) fs.writeFileSync(filePath, next, "utf8");
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Book stubs derive optional purchase URLs from irregular body source lines.
// fallow-ignore-next-line complexity
function ensureBookStub(expected) {
  const bookDir = path.join(CONTENT_DIR, expected.bookSlug);
  const yamlPath = path.join(bookDir, "_book.yaml");
  if (fs.existsSync(yamlPath)) return null;

  const title =
    STUB_TITLES[expected.bookSlug] ?? titleFromSlug(expected.bookSlug);
  const bodySourceMatch = expected.rawBody.match(
    /\^\^\s*\*?\*?Source:\*?\*?\s*(.+?)\s*\^\^/i,
  );
  const buyUrl = bodySourceMatch?.[1]?.match(/https?:\/\/[^\s\]]+/)?.[0];
  const yamlText = [
    `title: "${title.replace(/"/g, '\\"')}"`,
    `publishedDate: "1970-01-01"`,
    ...(buyUrl ? [`buyUrl: "${buyUrl}"`] : []),
    "",
  ].join("\n");

  if (WRITE) {
    fs.mkdirSync(bookDir, { recursive: true });
    fs.writeFileSync(yamlPath, yamlText, "utf8");
  }

  return path.relative(CONTENT_DIR, yamlPath);
}

function buildTargetPath(expected, currentCategory = undefined) {
  const homeCategory =
    currentCategory && expected.sourceCategories?.includes(currentCategory)
      ? currentCategory
      : expected.homeCategory;
  return path.join(
    CONTENT_DIR,
    expected.bookSlug,
    expected.system,
    "feats",
    homeCategory,
    `${expected.id}.md`,
  );
}

function createFeatFile(expected) {
  const targetPath = buildTargetPath(expected);
  const frontmatter = {
    id: expected.id,
    name: expected.name,
    ...(expected.sphere ? { sphere: expected.sphere } : {}),
    ...(expected.dualSphere ? { dualSphere: expected.dualSphere } : {}),
    tags: [...expected.tags].sort(),
    tier: "feat",
  };
  const body = `\n${renderExpectedEntryBody(expected).trim()}\n`;

  if (WRITE) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFrontmatterFile(targetPath, frontmatter, body);
  }

  return path.relative(CONTENT_DIR, targetPath);
}

// Moves must preserve frontmatter while handling optional sphere and dualSphere fields.
// fallow-ignore-next-line complexity
function moveAndRewriteFeat(filePath, expected, tags) {
  const currentParts = path.relative(CONTENT_DIR, filePath).split(path.sep);
  const currentCategory =
    currentParts[2] === "feats" && currentParts.length === 5
      ? currentParts[3]
      : undefined;
  const targetPath = buildTargetPath(expected, currentCategory);
  const { frontmatter, body } = splitFrontmatter(filePath);
  frontmatter.id = expected.id;
  frontmatter.name = expected.name;
  frontmatter.tags = [...tags].sort();
  if (expected.sphere) frontmatter.sphere = expected.sphere;
  else delete frontmatter.sphere;
  if (expected.dualSphere) frontmatter.dualSphere = expected.dualSphere;
  else delete frontmatter.dualSphere;
  if (!frontmatter.tier) frontmatter.tier = "feat";

  if (WRITE) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFrontmatterFile(filePath, frontmatter, body);
    if (filePath !== targetPath) {
      if (fs.existsSync(targetPath)) {
        throw new Error(
          `Refusing to overwrite existing target file: ${path.relative(CONTENT_DIR, targetPath)}`,
        );
      }
      fs.renameSync(filePath, targetPath);
    }
  }

  return {
    from: path.relative(CONTENT_DIR, filePath),
    to: path.relative(CONTENT_DIR, targetPath),
  };
}

// Matching must stay conservative across legacy cross-book and cross-system duplicates.
// fallow-ignore-next-line complexity
function chooseCandidate(expected, feats, claimedPaths) {
  const available = feats.filter((feat) => !claimedPaths.has(feat.filePath));
  const sameBook = available.filter(
    (feat) => feat.bookSlug === expected.bookSlug,
  );

  const exactKey = sameBook.find(
    (feat) => feat.system === expected.system && feat.id === expected.id,
  );
  if (exactKey) return exactKey;

  const sameBookSameSystemName = sameBook.filter(
    (feat) =>
      feat.system === expected.system &&
      normalizeName(feat.name) === normalizeName(expected.name),
  );
  if (sameBookSameSystemName.length === 1) return sameBookSameSystemName[0];

  const sameBookSameId = sameBook.filter(
    (feat) =>
      feat.id === expected.id &&
      normalizeName(feat.name) === normalizeName(expected.name),
  );
  if (sameBookSameId.length === 1) return sameBookSameId[0];

  const sameBookSameName = sameBook.filter(
    (feat) => normalizeName(feat.name) === normalizeName(expected.name),
  );
  if (sameBookSameName.length === 1) return sameBookSameName[0];

  const crossBookTagged = available.filter((feat) =>
    isCrossBookTaggedCandidate(feat, expected),
  );
  if (crossBookTagged.length === 1) return crossBookTagged[0];

  if (
    sameBookSameSystemName.length > 1 ||
    sameBookSameId.length > 1 ||
    sameBookSameName.length > 1
  ) {
    throw new Error(
      `Ambiguous existing feat match for ${expected.key}: ${sameBookSameName.map((feat) => feat.relativePath).join(" | ")}`,
    );
  }
  if (crossBookTagged.length > 1) {
    throw new Error(
      `Ambiguous cross-book feat match for ${expected.key}: ${crossBookTagged.map((feat) => feat.relativePath).join(" | ")}`,
    );
  }

  return null;
}

// Expected sources intentionally collapse repeated feat listings into one merged record.
// fallow-ignore-next-line complexity
function buildExpectedTagMap() {
  const map = new Map();
  for (const expected of RAW_EXPECTED_PLACEMENTS) {
    const bucket = map.get(expected.key) ?? {
      expected,
      tags: new Set(),
      homeCategory: expected.sourceTagId,
      sourceCategories: new Set(),
    };
    for (const tagId of expected.tags) bucket.tags.add(tagId);
    for (const sourceCategory of expected.sourceCategories ?? [
      expected.sourceTagId,
    ]) {
      bucket.sourceCategories.add(sourceCategory);
    }
    map.set(expected.key, bucket);
  }
  return map;
}

function canonicalCategoryForTags(tags, sphere, category) {
  const categoryTags = [...tags]
    .filter((tagId) => tagMeta.get(tagId))
    .sort((a, b) => compareTagPriority(a, b));
  return categoryTags[0] ?? sphere ?? category ?? "general";
}

// fallow-ignore-next-line complexity
function compareTagPriority(a, b) {
  const pA = tagMeta.get(a)?.priority ?? 999;
  const pB = tagMeta.get(b)?.priority ?? 999;
  return pA - pB || a.localeCompare(b);
}

const tagMeta = loadFeatCategoryTagMeta();
const expectedTagMap = buildExpectedTagMap();
// Projection preserves source-category unions for later routing and tag sync.
// fallow-ignore-next-line complexity
const EXPECTED_PLACEMENTS = [...expectedTagMap.values()].map(
  ({ expected, tags, homeCategory, sourceCategories }) => ({
    ...expected,
    tags: [...tags].sort(),
    homeCategory,
    sourceCategories: [...sourceCategories].sort(),
    canonicalCategory: canonicalCategoryForTags(
      tags,
      expected.sphere,
      expected.category,
    ),
  }),
);

const created = [];
const moved = [];
const stubbedBooks = new Set();
const deleted = [];
const claimedPaths = new Set();

let feats = loadFeatEntries();

for (const expected of EXPECTED_PLACEMENTS) {
  const stub = ensureBookStub(expected);
  if (stub) stubbedBooks.add(stub);

  const current = chooseCandidate(expected, feats, claimedPaths);
  if (!current) {
    created.push(createFeatFile(expected));
    continue;
  }
  claimedPaths.add(current.filePath);

  const nextTags = new Set([...(current.tags ?? []), ...expected.tags]);
  const move = moveAndRewriteFeat(current.filePath, expected, nextTags);
  if (move.from !== move.to) moved.push(move);
}

// Reload after creation/moves so key/path/system data are current.
feats = loadFeatEntries();

const tagUpdates = [];
for (const feat of feats) {
  const key = `${feat.bookSlug}:${feat.system}:${feat.id}`;
  const expected = expectedTagMap.get(key);
  const currentTags = new Set(feat.tags ?? []);
  const preservedNonCategory = [...currentTags].filter(
    (tagId) => !FEAT_CATEGORY_TAG_IDS.has(tagId),
  );
  const desiredTags = new Set([
    ...preservedNonCategory,
    ...(expected ? [...expected.tags] : []),
  ]);
  const nextTags = [...desiredTags].sort();
  const currentSorted = [...currentTags].sort();

  if (JSON.stringify(nextTags) !== JSON.stringify(currentSorted)) {
    const { frontmatter, body } = splitFrontmatter(feat.filePath);
    frontmatter.tags = nextTags;
    if (WRITE) writeFrontmatterFile(feat.filePath, frontmatter, body);
    tagUpdates.push({
      file: feat.relativePath,
      tags: nextTags,
    });
  }
}

// Reload again after tag sync, then enforce canonical placement on all feats.
feats = loadFeatEntries();

const byBookAndId = new Map();
for (const feat of feats) {
  const key = `${feat.bookSlug}:${feat.id}`;
  const bucket = byBookAndId.get(key) ?? [];
  bucket.push(feat);
  byBookAndId.set(key, bucket);
}

for (const [, group] of byBookAndId) {
  if (group.length < 2) continue;
  const expectedGroup = group.filter((feat) =>
    expectedTagMap.has(`${feat.bookSlug}:${feat.system}:${feat.id}`),
  );
  const staleGroup = group.filter(
    (feat) => !expectedTagMap.has(`${feat.bookSlug}:${feat.system}:${feat.id}`),
  );
  if (expectedGroup.length === 0 || staleGroup.length === 0) continue;

  for (const feat of staleGroup) {
    if (WRITE) fs.unlinkSync(feat.filePath);
    deleted.push(feat.relativePath);
  }
}

feats = loadFeatEntries();
for (const feat of feats) {
  if (feat.category) continue;
  const canonicalCategory = canonicalCategoryForTags(
    feat.tags ?? [],
    feat.sphere,
    feat.category,
  );
  if (feat.category === canonicalCategory) continue;

  const targetPath = path.join(
    CONTENT_DIR,
    feat.bookSlug,
    feat.system,
    "feats",
    canonicalCategory,
    `${feat.id}.md`,
  );
  if (fs.existsSync(targetPath)) {
    throw new Error(
      `Refusing to overwrite canonical target: ${path.relative(CONTENT_DIR, targetPath)}`,
    );
  }
  if (WRITE) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.renameSync(feat.filePath, targetPath);
  }
  moved.push({
    from: feat.relativePath,
    to: path.relative(CONTENT_DIR, targetPath),
  });
}

console.log(`Book stubs: ${stubbedBooks.size}`);
for (const stub of stubbedBooks) console.log(`  + ${stub}`);

console.log(`Created feats: ${created.length}`);
for (const file of created.slice(0, 120)) console.log(`  + ${file}`);
if (created.length > 120) console.log(`  ... ${created.length - 120} more`);

console.log(`Tag updates: ${tagUpdates.length}`);
for (const update of tagUpdates.slice(0, 120)) {
  console.log(`  ~ ${update.file} -> [${update.tags.join(", ")}]`);
}
if (tagUpdates.length > 120)
  console.log(`  ... ${tagUpdates.length - 120} more`);

console.log(`Moves: ${moved.length}`);
for (const move of moved.slice(0, 120)) {
  console.log(`  mv ${move.from} -> ${move.to}`);
}
if (moved.length > 120) console.log(`  ... ${moved.length - 120} more`);

console.log(`Deleted stale duplicates: ${deleted.length}`);
for (const file of deleted.slice(0, 120)) {
  console.log(`  - ${file}`);
}
if (deleted.length > 120) console.log(`  ... ${deleted.length - 120} more`);

if (!WRITE) {
  console.log("\nDry run only. Re-run with --write to apply changes.");
}
