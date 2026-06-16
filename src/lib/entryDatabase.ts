import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { inferFromPath } from "./inferFromPath";

// Resolved relative to this module file so it works regardless of process.cwd()
const _moduleDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTENT_DIR = path.resolve(_moduleDir, "../content");

let dbCache: Map<string, any> | null = null;
let nameIndex: Map<string, any> | null = null;
const bookYamlCache = new Map<string, { system?: string }>();

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

function ensureCache() {
  if (dbCache) return;
  dbCache = new Map();
  nameIndex = new Map();

  const contentDir = DEFAULT_CONTENT_DIR;
  if (!fs.existsSync(contentDir)) return;

  const allFiles = getFilesRecursively(contentDir);
  for (const filePath of allFiles) {
    const relPath = path.relative(contentDir, filePath);
    const parts = relPath.split(path.sep);
    const bookSlug = parts[0];
    const entryPath = parts.slice(1).join("/");

    const inferred = inferFromPath(entryPath);

    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let frontmatter: any = {};
    if (match) {
      try {
        frontmatter = parseYaml(match[1]) || {};
      } catch {
        // ignore
      }
    }

    let system = frontmatter.system;
    if (!system) {
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
      system = bookYamlCache.get(bookSlug)?.system;
    }

    const entryType = frontmatter.type || inferred.type;
    const entryId = frontmatter.id || inferred.id;

    if (entryType && entryId) {
      const entry = {
        ...inferred,
        ...frontmatter,
        type: entryType,
        id: entryId,
        // explicit system wins; fall back to inferred.system (path-derived) if undefined
        ...(system ? { system } : {}),
      };
      dbCache.set(`${entryType}:${entryId}`, entry);

      // Build name index for name-based lookups
      if (entry.name) {
        const nameKey = `${entryType}:${entry.name.toLowerCase()}`;
        // First entry wins (errata handled elsewhere)
        if (!nameIndex.has(nameKey)) {
          nameIndex.set(nameKey, entry);
        }
      }
    }
  }
}

export function getEntryUrl(
  type: string,
  id: string,
  base: string = "/",
): string | null {
  ensureCache();
  const entry = dbCache?.get(`${type}:${id}`);
  if (!entry) return null;
  return buildEntryUrl(entry, base);
}

export function getEntryUrlByName(
  type: string,
  name: string,
  base: string = "/",
): string | null {
  ensureCache();
  const entry = nameIndex?.get(`${type}:${name.toLowerCase()}`);
  if (!entry) return null;
  return buildEntryUrl(entry, base);
}

export function lookupEntryByName(
  type: string,
  name: string,
): { id: string; system: string; sphere?: string } | null {
  ensureCache();
  const entry = nameIndex?.get(`${type}:${name.toLowerCase()}`);
  if (!entry) return null;
  return {
    id: entry.id,
    system: entry.system,
    sphere: entry.sphere,
  };
}

function buildEntryUrl(entry: any, base: string): string | null {
  const basePath = base.endsWith("/") ? base.slice(0, -1) : base;

  if (entry.type === "talent") {
    if (!entry.system || !entry.sphere || !entry.id) return null;
    return `${basePath}/${entry.system}/${entry.sphere}/${entry.id}/`;
  } else if (entry.type === "feat") {
    if (!entry.system || !entry.sphere || !entry.id) return null;
    return `${basePath}/${entry.system}/${entry.sphere}/feats/${entry.id}/`;
  } else if (entry.type === "sphere") {
    if (!entry.system || !entry.id) return null;
    return `${basePath}/${entry.system}/${entry.id}/`;
  } else if (entry.type === "class") {
    if (!entry.system || !entry.id) return null;
    return `${basePath}/${entry.system}/classes/${entry.id}/`;
  }

  return null;
}
