import { describe, it, expect } from "vitest";
import {
  CORE_BOOK_SLUGS,
  bookPublisher,
  isOfficialPublisher,
  isVisibleThirdParty,
  byNewestFirst,
  latestBook,
  coreBooksOf,
  groupByPublisher,
} from "@/lib/bookCuration";
import type { BookMeta } from "@/lib/types";

const book = (over: Partial<BookMeta>): BookMeta => ({
  slug: "b",
  title: "B",
  publisher: "Drop Dead Studios",
  publishedDate: "2020-01-01",
  ...over,
});

describe("bookCuration", () => {
  it("normalizes blank publishers to Unknown", () => {
    expect(bookPublisher(book({ publisher: "  " }))).toBe("Unknown");
    expect(bookPublisher(book({ publisher: "Acme Press" }))).toBe("Acme Press");
  });

  it("classifies official vs visible third party", () => {
    expect(isOfficialPublisher(book({ publisher: "Drop Dead Studios" }))).toBe(true);
    expect(isOfficialPublisher(book({ publisher: "Diamond Recreational Studios" }))).toBe(true);
    expect(isOfficialPublisher(book({ publisher: "Acme" }))).toBe(false);
    expect(isVisibleThirdParty(book({ publisher: "Acme Press" }))).toBe(true);
    expect(isVisibleThirdParty(book({ publisher: "Drop Dead Studios" }))).toBe(false);
    expect(isVisibleThirdParty(book({ publisher: "Unknown" }))).toBe(false);
    expect(isVisibleThirdParty(book({ publisher: "__internal__" }))).toBe(false);
  });

  it("sorts newest first", () => {
    const a = book({ slug: "old", publishedDate: "2019-01-01" });
    const b = book({ slug: "new", publishedDate: "2024-01-01" });
    expect(byNewestFirst(b, a)).toBeLessThanOrEqual(0);
    expect([...[a, b]].sort(byNewestFirst)[0]).toBe(b);
  });

  it("picks latest matching book", () => {
    const books = [
      book({ slug: "a", publisher: "X", publishedDate: "2020-01-01" }),
      book({ slug: "b", publisher: "Acme", publishedDate: "2023-01-01" }),
      book({ slug: "c", publisher: "Acme", publishedDate: "2022-01-01" }),
    ];
    expect(latestBook(books, isVisibleThirdParty)?.slug).toBe("b");
    expect(latestBook(books, () => false)).toBeUndefined();
  });

  it("returns core books in canonical order, omitting missing", () => {
    const map = new Map<string, BookMeta>([
      ["spheres-of-might", book({ slug: "spheres-of-might" })],
      ["ultimate-spheres-of-power", book({ slug: "ultimate-spheres-of-power" })],
    ]);
    expect(coreBooksOf(map).map(b => b.slug)).toEqual([
      "ultimate-spheres-of-power",
      "spheres-of-might",
    ]);
  });

  it("groups by publisher sorted by size desc, books newest first", () => {
    const books = [
      book({ slug: "1", publisher: "A", publishedDate: "2020-01-01" }),
      book({ slug: "2", publisher: "A", publishedDate: "2023-01-01" }),
      book({ slug: "3", publisher: "Acme Press", publishedDate: "2021-01-01" }),
    ];
    const groups = groupByPublisher(books);
    expect(groups[0].name).toBe("A");
    expect(groups[0].books[0].slug).toBe("2");
    expect(groups[1].name).toBe("Acme Press");
  });

  it("exposes four core slugs", () => {
    expect(CORE_BOOK_SLUGS).toHaveLength(4);
  });
});
