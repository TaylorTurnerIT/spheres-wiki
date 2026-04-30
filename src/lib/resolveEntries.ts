// src/lib/resolveEntries.ts
import type {
  BookData,
  AnyEntry,
  SphereEntry,
  TalentEntry,
  ClassEntry,
  ArticleEntry,
  EntryKey,
  ResolvedMaps,
} from './types';

function entryKey(type: string, id: string): EntryKey {
  return `${type}:${id}`;
}

/**
 * Pure function — takes sorted or unsorted book array, returns resolved maps.
 * Books are sorted by publishedDate ascending before processing, so older
 * entries are always established before newer patches are applied.
 */
export function buildResolvedMaps(books: BookData[]): ResolvedMaps {
  const sorted = [...books].sort(
    (a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
  );

  const sphereMap = new Map<EntryKey, SphereEntry>();
  const talentMap = new Map<EntryKey, TalentEntry>();
  const classMap = new Map<EntryKey, ClassEntry>();
  const articleMap = new Map<EntryKey, ArticleEntry>();
  const entrySourceBook = new Map<EntryKey, string>();

  for (const book of sorted) {
    for (const entry of book.entries) {
      const key = entryKey(entry.type, entry.id);

      if (entry.modifies) {
        const patchKey = entryKey(entry.type, entry.modifies);
        applyPatch(entry, patchKey, { sphereMap, talentMap, classMap, articleMap });
      } else {
        storeEntry(entry, key, { sphereMap, talentMap, classMap, articleMap });
        entrySourceBook.set(key, book.slug);
      }
    }
  }

  return { sphereMap, talentMap, classMap, articleMap, entrySourceBook };
}

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
  // Strip modifies and id so the resolved entry retains its canonical id and
  // doesn't expose the errata book's internal fields.
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
  // If target not found, silently skip.
}

/**
 * Astro-aware wrapper. Import this in pages/layouts.
 * Cannot be called in vitest tests (depends on Astro runtime).
 */
export async function resolveEntries(): Promise<ResolvedMaps> {
  const { getCollection } = await import('astro:content');
  const rawBooks = await getCollection('books');
  const books: BookData[] = rawBooks.map((b) => b.data as BookData);
  return buildResolvedMaps(books);
}
