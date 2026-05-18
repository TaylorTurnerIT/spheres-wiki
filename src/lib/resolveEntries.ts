// src/lib/resolveEntries.ts
import type {
  AnyEntry,
  SphereEntry,
  TalentEntry,
  FeatEntry,
  ClassEntry,
  ArticleEntry,
  TagEntry,
  EntryKey,
  ResolvedMaps,
  BookMeta,
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
};

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
          `Duplicate tag "${raw.id}" defined in both "${tagMap.get(raw.id)!.sourceBook}" and "${book.slug}"`,
        );
      }
      tagMap.set(raw.id, {
        type: "tag",
        ...raw,
        sourceBook: book.slug,
      });
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

  const sphereMap = new Map<EntryKey, SphereEntry>();
  const talentMap = new Map<EntryKey, TalentEntry>();
  const featMap = new Map<EntryKey, FeatEntry>();
  const classMap = new Map<EntryKey, ClassEntry>();
  const classFeatureMap = new Map<EntryKey, ClassFeatureEntry>();
  const articleMap = new Map<EntryKey, ArticleEntry>();
  const entrySourceBook = new Map<EntryKey, string>();
  const tagMap = new Map<string, TagEntry>();
  // bookMetaMap is always empty here — populated only by resolveEntries() which has Astro runtime access.
  const bookMetaMap = new Map<string, BookMeta>();

  for (const book of sorted) {
    for (const entry of book.entries) {
      const key = entryKey(entry.type, entry.id);
      if (entry.modifies) {
        applyPatch(entry, entryKey(entry.type, entry.modifies), {
          sphereMap,
          talentMap,
          featMap,
          classMap,
          classFeatureMap,
          articleMap,
        });
      } else {
        storeEntry(entry, key, {
          sphereMap,
          talentMap,
          featMap,
          classMap,
          classFeatureMap,
          articleMap,
        });
        entrySourceBook.set(key, book.slug);
      }
    }
  }

  return {
    sphereMap,
    talentMap,
    featMap,
    classMap,
    classFeatureMap,
    articleMap,
    entrySourceBook,
    bookMetaMap,
    tagMap,
  };
}

/**
 * Astro-aware wrapper. Import this in pages/layouts.
 * Cannot be called in vitest tests (depends on Astro runtime).
 */
export async function resolveEntries(): Promise<ResolvedMaps> {
  const { getCollection } = await import("astro:content");

  // Auto-discover books via _book.yaml files — no hardcoded list needed.
  const bookYamlModules = import.meta.glob<{ default: Omit<BookMeta, "slug"> }>(
    "/src/content/**/_book.yaml",
    { eager: true },
  );

  const bookMetaMap = new Map<string, BookMeta>();
  for (const [path, mod] of Object.entries(bookYamlModules)) {
    // path: "/src/content/spheres-of-power-core/_book.yaml"
    const slug = path.split("/").at(-2)!;
    bookMetaMap.set(slug, { slug, ...mod.default });
  }

  // Sort by publishedDate so older entries establish canonical records
  // before errata patches from newer books are applied.
  const allBooks: Array<{
    slug: string;
    publishedDate: string;
    entries: AnyEntry[];
  }> = [];
  const tagEntriesByBook: Array<{
    slug: string;
    rawTagEntries: RawTagEntry[];
  }> = [];

  for (const collectionSlug of bookMetaMap.keys()) {
    const meta = bookMetaMap.get(collectionSlug);
    const publishedDate = meta?.publishedDate ?? "1970-01-01";

    let rawEntries: Awaited<ReturnType<typeof getCollection>>;
    try {
      rawEntries = await getCollection(collectionSlug as any);
    } catch {
      // Collection directory may not exist yet for a listed-but-empty book
      rawEntries = [];
    }

    const tagEntries: RawTagEntry[] = rawEntries
      .filter((e) => (e.data as any).type === "tag")
      .map((e) => e.data as unknown as RawTagEntry);

    const contentEntries: AnyEntry[] = rawEntries
      .filter((e) => (e.data as any).type !== "tag")
      .map((e) => {
        const entry = e.data as AnyEntry;
        entry.sourceBook = collectionSlug;
        return entry;
      });

    tagEntriesByBook.push({ slug: collectionSlug, rawTagEntries: tagEntries });
    allBooks.push({
      slug: collectionSlug,
      publishedDate,
      entries: contentEntries,
    });
  }

  const tagMap = buildTagMap(tagEntriesByBook);

  const builtins: TagEntry[] = [
    {
      type: "tag",
      id: "talent",
      label: "Talent",
      priority: -10,
      description: "A magical ability.",
      sourceBook: "__builtin__",
      color: "var(--clr-power)",
    },
    {
      type: "tag",
      id: "feat",
      label: "Feat",
      priority: -10,
      description: "An extra ability.",
      sourceBook: "__builtin__",
      color: "#5a3000",
    },
    {
      type: "tag",
      id: "base",
      label: "Base Ability",
      priority: -9,
      description: "Base sphere ability.",
      sourceBook: "__builtin__",
      color: "#7a4800",
    },
    {
      type: "tag",
      id: "basic",
      label: "Basic",
      priority: -9,
      description: "Basic talent.",
      sourceBook: "__builtin__",
      color: "#1a6622",
    },
    {
      type: "tag",
      id: "advanced",
      label: "Advanced",
      priority: -9,
      description: "Advanced talent.",
      sourceBook: "__builtin__",
      color: "#203F58",
    },
    {
      type: "tag",
      id: "3pp",
      label: "3PP",
      priority: -9,
      description: "Content from a third-party publisher.",
      sourceBook: "__builtin__",
      color: "#7a4200",
    },
    {
      type: "tag",
      id: "sphere",
      label: "Sphere",
      priority: -10,
      description: "A base sphere.",
      sourceBook: "__builtin__",
      color: "var(--clr-brand)",
    },
  ];

  for (const b of builtins) {
    if (!tagMap.has(b.id)) tagMap.set(b.id, b);
  }

  const maps = buildResolvedMaps(allBooks);

  for (const [, sphere] of maps.sphereMap) {
    const sphereTagId = `${sphere.id}-sphere`;
    if (!tagMap.has(sphereTagId)) {
      tagMap.set(sphereTagId, {
        type: "tag",
        id: sphereTagId,
        label: `${sphere.name} (Sphere)`,
        priority: 50,
        description: `Associated with the ${sphere.name} sphere.`,
        sourceBook: "__builtin__",
        color: `var(--clr-${sphere.system})`,
      });
    }
  }

  return { ...maps, bookMetaMap, tagMap };
}

