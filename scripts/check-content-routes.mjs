#!/usr/bin/env node
/** Verify that every public content entry has a generated detail route. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { SYSTEMS } from "../src/config/site.ts";
import { assignSystemUniqueIds } from "../src/lib/entryIdentity.ts";
import { normalizeEntryData } from "../src/lib/entryNormalization.ts";
import { getCanonicalFeatCategory } from "../src/lib/featCategories.ts";
import { buildTagMap } from "../src/lib/resolveEntries.ts";
import { loadBookMeta } from "./lib/book-meta.mjs";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(scriptDir, "../src/content");
const distDir = path.resolve(scriptDir, "../dist");
const NON_PUBLIC_TYPES = new Set(["class-feature", "archetype-feature"]);
const EMBEDDED_TYPES = new Set(["drawback", "boon", "tradition"]);

function readFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? (parseYaml(match[1]) ?? {}) : {};
}

function entryContext(filePath, bookMeta) {
  const relative = path.relative(contentDir, filePath);
  const [sourceBook, ...entryParts] = relative.split(path.sep);
  const normalized = normalizeEntryData(
    readFrontmatter(filePath),
    entryParts.join("/"),
    bookMeta.get(sourceBook)?.system,
  );
  return { sourceBook, normalized };
}

function tagRecord(sourceBook, normalized) {
  return {
    tagBook: {
      slug: sourceBook,
      rawTagEntries: [{ ...normalized, sourceBook }],
    },
  };
}

function contentRecord(sourceBook, normalized, bookMeta) {
  return {
    record: {
      sourceBook,
      sourceBookTitle: bookMeta.get(sourceBook)?.title,
      publishedDate: bookMeta.get(sourceBook)?.publishedDate ?? "1970-01-01",
      entry: normalized,
    },
  };
}

function parseEntryFile(filePath, bookMeta) {
  const context = entryContext(filePath, bookMeta);
  const { sourceBook, normalized } = context;
  if (!normalized.type) return null;
  if (!normalized.id) return null;
  if (normalized.type === "tag") return tagRecord(sourceBook, normalized);
  return contentRecord(sourceBook, normalized, bookMeta);
}

function collectEntries() {
  const bookMeta = loadBookMeta(contentDir);
  const parsed = getMarkdownFilesRecursively(contentDir, {
    skipQuarantine: true,
  })
    .map((filePath) => parseEntryFile(filePath, bookMeta))
    .filter((entry) => entry !== null);
  const records = parsed
    .filter((entry) => entry.record)
    .map((entry, sourceIndex) => ({ ...entry.record, sourceIndex }));
  const tagBooks = parsed
    .filter((entry) => entry.tagBook)
    .map((entry) => entry.tagBook);
  return { records, tagMap: buildTagMap(tagBooks), bookMeta };
}

function routeArticle(entry) {
  return entry.system
    ? `/${entry.system}/articles/${entry.id}/`
    : `/articles/${entry.id}/`;
}

function routeSphere(entry) {
  return `/${entry.system}/${entry.id}/`;
}

function routeTalent(entry) {
  return entry.sphere ? `/${entry.system}/${entry.sphere}/${entry.id}/` : null;
}

function routeFeat(entry, tagMap) {
  const category = getCanonicalFeatCategory(entry, tagMap);
  return `/${entry.system}/feats/${category}/${entry.id}/`;
}

function routeClass(entry) {
  return `/${entry.system}/classes/${entry.id}/`;
}

function routeClassTrait(entry) {
  return entry.className
    ? `/${entry.system}/classes/${entry.className}/traits/${entry.id}/`
    : null;
}

function routeArchetype(entry) {
  return entry.className
    ? `/${entry.system}/classes/${entry.className}/${entry.id}/`
    : null;
}

function routeTag(entry) {
  return `/tags/${entry.id}/`;
}

function systemRoute(builder) {
  return (entry, tagMap) => {
    if (!SYSTEMS[entry.system]) return null;
    return builder(entry, tagMap);
  };
}

const ROUTE_BUILDERS = new Map([
  ["tag", routeTag],
  ["article", routeArticle],
  ["sphere", systemRoute(routeSphere)],
  ["talent", systemRoute(routeTalent)],
  ["feat", systemRoute(routeFeat)],
  ["class", systemRoute(routeClass)],
  ["class-trait", systemRoute(routeClassTrait)],
  ["archetype", systemRoute(routeArchetype)],
]);

function routeFor(entry, tagMap) {
  return ROUTE_BUILDERS.get(entry.type)?.(entry, tagMap) ?? null;
}

function isEmbeddedEntry(entry) {
  return (
    NON_PUBLIC_TYPES.has(entry.type) ||
    EMBEDDED_TYPES.has(entry.type) ||
    (entry.type === "class" && entry.system === "pf1e")
  );
}

function outputPath(route) {
  return path.join(distDir, route.slice(1), "index.html");
}

if (!fs.existsSync(distDir)) {
  throw new Error("dist/ is missing; run astro build before the route check");
}

const { records, tagMap } = collectEntries();
const missing = [];
for (const { entry } of assignSystemUniqueIds(records)) {
  if (entry.modifies || isEmbeddedEntry(entry)) continue;
  const route = routeFor(entry, tagMap);
  if (!route) {
    missing.push(
      `${entry.type}:${entry.system ?? "_"}:${entry.id} has no public route`,
    );
    continue;
  }
  if (!fs.existsSync(outputPath(route))) {
    missing.push(
      `${entry.type}:${entry.system ?? "_"}:${entry.id} -> ${route}`,
    );
  }
}

if (missing.length > 0) {
  console.error(
    `Content route check failed: ${missing.length} missing route(s).`,
  );
  for (const item of missing.slice(0, 200)) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Content route check passed for ${records.length} entries.`);
