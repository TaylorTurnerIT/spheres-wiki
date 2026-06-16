// src/lib/resolveEntries.ts
import { inferFromPath } from "./inferFromPath";
import type {
  AnyEntry,
  ArchetypeEntry,
  ArchetypeFeatureEntry,
  ArticleEntry,
  BookMeta,
  ClassEntry,
  ClassFeatureEntry,
  ClassTraitEntry,
  EntryKey,
  FeatEntry,
  ResolvedMaps,
  SphereEntry,
  TagEntry,
  TalentEntry,
} from "./types";

function entryKey(type: string, id: string): EntryKey {
  return `${type}:${id}`;
}

type RawTagEntry = {
  id: string;
  label: string;
  color?: string;
  priority: number;
  description: string;
  sphere?: string;
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
>;

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
};

function getTypedMap(
  type: string,
  maps: EntryMaps,
): Map<EntryKey, any> | undefined {
  const key = TYPE_TO_MAP_KEY[type];
  return key ? maps[key] : undefined;
}

function storeEntry(entry: AnyEntry, key: EntryKey, maps: EntryMaps): void {
  getTypedMap(entry.type, maps)?.set(key, entry);
}

function applyPatch(
  patch: AnyEntry,
  targetKey: EntryKey,
  maps: EntryMaps,
): void {
  const {
    modifies: _m,
    id: _i,
    ...fieldsToMerge
  } = patch as AnyEntry & { modifies?: string };
  const map = getTypedMap(patch.type, maps);
  if (!map) return;

  const existing = map.get(targetKey);
  if (existing) {
    map.set(targetKey, { ...existing, ...fieldsToMerge });
  }
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
  books: Array<{ slug: string; publishedDate: string; entries: AnyEntry[] }>,
): ResolvedMaps {
  const sorted = [...books].sort(
    (a, b) =>
      new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime(),
  );

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
  };
  const entrySourceBook = new Map<EntryKey, string>();
  // bookMetaMap populated only by resolveEntries() — empty here.
  const bookMetaMap = new Map<string, BookMeta>();
  const tagMap = new Map<string, TagEntry>();

  for (const book of sorted) {
    for (const entry of book.entries) {
      const key = entryKey(entry.type, entry.id);
      if (entry.modifies) {
        applyPatch(entry, entryKey(entry.type, entry.modifies), entryMaps);
      } else {
        storeEntry(entry, key, entryMaps);
        entrySourceBook.set(key, book.slug);
      }
    }
  }

  return { ...entryMaps, entrySourceBook, bookMetaMap, tagMap };
}

// ── Astro-aware cache layer ──────────────────────────────────────────────────

let resolveEntriesCache: ResolvedMaps | null = null;
// Keyed "type:id" → raw Astro entry; populated in the same pass as resolveEntriesCache.
let collEntriesCache: Map<string, any> | null = null;

/**
 * Returns a map of "type:id" → raw Astro collection entry (for render()).
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

  // Fetch all book collections in parallel — eliminates sequential per-book await chain.
  const fetched = await Promise.all(
    [...bookMetaMap.keys()].map(async (slug) => {
      try {
        return { slug, entries: await getCollection(slug as any) };
      } catch {
        return {
          slug,
          entries: [] as Awaited<ReturnType<typeof getCollection>>,
        };
      }
    }),
  );

  const processed = fetched.map(({ slug, entries }) =>
    processBookEntries(slug, bookMetaMap.get(slug), entries),
  );

  collEntriesCache = new Map(processed.flatMap((p) => p.collEntries));

  const tagMap = buildTagMap(
    processed.map((p) => ({ slug: p.slug, rawTagEntries: p.tagEntries })),
  );
  const maps = buildResolvedMaps(
    processed.map((p) => ({
      slug: p.slug,
      publishedDate: p.publishedDate,
      entries: p.contentEntries,
    })),
  );

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
  contentEntries: AnyEntry[];
  tagEntries: RawTagEntry[];
  collEntries: Array<[string, any]>;
};

function processBookEntries(
  slug: string,
  meta: BookMeta | undefined,
  rawEntries: any[],
): ProcessedBook {
  const publishedDate = meta?.publishedDate ?? "1970-01-01";
  // Hoist system overlay so the ternary isn't inside the per-entry loop.
  const systemOverlay =
    meta?.system !== undefined ? { system: meta.system } : {};
  const tagEntries: RawTagEntry[] = [];
  const contentEntries: AnyEntry[] = [];
  const collEntries: Array<[string, any]> = [];

  for (const e of rawEntries) {
    const inferred = inferFromPath(e.id);
    const raw = e.data as Record<string, unknown>;
    const effectiveType = raw.type ?? inferred.type;

    // Merge: inferred base → book system default → frontmatter override → sourceBook
    const merged = { ...inferred, ...systemOverlay, ...raw, sourceBook: slug };

    // collEntries push is merged into each branch — avoids a second effectiveType check.
    if (effectiveType === "tag") {
      tagEntries.push(merged as unknown as RawTagEntry);
      collEntries.push([`tag:${raw.id as string}`, e]);
    } else if (effectiveType !== undefined) {
      contentEntries.push(merged as AnyEntry);
      collEntries.push([`${effectiveType}:${raw.id as string}`, e]);
    }
  }

  return { slug, publishedDate, contentEntries, tagEntries, collEntries };
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
        color: `var(--clr-${sphere.system})`,
      });
    }
  }
}
