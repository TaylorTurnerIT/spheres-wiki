import fs from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  assignSystemUniqueIds,
  contentEntryKey,
  type IdentityRecord,
} from "./entryIdentity";
import { normalizeEntryData } from "./entryNormalization";
import { getPathDerivedFeatUrl } from "./featCategories";

// Prefer the source tree so bundled Astro prerender chunks can resolve content.
const _moduleDir = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_CONTENT_DIR = path.resolve(process.cwd(), "src/content");
const DEFAULT_CONTENT_DIR = fs.existsSync(SOURCE_CONTENT_DIR)
  ? SOURCE_CONTENT_DIR
  : path.resolve(_moduleDir, "../content");
const FRONTMATTER_CHUNK_SIZE = 4096;
const MAX_FRONTMATTER_BYTES = 256 * 1024;
const ENTRY_FRONTMATTER_KEYS = new Set([
  "id",
  "name",
  "sphere",
  "system",
  "type",
  "modifies",
]);

let dbCache: Map<string, any> | null = null;
let nameIndex: Map<string, any> | null = null;
const unscopedIdIndex = new Map<string, any[]>();
const bookYamlCache = new Map<
  string,
  { system?: string; title?: string; publishedDate?: string }
>();

interface EntryCache {
  entries: Map<string, any>;
  names: Map<string, any>;
}

function getFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (entry.name.endsWith(".md")) {
      results.push(filePath);
    }
  }
  return results;
}

function readFrontmatterYaml(filePath: string): string | null {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.allocUnsafe(FRONTMATTER_CHUNK_SIZE);
    const decoder = new StringDecoder("utf8");
    let content = "";
    let offset = 0;

    while (offset < MAX_FRONTMATTER_BYTES) {
      const bytesRead = fs.readSync(
        fd,
        buffer,
        0,
        FRONTMATTER_CHUNK_SIZE,
        offset,
      );
      if (bytesRead === 0) return null;

      offset += bytesRead;
      content += decoder.write(buffer.subarray(0, bytesRead));
      if (!content.startsWith("---")) return null;

      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (match) return match[1];
    }
  } finally {
    fs.closeSync(fd);
  }

  return null;
}

function readFrontmatter(filePath: string): any {
  const yaml = readFrontmatterYaml(filePath);
  if (!yaml) return {};

  const scalarFrontmatter = parseEntryScalarFrontmatter(yaml);
  if (scalarFrontmatter) return scalarFrontmatter;

  try {
    return parseYaml(yaml) || {};
  } catch {
    return {};
  }
}

function parseEntryScalarFrontmatter(
  yaml: string,
): Record<string, string> | null {
  const frontmatter: Record<string, string> = {};

  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) continue;

    const [, key, rawValue = ""] = match;
    if (!ENTRY_FRONTMATTER_KEYS.has(key)) continue;

    const value = parseSimpleScalar(rawValue);
    if (value === null) return null;
    frontmatter[key] = value;
  }

  // Every entry participating in name lookups should have a top-level name.
  // If this fast path cannot see one, fall back to the full YAML parser.
  return frontmatter.name ? frontmatter : null;
}

function parseSimpleScalar(rawValue: string): string | null {
  const value = rawValue.trim();
  if (isUnsupportedScalar(value)) return null;

  if (value.startsWith('"')) return parseDoubleQuotedScalar(value);
  if (value.startsWith("'")) return parseSingleQuotedScalar(value);

  return parseUnquotedScalar(value);
}

function isUnsupportedScalar(value: string): boolean {
  return value === "" || value === "|" || value === ">";
}

