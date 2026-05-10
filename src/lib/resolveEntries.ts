// src/lib/resolveEntries.ts
import type { AnyEntry, SphereEntry, TalentEntry, ClassEntry, ArticleEntry, EntryKey, ResolvedMaps, BookMeta } from './types';

function entryKey(type: string, id: string): EntryKey {
  return `${type}:${id}`;
}

/**
 * Pure function for unit tests — no Astro runtime required.
 * Books sorted by publishedDate ascending before processing.
 */
export function buildResolvedMaps(
  books: Array<{ slug: string; publishedDate: string; entries: AnyEntry[] }>
): ResolvedMaps {
  const sorted = [...books].sort(
    (a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
  );

  const sphereMap = new Map<EntryKey, SphereEntry>();
  const talentMap = new Map<EntryKey, TalentEntry>();
  const classMap = new Map<EntryKey, ClassEntry>();
  const articleMap = new Map<EntryKey, ArticleEntry>();
  const entrySourceBook = new Map<EntryKey, string>();
  const bookMetaMap = new Map<string, BookMeta>();

  for (const book of sorted) {
    for (const entry of book.entries) {
      const key = entryKey(entry.type, entry.id);
      if (entry.modifies) {
        applyPatch(entry, entryKey(entry.type, entry.modifies), { sphereMap, talentMap, classMap, articleMap });
      } else {
        storeEntry(entry, key, { sphereMap, talentMap, classMap, articleMap });
        entrySourceBook.set(key, book.slug);
      }
    }
  }

  return { sphereMap, talentMap, classMap, articleMap, entrySourceBook, bookMetaMap };
}

/**
 * Astro-aware wrapper. Import this in pages/layouts.
 * Cannot be called in vitest tests (depends on Astro runtime).
 */
export async function resolveEntries(): Promise<ResolvedMaps> {
  const { getCollection } = await import('astro:content');
  const { BOOK_COLLECTIONS } = await import('@/content/config');

  // Load _book.yaml metadata via import.meta.glob
  const bookYamlModules = import.meta.glob<{ default: Omit<BookMeta, 'slug'> }>(
    '/src/content/**/_book.yaml',
    { eager: true }
  );

  const bookMetaMap = new Map<string, BookMeta>();
  for (const [path, mod] of Object.entries(bookYamlModules)) {
    // path: "/src/content/spheres-of-power-core/_book.yaml"
    const slug = path.split('/').at(-2)!;
    bookMetaMap.set(slug, { slug, ...mod.default });
  }

  // Sort by publishedDate so older entries establish canonical records
  // before errata patches from newer books are applied.
  const allBooks: Array<{ slug: string; publishedDate: string; entries: AnyEntry[] }> = [];

  for (const collectionSlug of BOOK_COLLECTIONS) {
    const meta = bookMetaMap.get(collectionSlug);
    const publishedDate = meta?.publishedDate ?? '1970-01-01';

    let rawEntries: Awaited<ReturnType<typeof getCollection>>;
    try {
      rawEntries = await getCollection(collectionSlug);
    } catch {
      // Collection directory may not exist yet for a listed-but-empty book
      rawEntries = [];
    }

    const entries: AnyEntry[] = rawEntries.map((e) => {
      // Astro collection entry id is "collection-slug/filename" for content collections.
      // Strip the collection prefix and .md extension to get the bare slug.
      const bareId = e.id.replace(/^[^/]+\//, '').replace(/\.md$/, '');
      return { ...(e.data as AnyEntry), id: bareId };
    });

    allBooks.push({ slug: collectionSlug, publishedDate, entries });
  }

  const maps = buildResolvedMaps(allBooks);
  return { ...maps, bookMetaMap };
}

// ──── internal helpers ────────────────────────────────────────────────────

function storeEntry(
  entry: AnyEntry,
  key: EntryKey,
  maps: Pick<ResolvedMaps, 'sphereMap' | 'talentMap' | 'classMap' | 'articleMap'>
): void {
  if (entry.type === 'sphere') maps.sphereMap.set(key, entry);
  else if (entry.type === 'talent') maps.talentMap.set(key, entry);
  else if (entry.type === 'class') maps.classMap.set(key, entry);
  else if (entry.type === 'article') maps.articleMap.set(key, entry);
}

function applyPatch(
  patch: AnyEntry,
  targetKey: EntryKey,
  maps: Pick<ResolvedMaps, 'sphereMap' | 'talentMap' | 'classMap' | 'articleMap'>
): void {
  const { modifies: _m, id: _i, ...fieldsToMerge } = patch as AnyEntry & { modifies?: string };
  if (patch.type === 'sphere' && maps.sphereMap.has(targetKey)) {
    maps.sphereMap.set(targetKey, { ...maps.sphereMap.get(targetKey)!, ...(fieldsToMerge as Partial<SphereEntry>) });
  } else if (patch.type === 'talent' && maps.talentMap.has(targetKey)) {
    maps.talentMap.set(targetKey, { ...maps.talentMap.get(targetKey)!, ...(fieldsToMerge as Partial<TalentEntry>) });
  } else if (patch.type === 'class' && maps.classMap.has(targetKey)) {
    maps.classMap.set(targetKey, { ...maps.classMap.get(targetKey)!, ...(fieldsToMerge as Partial<ClassEntry>) });
  } else if (patch.type === 'article' && maps.articleMap.has(targetKey)) {
    maps.articleMap.set(targetKey, { ...maps.articleMap.get(targetKey)!, ...(fieldsToMerge as Partial<ArticleEntry>) });
  }
}
