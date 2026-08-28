#!/usr/bin/env node
/** Validate scoped identity assignment and optionally refresh its JSON audit. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  assignSystemUniqueIds,
  buildIdentityCollisionReport,
} from "../src/lib/entryIdentity.ts";
import { inferFromPath } from "../src/lib/inferFromPath.ts";
import { loadBookMeta } from "./lib/book-meta.mjs";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(scriptDir, "../src/content");
const reportPath = path.resolve(
  scriptDir,
  "../docs/identity-collision-report.json",
);
const writeReport = process.argv.includes("--write");
const printJson = process.argv.includes("--json");

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return parseYaml(match[1]) ?? {};
}

function parseIdentitySource(filePath) {
  const frontmatter = readFrontmatter(filePath);
  if (!frontmatter) return null;
  const relative = path.relative(contentDir, filePath);
  const parts = relative.split(path.sep);
  const sourceBook = parts[0];
  const inferred = inferFromPath(parts.slice(1).join("/"));
  const type = inferred.type ?? frontmatter.type;
  const id = inferred.id ?? frontmatter.id;
  return { frontmatter, sourceBook, inferred, type, id };
}

function entrySystem(source, meta) {
  return source.inferred.system || source.frontmatter.system || meta.system;
}

function publishedDate(meta) {
  return meta.publishedDate ?? "1970-01-01";
}

function identityRecord(filePath, bookMeta) {
  const source = parseIdentitySource(filePath);
  if (!source) return null;
  const { frontmatter, sourceBook, inferred, type, id } = source;
  const meta = bookMeta.get(sourceBook) ?? {};
  return {
    sourceBook,
    sourceBookTitle: meta.title,
    publishedDate: publishedDate(meta),
    entry: {
      type,
      id,
      system: entrySystem({ frontmatter, inferred }, meta),
      modifies: frontmatter.modifies,
    },
  };
}

function identityRecords() {
  const bookMeta = loadBookMeta(contentDir);
  return getMarkdownFilesRecursively(contentDir, { skipQuarantine: true })
    .map((filePath) => identityRecord(filePath, bookMeta))
    .filter(
      (record) =>
        record?.entry.type && record.entry.id && record.entry.type !== "tag",
    )
    .map((record, sourceIndex) => ({ ...record, sourceIndex }));
}

const records = identityRecords();
const assigned = assignSystemUniqueIds(records);
const seen = new Set();
for (const record of assigned) {
  if (record.entry.modifies) continue;
  const key = `${record.entry.type}:${record.entry.system ?? "_"}:${record.entry.id}`;
  if (seen.has(key)) throw new Error(`Duplicate assigned identity: ${key}`);
  seen.add(key);
}

const collisions = buildIdentityCollisionReport(records);
const scopedCollisions = collisions.filter((collision) => {
  const scopes = new Set(
    collision.entries.map(
      (entry) => `${entry.system ?? "_"}:${entry.originalId}`,
    ),
  );
  return scopes.size < collision.entries.length;
});
const report = {
  generatedAt: "2026-08-28",
  source: "src/content",
  records: records.length,
  legacyDuplicateKeyCount: collisions.length,
  sameSystemDuplicateKeyCount: scopedCollisions.length,
  policy: {
    scopedIdentity: "type + system + id",
    oldestKeepsBareId: true,
    laterDuplicatesUseSourceBookInitials: true,
    initials: "NFKD ASCII word initials, lowercase alphanumeric",
    explicitIdsReservedBeforeGeneratedSuffixes: true,
  },
  collisions,
};

if (writeReport) {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
} else if (printJson) {
  console.log(JSON.stringify(report, null, 2));
}
console.log(
  `Identity audit passed: ${records.length} records, ${collisions.length} legacy duplicate keys, ${seen.size} assigned public ids.`,
);
