// src/lib/resolveEntries.ts

import {
  type AssignedIdentityRecord,
  assignSystemUniqueIds,
  contentEntryKey,
  type IdentityRecord,
} from "./entryIdentity";
import { normalizeEntryData } from "./entryNormalization";
import { systemIdKey } from "./systems";
import type {
  AnyEntry,
  ArchetypeEntry,
  ArchetypeFeatureEntry,
  ArticleEntry,
  BookMeta,
  BoonEntry,
  ClassEntry,
  ClassFeatureEntry,
  ClassTraitEntry,
  DrawbackEntry,
  EntryKey,
  FeatEntry,
  ResolvedMaps,
  SphereEntry,
  TagEntry,
  TalentEntry,
  TraditionEntry,
} from "./types";

type RawTagEntry = {
  id: string;
  label: string;
  color?: string;
  priority: number;
  description: string;
  featCategory?: boolean;
  system?: "power" | "might" | "guile" | "champions";
  sphere?: string;
  hidden?: boolean;
};

// ── Typed-map dispatch ───────────────────────────────────────────────────────

type EntryMaps = Pick<
  ResolvedMaps,
  | "sphereMap"
  | "talentMap"
  | "featMap"
  | "classMap"
  | "classFeatureMap"
  | "classTraitMap"
  | "articleMap"
  | "archetypeMap"
  | "archetypeFeatureMap"
  | "drawbackMap"
  | "boonMap"
  | "traditionMap"
>;

function discoverBookCollectionSlugs(
  bookMetaMap: Map<string, BookMeta>,
): string[] {
  const bookMarkdowns = import.meta.glob("/src/content/**/*.md");
  const slugsWithContent = new Set(
    Object.keys(bookMarkdowns).map((path) => path.split("/")[3]),
  );
  return [...bookMetaMap.keys()].filter((slug) => slugsWithContent.has(slug));
}

const TYPE_TO_MAP_KEY: Partial<Record<string, keyof EntryMaps>> = {
  sphere: "sphereMap",
  talent: "talentMap",
  feat: "featMap",
  class: "classMap",
  "class-feature": "classFeatureMap",
  "class-trait": "classTraitMap",
  article: "articleMap",
  archetype: "archetypeMap",
  "archetype-feature": "archetypeFeatureMap",
  drawback: "drawbackMap",
  boon: "boonMap",
  tradition: "traditionMap",
};

function getTypedMap(
  type: string,
  maps: EntryMaps,
): Map<EntryKey, any> | undefined {
  const key = TYPE_TO_MAP_KEY[type];
  return key ? maps[key] : undefined;
}

/** Fetch every real collection in parallel while preserving the book context. */
export async function fetchBookCollections<T>(
  slugs: string[],
  getCollection: (slug: string) => Promise<T[]>,
): Promise<Array<{ slug: string; entries: T[] }>> {
  return Promise.all(
    slugs.map(async (slug) => {
      try {
        return { slug, entries: await getCollection(slug) };
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new Error(
          `Failed to load content collection "${slug}": ${detail}`,
          { cause },
        );
      }
    }),
  );
}

function storeEntry(entry: AnyEntry, maps: EntryMaps): void {
  const key = systemIdKey(entry.system ?? "", entry.id);
  getTypedMap(entry.type, maps)?.set(key, entry);
}

function applyPatch(
  patch: AnyEntry,
  targetKey: string,
  maps: EntryMaps,
  entryPatchSourceBooks: Map<string, string[]>,
): void {
  const {
    modifies: _m,
    id: _i,
    type: _type,
    system: _system,
    sourceBook: _sourceBook,
    ...fieldsToMerge
  } = patch as AnyEntry & { modifies?: string };
  const map = getTypedMap(patch.type, maps);
  if (!map) return;

  const existing = map.get(targetKey);
  if (!existing) {
    throw new Error(
      `Patch target not found: ${patch.type}:${patch.system ?? "_"}:${patch.modifies}`,
    );
  }

  // A patch book is provenance for the change, not the source of the
  // resolved entry. Preserve the original source attribution.
  const resolvedKey = contentEntryKey(patch.type, existing.system, existing.id);
  const patchBooks = entryPatchSourceBooks.get(resolvedKey) ?? [];
  patchBooks.push(patch.sourceBook);
  entryPatchSourceBooks.set(resolvedKey, patchBooks);

  map.set(targetKey, {
    ...existing,
    ...fieldsToMerge,
    type: existing.type,
    id: existing.id,
    system: existing.system,
    sourceBook: existing.sourceBook,
  });
}

// ── Public pure functions (usable in unit tests) ─────────────────────────────

