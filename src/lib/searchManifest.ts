import { SYSTEMS } from "@/config/site";
import { getFeatUrl } from "@/lib/featCategories";
import { resolveEntries } from "@/lib/resolveEntries";
import { CLASS_SUBTITLES } from "@/lib/searchData";
import { systemIdKey } from "@/lib/systems";
import { buildOrderedTagIds } from "@/lib/tags";
import { url } from "@/lib/url";

export type ManifestEntry = {
  url: string;
  title: string;
  system: string;
  type: string;
  sphere?: string;
  tags?: string;
  icon?: string;
  talentCount?: number;
  subtitle?: string;
  image?: string;
};

type ManifestMaps = Awaited<ReturnType<typeof resolveEntries>>;

function add<T>(
  manifest: ManifestEntry[],
  entries: Iterable<T>,
  build: (entry: T, maps: ManifestMaps) => ManifestEntry | null,
  maps: ManifestMaps,
): void {
  for (const entry of entries) {
    const item = build(entry, maps);
    if (item) manifest.push(item);
  }
}

/**
 * Build the /search/ browse-all manifest: every public entry rendered as a
 * result card. Shared by the search page (SSR count + first cards) and the
 * search/data.json endpoint the client fetches on load.
 */
export async function buildSearchManifest(): Promise<ManifestEntry[]> {
  const maps = await resolveEntries();
  const { sphereMap, tagMap, bookMetaMap } = maps;
  const manifest: ManifestEntry[] = [];
  const tags = (entry: any) =>
    buildOrderedTagIds(entry, bookMetaMap, tagMap).join(", ");

  add(
    manifest,
    sphereMap.values(),
    (s, m) => {
      if (!SYSTEMS[s.system]) return null;
      const count = [...m.talentMap.values()].filter(
        (t) =>
          (t.sphere === s.id ||
            t.dualSphere === s.id ||
            t.dualSphere === "any") &&
          t.system === s.system,
      ).length;
      return {
        url: url(`/${s.system}/${s.id}/`),
        title: s.name,
        system: SYSTEMS[s.system].label,
        type: "sphere",
        tags: tags(s),
        icon: s.icon,
        talentCount: count,
      };
    },
    maps,
  );

  add(
    manifest,
    maps.talentMap.values(),
    (t, m) => {
      if (!SYSTEMS[t.system]) return null;
      const sph = m.sphereMap.get(systemIdKey(t.system, t.sphere));
      return {
        url: url(`/${t.system}/${t.sphere}/${t.id}/`),
        title: t.name,
        system: SYSTEMS[t.system].label,
        type: "talent",
        sphere: sph?.name ?? t.sphere,
        tags: tags(t),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.featMap.values(),
    // fallow-ignore-next-line complexity
    (f, m) => {
      if (!SYSTEMS[f.system]) return null;
      const sph = m.sphereMap.get(systemIdKey(f.system, f.sphere ?? ""));
      return {
        url: url(getFeatUrl(f, tagMap)),
        title: f.name,
        system: SYSTEMS[f.system].label,
        type: "feat",
        sphere: sph?.name ?? f.sphere,
        tags: tags(f),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.classMap.values(),
    (c) => {
      if (!SYSTEMS[c.system]) return null;
      return {
        url: url(`/${c.system}/classes/${c.id}/`),
        title: c.name,
        system: SYSTEMS[c.system].label,
        type: "class",
        tags: tags(c),
        subtitle: CLASS_SUBTITLES[c.id],
        image: c.id,
      };
    },
    maps,
  );

  add(
    manifest,
    maps.archetypeMap.values(),
    (a) => {
      if (!SYSTEMS[a.system]) return null;
      return {
        url: url(`/${a.system}/classes/${a.className}/${a.id}/`),
        title: a.name,
        system: SYSTEMS[a.system].label,
        type: "archetype",
        tags: tags(a),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.articleMap.values(),
    (a) => {
      const articleUrl = a.system
        ? url(`/${a.system}/articles/${a.id}/`)
        : url(`/articles/${a.id}/`);
      return {
        url: articleUrl,
        title: a.name,
        system:
          a.system && SYSTEMS[a.system] ? SYSTEMS[a.system].label : "General",
        type: "article",
        tags: tags(a),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.classTraitMap.values(),
    (t) => {
      if (!SYSTEMS[t.system]) return null;
      return {
        url: url(`/${t.system}/classes/${t.className}/traits/${t.id}/`),
        title: t.name,
        system: SYSTEMS[t.system].label,
        type: "class-trait",
        tags: tags(t),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.drawbackMap.values(),
    (d) => {
      if (d.system !== "power") return null;
      return {
        url: url(`/power/casting-traditions/#${d.id}`),
        title: d.name,
        system: SYSTEMS.power.label,
        type: "drawback",
        tags: tags(d),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.boonMap.values(),
    (b) => {
      if (b.system !== "power") return null;
      return {
        url: url(`/power/casting-traditions/#${b.id}`),
        title: b.name,
        system: SYSTEMS.power.label,
        type: "boon",
        tags: tags(b),
      };
    },
    maps,
  );

  add(
    manifest,
    maps.traditionMap.values(),
    (t) => {
      if (t.system !== "power") return null;
      return {
        url: url(`/power/casting-traditions/#${t.id}`),
        title: t.name,
        system: SYSTEMS.power.label,
        type: "tradition",
        tags: tags(t),
      };
    },
    maps,
  );

  return manifest;
}
