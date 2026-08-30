import type { BookMeta } from "@/lib/types";

/**
 * Book curation policies shared by the home page (StoreBar) and the store
 * index: official-publisher set, core-book slugs, publisher normalization,
 * first/third-party classification, and newest-first ordering. The pages
 * keep only their presentation decisions (placeholders, exclusions).
 */

export const CORE_BOOK_SLUGS = [
  "ultimate-spheres-of-power",
  "spheres-of-might",
  "spheres-of-guile",
  "champions-of-the-spheres",
];

const OFFICIAL_PUBLISHERS = new Set([
  "Drop Dead Studios",
  "Diamond Recreational Studios",
]);

export function bookPublisher(book: Pick<BookMeta, "publisher">): string {
  return typeof book.publisher === "string" && book.publisher.trim() !== ""
    ? book.publisher
    : "Unknown";
}

export function isOfficialPublisher(
  book: Pick<BookMeta, "publisher">,
): boolean {
  return OFFICIAL_PUBLISHERS.has(bookPublisher(book));
}

/** Third-party books worth surfacing: named, non-official, not internal slugs. */
export function isVisibleThirdParty(
  book: Pick<BookMeta, "publisher">,
): boolean {
  const publisher = bookPublisher(book);
  return (
    !OFFICIAL_PUBLISHERS.has(publisher) &&
    publisher !== "Unknown" &&
    !publisher.startsWith("__")
  );
}

export function byNewestFirst(
  a: Pick<BookMeta, "publishedDate">,
  b: Pick<BookMeta, "publishedDate">,
): number {
  return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
}

/** Newest book matching the predicate, or undefined. */
export function latestBook(
  books: BookMeta[],
  predicate: (book: BookMeta) => boolean,
): BookMeta | undefined {
  return books.filter(predicate).sort(byNewestFirst)[0];
}

/** Core system books in canonical order (missing slugs omitted). */
export function coreBooksOf(
  bookMetaMap: Map<string, BookMeta>,
): BookMeta[] {
  return CORE_BOOK_SLUGS.map((slug) => bookMetaMap.get(slug)).filter(
    (b): b is BookMeta => b !== undefined,
  );
}

/** Group books by normalized publisher, groups sorted by size (desc), books newest-first. */
export function groupByPublisher(books: BookMeta[]): { name: string; books: BookMeta[] }[] {
  const groups = new Map<string, BookMeta[]>();
  for (const book of books) {
    const publisher = bookPublisher(book);
    (groups.get(publisher) ?? groups.set(publisher, []).get(publisher)!).push(book);
  }
  return [...groups.entries()]
    .map(([name, group]) => ({ name, books: group.sort(byNewestFirst) }))
    .sort((a, b) => b.books.length - a.books.length);
}
