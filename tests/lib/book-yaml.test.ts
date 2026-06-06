import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

const REQUIRED_FIELDS = [
  "title",
  "publisher",
  "publishedDate",
  "price",
  "buyUrl",
  "coverImage",
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
      if (String(data["publishedDate"] ?? "") === EPOCH_DATE) {
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
      const price = String(data["price"] ?? "");
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
});