export function buildTagMap(
  books: Array<{ slug: string; rawTagEntries: RawTagEntry[] }>,
): Map<string, TagEntry> {
  const tagMap = new Map<string, TagEntry>();
  for (const book of books) {
    const seenInBook = new Set<string>();
    for (const raw of book.rawTagEntries) {
      if (seenInBook.has(raw.id)) {
        throw new Error(
          `Duplicate tag "${raw.id}" defined twice in "${book.slug}"`,
        );
      }
      seenInBook.add(raw.id);
      if (tagMap.has(raw.id)) {
        throw new Error(
          `Duplicate tag "${raw.id}" defined in both "${tagMap.get(raw.id)?.sourceBook}" and "${book.slug}"`,
        );
      }
      tagMap.set(raw.id, { type: "tag", ...raw, sourceBook: book.slug });
    }
  }
  return tagMap;
}

/**
 * Pure function for unit tests — no Astro runtime required.
 * Books sorted by publishedDate ascending before processing.
 */
export function buildResolvedMaps(
  books: Array<{
    slug: string;
    publishedDate: string;
    sourceBookTitle?: string;
    entries: AnyEntry[];
  }>,
): ResolvedMaps {
  const records: IdentityRecord<AnyEntry>[] = books.flatMap((book) =>
    book.entries.map((entry, sourceIndex) => ({
      sourceBook: book.slug,
      sourceBookTitle: book.sourceBookTitle,
      publishedDate: book.publishedDate,
      sourceIndex,
      entry,
    })),
  );

  return buildResolvedMapsFromAssigned(assignSystemUniqueIds(records));
}

// ── Astro-aware cache layer ──────────────────────────────────────────────────

let resolveEntriesCache: ResolvedMaps | null = null;
// Keyed "type:system:id" → raw Astro entry; populated in the same pass as
// resolveEntriesCache so every render uses the same assigned identity.
let collEntriesCache: Map<string, any> | null = null;

/**
 * Returns a map of "type:system:id" → raw Astro collection entry (for
 * render()).
 * Built in the same single-pass fetch as resolveEntries() — no second scan.
 * Always await resolveEntries() before this to warm the cache on first call.
 *
 * CONCURRENCY NOTE: prefer getCollEntriesMap() over looping BOOK_COLLECTIONS
 * with getCollection() in getStaticPaths(). The per-page loop is sequential
 * and runs once per page file; this cache runs once per build.
 */
export async function getCollEntriesMap(): Promise<Map<string, any>> {
  if (collEntriesCache) return collEntriesCache;
  await resolveEntries();
  if (!collEntriesCache) {
    throw new Error("Collection entries cache was not initialized");
  }
  return collEntriesCache;
}

export async function resolveEntries(): Promise<ResolvedMaps> {
  if (resolveEntriesCache) return resolveEntriesCache;
  const { getCollection } = await import("astro:content");

  const bookMetaMap = buildBookMetaMap(
    import.meta.glob<{ default: Omit<BookMeta, "slug"> }>(
      "/src/content/**/_book.yaml",
      { eager: true },
    ),
  );
  const collectionSlugs = discoverBookCollectionSlugs(bookMetaMap);

  // Fetch all book collections in parallel — eliminates sequential per-book await chain.
  const fetched = await fetchBookCollections(collectionSlugs, (slug) =>
    getCollection(slug as any),
  );

  const processed = fetched.map(({ slug, entries }) =>
    processBookEntries(slug, bookMetaMap.get(slug), entries),
  );

  const tagMap = buildTagMap(
    processed.map((p) => ({ slug: p.slug, rawTagEntries: p.tagEntries })),
  );
  const assigned = assignSystemUniqueIds(
    processed.flatMap((book) => book.contentRecords),
  ) as Array<AssignedIdentityRecord<AnyEntry> & { collEntry: any }>;
  const maps = buildResolvedMapsFromAssigned(assigned);

  collEntriesCache = new Map([
    ...assigned
      .filter(({ entry }) => !entry.modifies)
      .map(
        (record) =>
          [
            contentEntryKey(
              record.entry.type,
              record.entry.system,
              record.entry.id,
            ),
            {
              ...record.collEntry,
              data: { ...record.collEntry.data, ...record.entry },
            },
          ] as [string, any],
      ),
    ...processed.flatMap((book) => book.tagCollEntries),
  ]);

  injectSphereTags(maps.sphereMap, tagMap);

  resolveEntriesCache = { ...maps, bookMetaMap, tagMap };
  return resolveEntriesCache;
}

// ── resolveEntries helpers ───────────────────────────────────────────────────

function buildBookMetaMap(
  modules: Record<string, { default: Omit<BookMeta, "slug"> }>,
): Map<string, BookMeta> {
  const map = new Map<string, BookMeta>();
  for (const [path, mod] of Object.entries(modules)) {
    const slug = path.split("/").at(-2);
    if (!slug) continue;
    map.set(slug, { slug, ...mod.default });
  }
  return map;
}

type ProcessedBook = {
  slug: string;
  publishedDate: string;
  tagEntries: RawTagEntry[];
  tagCollEntries: Array<[string, any]>;
  contentRecords: Array<IdentityRecord<AnyEntry> & { collEntry: any }>;
};

type NormalizedBookEntry =
  | { kind: "tag"; tag: RawTagEntry; collEntry: any }
  | {
      kind: "content";
      record: IdentityRecord<AnyEntry> & { collEntry: any };
    };