function parseDoubleQuotedScalar(value: string): string | null {
  if (!value.endsWith('"')) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseSingleQuotedScalar(value: string): string | null {
  if (!value.endsWith("'")) return null;
  return value.slice(1, -1).replace(/''/g, "'");
}

function parseUnquotedScalar(value: string): string {
  const commentIndex = value.search(/\s#/);
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim();
}

function readBookMeta(contentDir: string, bookSlug: string) {
  if (!bookYamlCache.has(bookSlug)) {
    try {
      const bookYamlPath = path.join(contentDir, bookSlug, "_book.yaml");
      bookYamlCache.set(
        bookSlug,
        fs.existsSync(bookYamlPath)
          ? parseYaml(fs.readFileSync(bookYamlPath, "utf8"))
          : {},
      );
    } catch {
      bookYamlCache.set(bookSlug, {});
    }
  }

  return bookYamlCache.get(bookSlug)?.system;
}

function getBookMeta(contentDir: string, bookSlug: string) {
  readBookMeta(contentDir, bookSlug);
  return bookYamlCache.get(bookSlug) ?? {};
}

function createCache(contentDir: string): EntryCache {
  const cache: EntryCache = {
    entries: new Map(),
    names: new Map(),
  };

  if (!fs.existsSync(contentDir)) return cache;

  const records: IdentityRecord[] = [];
  for (const [sourceIndex, filePath] of getFilesRecursively(
    contentDir,
  ).entries()) {
    const scanned = readEntry(contentDir, filePath);
    if (!scanned) continue;
    records.push({ ...scanned, sourceIndex });
  }

  for (const record of assignSystemUniqueIds(records)) {
    if (!record.entry.modifies) addEntryToCache(cache, record.entry);
  }

  return cache;
}

function readEntry(
  contentDir: string,
  filePath: string,
): (IdentityRecord & { entry: any }) | null {
  const relPath = path.relative(contentDir, filePath);
  const parts = relPath.split(path.sep);
  const bookSlug = parts[0];
  const entryPath = parts.slice(1).join("/");
  const frontmatter = readFrontmatter(filePath);
  const bookMeta = getBookMeta(contentDir, bookSlug);
  const normalized = normalizeEntryData(
    frontmatter,
    entryPath,
    bookMeta.system,
  );
  const entryType =
    typeof normalized.type === "string" ? normalized.type : null;
  const entryId = typeof normalized.id === "string" ? normalized.id : null;
  if (!entryType || !entryId) return null;

  return {
    sourceBook: bookSlug,
    sourceBookTitle: bookMeta.title,
    publishedDate: bookMeta.publishedDate ?? "1970-01-01",
    sourceIndex: 0,
    entry: {
      ...normalized,
      type: entryType,
      id: entryId,
    },
  };
}

function addEntryToCache(cache: EntryCache, entry: any): void {
  cache.entries.set(contentEntryKey(entry.type, entry.system, entry.id), entry);
  const unscopedKey = `${entry.type}:${entry.id}`;
  const unscoped = unscopedIdIndex.get(unscopedKey) ?? [];
  unscoped.push(entry);
  unscopedIdIndex.set(unscopedKey, unscoped);
  if (!entry.name) return;

  const systemNameKey = `${entry.type}:${entry.system ?? "_"}:${entry.name.toLowerCase()}`;
  if (!cache.names.has(systemNameKey)) cache.names.set(systemNameKey, entry);
  const nameKey = `${entry.type}:${entry.name.toLowerCase()}`;
  // First entry wins (errata handled elsewhere)
  if (!cache.names.has(nameKey)) {
    cache.names.set(nameKey, entry);
  }
}

function ensureCache() {
  if (dbCache) return;
  const cache = createCache(DEFAULT_CONTENT_DIR);
  dbCache = cache.entries;
  nameIndex = cache.names;
}

export function getEntryUrl(
  type: string,
  id: string,
  base: string = "/",
  system?: string,
): string | null {
  ensureCache();
  const entry = system
    ? dbCache?.get(contentEntryKey(type, system, id))
    : unscopedIdIndex.get(`${type}:${id}`)?.[0];
  if (!entry) return null;
  return buildEntryUrl(entry, base);
}

export function getEntryUrlByName(
  type: string,
  name: string,
  base: string = "/",
  system?: string,
): string | null {
  ensureCache();
  const entry =
    nameIndex?.get(
      `${type}:${system ?? ""}${system ? ":" : ""}${name.toLowerCase()}`,
    ) ?? nameIndex?.get(`${type}:${name.toLowerCase()}`);
  if (!entry) return null;
  return buildEntryUrl(entry, base);
}

function buildEntryUrl(entry: any, base: string): string | null {
  const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
  const builder = ENTRY_URL_BUILDERS[entry.type];
  return builder ? builder(entry, basePath) : null;
}

const ENTRY_URL_BUILDERS: Record<
  string,
  (entry: any, base: string) => string | null
> = {
  talent: buildTalentUrl,
  feat: buildFeatUrl,
  sphere: buildSphereUrl,
  class: buildClassUrl,
  article: buildArticleUrl,
  archetype: buildArchetypeUrl,
  "class-trait": buildClassTraitUrl,
  tag: buildTagUrl,
};

function hasFields(entry: any, fields: string[]): boolean {
  return fields.every((field) => Boolean(entry[field]));
}

function buildTalentUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "sphere", "id"])) return null;
  return `${basePath}/${entry.system}/${entry.sphere}/${entry.id}/`;
}

function buildFeatUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "id"])) return null;
  return `${basePath}${getPathDerivedFeatUrl(entry)}`;
}

function buildSphereUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "id"])) return null;
  return `${basePath}/${entry.system}/${entry.id}/`;
}

function buildClassUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "id"])) return null;
  return `${basePath}/${entry.system}/classes/${entry.id}/`;
}

function buildArticleUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["id"])) return null;
  return entry.system
    ? `${basePath}/${entry.system}/articles/${entry.id}/`
    : `${basePath}/articles/${entry.id}/`;
}

function buildArchetypeUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "className", "id"])) return null;
  return `${basePath}/${entry.system}/classes/${entry.className}/${entry.id}/`;
}

function buildClassTraitUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["system", "className", "id"])) return null;
  return `${basePath}/${entry.system}/classes/${entry.className}/traits/${entry.id}/`;
}

function buildTagUrl(entry: any, basePath: string): string | null {
  if (!hasFields(entry, ["id"])) return null;
  return `${basePath}/tags/${entry.id}/`;
}