// ──── internal helpers ────────────────────────────────────────────────────

function storeEntry(
  entry: AnyEntry,
  key: EntryKey,
  maps: Pick<
    ResolvedMaps,
    | "sphereMap"
    | "talentMap"
    | "featMap"
    | "classMap"
    | "classFeatureMap"
    | "articleMap"
  >,
): void {
  if (entry.type === "sphere") maps.sphereMap.set(key, entry);
  else if (entry.type === "talent") maps.talentMap.set(key, entry);
  else if (entry.type === "feat") maps.featMap.set(key, entry);
  else if (entry.type === "class") maps.classMap.set(key, entry);
  else if (entry.type === "class-feature") maps.classFeatureMap.set(key, entry);
  else if (entry.type === "article") maps.articleMap.set(key, entry);
}

function applyPatch(
  patch: AnyEntry,
  targetKey: EntryKey,
  maps: Pick<
    ResolvedMaps,
    | "sphereMap"
    | "talentMap"
    | "featMap"
    | "classMap"
    | "classFeatureMap"
    | "articleMap"
  >,
): void {
  const {
    modifies: _m,
    id: _i,
    ...fieldsToMerge
  } = patch as AnyEntry & { modifies?: string };
  if (patch.type === "sphere" && maps.sphereMap.has(targetKey)) {
    maps.sphereMap.set(targetKey, {
      ...maps.sphereMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<SphereEntry>),
    });
  } else if (patch.type === "talent" && maps.talentMap.has(targetKey)) {
    maps.talentMap.set(targetKey, {
      ...maps.talentMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<TalentEntry>),
    });
  } else if (patch.type === "feat" && maps.featMap.has(targetKey)) {
    maps.featMap.set(targetKey, {
      ...maps.featMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<FeatEntry>),
    });
  } else if (patch.type === "class" && maps.classMap.has(targetKey)) {
    maps.classMap.set(targetKey, {
      ...maps.classMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<ClassEntry>),
    });
  } else if (
    patch.type === "class-feature" &&
    maps.classFeatureMap.has(targetKey)
  ) {
    maps.classFeatureMap.set(targetKey, {
      ...maps.classFeatureMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<ClassFeatureEntry>),
    });
  } else if (patch.type === "article" && maps.articleMap.has(targetKey)) {
    maps.articleMap.set(targetKey, {
      ...maps.articleMap.get(targetKey)!,
      ...(fieldsToMerge as Partial<ArticleEntry>),
    });
  }
}