function stringField(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") return value;
  }
  return undefined;
}

function normalizeBookEntry(
  slug: string,
  meta: BookMeta | undefined,
  publishedDate: string,
  sourceIndex: number,
  collectionEntry: any,
): NormalizedBookEntry | undefined {
  const merged = normalizeEntryData(
    collectionEntry.data as Record<string, unknown>,
    collectionEntry.id,
    meta?.system,
  );
  const type = stringField(merged.type);
  const id = stringField(merged.id);
  if (!type || !id) return undefined;

  // Path-derived identity is authoritative. Legacy frontmatter can still
  // provide fields absent from the path, and book metadata supplies the
  // system only for legacy layouts without a system directory.
  const withSource = {
    ...merged,
    sourceBook: slug,
  };

  if (type === "tag") {
    return {
      kind: "tag",
      tag: withSource as unknown as RawTagEntry,
      collEntry: collectionEntry,
    };
  }

  return {
    kind: "content",
    record: {
      sourceBook: slug,
      sourceBookTitle: meta?.title,
      publishedDate,
      sourceIndex,
      entry: withSource as AnyEntry,
      collEntry: collectionEntry,
    },
  };
}

function processBookEntries(
  slug: string,
  meta: BookMeta | undefined,
  rawEntries: any[],
): ProcessedBook {
  const publishedDate = meta?.publishedDate ?? "1970-01-01";
  const tagEntries: RawTagEntry[] = [];
  const tagCollEntries: Array<[string, any]> = [];
  const contentRecords: Array<IdentityRecord<AnyEntry> & { collEntry: any }> =
    [];

  for (const [sourceIndex, collectionEntry] of rawEntries.entries()) {
    const normalized = normalizeBookEntry(
      slug,
      meta,
      publishedDate,
      sourceIndex,
      collectionEntry,
    );
    if (!normalized) continue;

    if (normalized.kind === "tag") {
      tagEntries.push(normalized.tag);
      tagCollEntries.push([
        contentEntryKey("tag", undefined, normalized.tag.id),
        normalized.collEntry,
      ]);
      continue;
    }

    contentRecords.push(normalized.record);
  }

  return { slug, publishedDate, tagEntries, tagCollEntries, contentRecords };
}

function buildResolvedMapsFromAssigned(
  assigned: AssignedIdentityRecord<AnyEntry>[],
): ResolvedMaps {
  const entryMaps: EntryMaps = {
    sphereMap: new Map<EntryKey, SphereEntry>(),
    talentMap: new Map<EntryKey, TalentEntry>(),
    featMap: new Map<EntryKey, FeatEntry>(),
    classMap: new Map<EntryKey, ClassEntry>(),
    classFeatureMap: new Map<EntryKey, ClassFeatureEntry>(),
    classTraitMap: new Map<EntryKey, ClassTraitEntry>(),
    articleMap: new Map<EntryKey, ArticleEntry>(),
    archetypeMap: new Map<EntryKey, ArchetypeEntry>(),
    archetypeFeatureMap: new Map<EntryKey, ArchetypeFeatureEntry>(),
    drawbackMap: new Map<EntryKey, DrawbackEntry>(),
    boonMap: new Map<EntryKey, BoonEntry>(),
    traditionMap: new Map<EntryKey, TraditionEntry>(),
  };
  const entrySourceBook = new Map<string, string>();
  const entryPatchSourceBooks = new Map<string, string[]>();
  const patches: AssignedIdentityRecord<AnyEntry>[] = [];

  for (const record of assigned) {
    const { entry } = record;
    if (entry.modifies) {
      patches.push(record);
      continue;
    }

    storeEntry(entry, entryMaps);
    entrySourceBook.set(
      contentEntryKey(entry.type, entry.system, entry.id),
      record.sourceBook,
    );
  }

  // Apply patches only after every base entry is present. This keeps equal-date
  // tie-breaking deterministic without allowing a patch to run before its
  // target merely because its slug sorts first.
  for (const { entry } of patches) {
    const targetId = entry.modifies;
    if (!targetId) continue;
    applyPatch(
      entry,
      systemIdKey(entry.system ?? "", targetId),
      entryMaps,
      entryPatchSourceBooks,
    );
  }

  return {
    ...entryMaps,
    entrySourceBook,
    entryPatchSourceBooks,
    bookMetaMap: new Map<string, BookMeta>(),
    tagMap: new Map<string, TagEntry>(),
  };
}

function injectSphereTags(
  sphereMap: Map<EntryKey, SphereEntry>,
  tagMap: Map<string, TagEntry>,
): void {
  for (const [, sphere] of sphereMap) {
    const sphereTagId = `${sphere.id}-sphere`;
    if (!tagMap.has(sphereTagId)) {
      tagMap.set(sphereTagId, {
        type: "tag",
        id: sphereTagId,
        label: `${sphere.name} (Sphere)`,
        priority: 50,
        description: `Associated with the ${sphere.name} sphere.`,
        sourceBook: "__built-in__",
      });
    }
  }
}
