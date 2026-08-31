import { SYSTEMS } from "@/config/site";
import { contentEntryKey } from "@/lib/entryIdentity";
import { getFeatUrl } from "@/lib/featCategories";
import { getCollEntriesMap, resolveEntries } from "@/lib/resolveEntries";
import { buildSystemIdIndex, resolveSystem, systemIdKey } from "@/lib/systems";
import { buildOrderedTagIds } from "@/lib/tags";
import type { TagEntry } from "@/lib/types";

export type TagDetailRow = {
  id: string;
  name: string;
  system: string;
  href: string;
  sphereId?: string;
  entryType: "talent" | "feat" | "sphere";
  sphereName: string;
  sourceBook: string;
  tags: string[];
  tier?: string;
  /** Ordered badge ids for the row, excluding the browsed tag itself
      (re-showing it on its own detail page is pure redundancy). */
  badges: string[];
};

/** Rows rendered into the static HTML; the tail is served by
    tags/[tag]/data.json and rendered client-side (lib/tagDetailClient). */
export const TAG_DETAIL_SSR_CAP = 300;

export type TagDetailGroup = {
  systemLabel: string;
  entries: TagDetailRow[];
};

export type TagDetail = {
  tag: TagEntry;
  groups: TagDetailGroup[];
  collEntry: any;
  bookTitle: string;
  /** tag id -> label, for rendering badge rows without the full tagMap */
  tagLabels: Record<string, string>;
};

type Maps = Awaited<ReturnType<typeof resolveEntries>>;

// fallow-ignore-next-line complexity
function rowsFor(
  tagId: string,
  system: string,
  maps: Maps,
  sphereIndex: Map<string, any>,
): TagDetailRow[] {
  const { talentMap, featMap, sphereMap, bookMetaMap, tagMap } = maps;
  const rows: TagDetailRow[] = [];

  const badges = (entry: any) =>
    buildOrderedTagIds(entry, bookMetaMap, tagMap, { showHidden: true });
  const has = (entry: any) => badges(entry).includes(tagId);

  const sources: {
    entries: Iterable<[string, any]>;
    entryType: TagDetailRow["entryType"];
    href: (entry: any) => string;
    sphereOf: (entry: any) => string | undefined;
  }[] = [
    {
      entries: talentMap,
      entryType: "talent",
      href: (t) => `/${system}/${t.sphere}/${t.id}/`,
      sphereOf: (t) => t.sphere,
    },
    {
      entries: featMap,
      entryType: "feat",
      href: (f) => getFeatUrl(f, tagMap),
      sphereOf: (f) => f.sphere,
    },
    {
      entries: sphereMap,
      entryType: "sphere",
      href: (sp) => `/${system}/${sp.id}/`,
      sphereOf: (sp) => sp.id,
    },
  ];

  for (const { entries, entryType, href, sphereOf } of sources) {
    for (const [, entry] of entries) {
      if (entry.system !== system || !has(entry)) continue;
      const sphereId = sphereOf(entry);
      const sphere = sphereIndex.get(systemIdKey(system, sphereId ?? ""));
      rows.push({
        id: entry.id,
        name: entry.name,
        system,
        href: href(entry),
        sphereId,
        entryType,
        sphereName:
          sphere?.name ??
          sphereId ??
          (entryType === "feat" ? "General" : entryType),
        sourceBook: entry.sourceBook,
        tags: entry.tags,
        tier: entry.tier,
        badges: badges(entry).filter((id) => id !== tagId),
      });
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

let cache: Map<string, TagDetail> | null = null;

/**
 * Tag → grouped entry rows for the tag detail pages. Shared by the
 * tags/[tag] page (server-rendered head) and the tags/[tag]/data.json
 * endpoint (client-rendered tail). Memoized — the walk is O(tags × entries).
 */
// fallow-ignore-next-line complexity
export async function buildTagDetails(): Promise<Map<string, TagDetail>> {
  if (cache) return cache;
  const maps = await resolveEntries();
  const allCollEntries = await getCollEntriesMap();
  const sphereIndex = buildSystemIdIndex(maps.sphereMap.values());
  const tagLabels = Object.fromEntries(
    [...maps.tagMap.values()].map((t) => [t.id, t.label || t.id]),
  );

  cache = new Map();
  for (const [, tag] of maps.tagMap) {
    const groups: TagDetailGroup[] = [];
    for (const system of Object.keys(SYSTEMS)) {
      const entries = rowsFor(tag.id, system, maps, sphereIndex);
      if (entries.length > 0) {
        groups.push({
          systemLabel: resolveSystem(system)?.label ?? system,
          entries,
        });
      }
    }
    cache.set(tag.id, {
      tag,
      groups,
      collEntry: allCollEntries.get(contentEntryKey("tag", undefined, tag.id)),
      bookTitle:
        tag.sourceBook === "__built-in__"
          ? "Built-in"
          : (maps.bookMetaMap.get(tag.sourceBook)?.title ?? tag.sourceBook),
      tagLabels,
    });
  }
  return cache;
}
