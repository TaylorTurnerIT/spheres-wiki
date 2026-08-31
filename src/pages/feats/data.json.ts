import { SYSTEMS } from "@/config/site";
import {
  BROWSE_SSR_CAP,
  browseSearchText,
  buildFeatBrowseRows,
} from "@/lib/featBrowse";
import { getCollEntriesMap, resolveEntries } from "@/lib/resolveEntries";

/**
 * Tail rows for the feats catalog: entries beyond the server-rendered cap,
 * fetched and appended by lib/browseFilterClient on idle. Keeps the catalog
 * HTML light (the fully server-rendered table was ~2.5MB).
 */
export const GET = async () => {
  const maps = await resolveEntries();
  const collEntriesMap = await getCollEntriesMap();
  const rows = buildFeatBrowseRows(maps, collEntriesMap);

  const tail = rows.slice(BROWSE_SSR_CAP).map((r) => ({
    n: r.name,
    u: r.href,
    sys: r.system,
    k: r.cssKey,
    sl: SYSTEMS[r.system]?.label ?? r.system,
    cat: r.category,
    cl: r.categoryLabel,
    t: r.tags,
    p: r.prerequisites,
    m: r.summary,
    q: browseSearchText(r, maps.tagMap),
  }));

  return new Response(
    JSON.stringify({ cap: BROWSE_SSR_CAP, total: rows.length, tail }),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
};
