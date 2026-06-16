import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REQUIRED_FIELDS = [
  "title",
  "publisher",
  "publishedDate",
  "price",
  "buyUrl",
] as const;
const EPOCH_DATE = "1970-01-01";
// Price must match $_.__ format (dollar + digits + dot + two digits). PLACEHOLDER is not acceptable.
const PRICE_RE = /^\$\d+\.\d{2}$/;

const contentDir = path.resolve(__dirname, "../../src/content");

const SYSTEM_BOOKS = new Set(["__built-in__"]);

function getSourceBookDirs(): string[] {
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .filter((name) => fs.statSync(path.join(contentDir, name)).isDirectory())
    .filter((name) => !SYSTEM_BOOKS.has(name))
    .sort();
}

function loadBookYaml(book: string): Record<string, unknown> | null {
  const yamlPath = path.join(contentDir, book, "_book.yaml");
  if (!fs.existsSync(yamlPath)) return null;
  try {
    return parseYaml(fs.readFileSync(yamlPath, "utf8")) ?? {};
  } catch {
    return {};
  }
}

const sourceBooks = getSourceBookDirs();

describe("_book.yaml validation", () => {
  it("every source book directory has a _book.yaml", () => {
    const missing = sourceBooks.filter(
      (book) => !fs.existsSync(path.join(contentDir, book, "_book.yaml")),
    );
    if (missing.length > 0) {
      expect.fail(`Missing _book.yaml in:\n  ${missing.join("\n  ")}`);
    }
  });

  it("every _book.yaml has all required fields filled (no empty values)", () => {
    const violations: string[] = [];
    for (const book of sourceBooks) {
      const data = loadBookYaml(book);
      if (!data) continue;
      for (const field of REQUIRED_FIELDS) {
        const val = data[field];
        if (val === undefined || String(val).trim() === "") {
          violations.push(`${book}: "${field}" is empty or missing`);
        }
      }
    }
    if (violations.length > 0) {
      expect.fail(
        `Incomplete _book.yaml fields:\n  ${violations.join("\n  ")}`,
      );
    }
  });

  it("no _book.yaml uses epoch date placeholder (1970-01-01)", () => {
    const violations: string[] = [];
    for (const book of sourceBooks) {
      const data = loadBookYaml(book);
      if (!data) continue;
      if (String(data.publishedDate ?? "") === EPOCH_DATE) {
        violations.push(book);
      }
    }
    if (violations.length > 0) {
      expect.fail(`Epoch date placeholder in:\n  ${violations.join("\n  ")}`);
    }
  });

  it("no _book.yaml uses PLACEHOLDER for price — must be $_.__ format", () => {
    const violations: string[] = [];
    for (const book of sourceBooks) {
      const data = loadBookYaml(book);
      if (!data) continue;
      const price = String(data.price ?? "");
      if (price === "PLACEHOLDER" || !PRICE_RE.test(price)) {
        violations.push(
          `${book}: price="${price}" (must be $_.__ e.g. $19.99)`,
        );
      }
    }
    if (violations.length > 0) {
      expect.fail(`Invalid price in:\n  ${violations.join("\n  ")}`);
    }
  });

  it("coverImage must be a local file and must exist in src/assets/covers/", () => {
    const violations: string[] = [];
    const coversDir = path.resolve(__dirname, "../../src/assets/covers");
    for (const book of sourceBooks) {
      const data = loadBookYaml(book);
      if (!data) continue;
      const cover = String(data.coverImage ?? "").trim();
      if (!cover || cover === "undefined") continue;

      if (
        cover.startsWith("http://") ||
        cover.startsWith("https://") ||
        cover.startsWith("//")
      ) {
        violations.push(`${book}: coverImage="${cover}" (cannot be a hotlink)`);
        continue;
      }

      if (!fs.existsSync(path.join(coversDir, cover))) {
        violations.push(
          `${book}: coverImage="${cover}" (file does not exist in src/assets/covers/)`,
        );
      }
    }
    if (violations.length > 0) {
      expect.fail(`Invalid coverImage in:\n  ${violations.join("\n  ")}`);
    }
  });
});
