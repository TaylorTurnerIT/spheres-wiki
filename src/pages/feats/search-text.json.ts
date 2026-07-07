/**
 * Lazy description-search text manifest for the feats browse page.
 *
 * Emits `{ [featHref]: lowercaseBodyText }` as a static JSON asset. The browse
 * page fetches it only when the reader turns on "Match description text", so no
 * feat body text ships in the initial `/feats/` HTML (spec §4.3). Keyed by the
 * canonical feat href, matching the `data-href` on each browse row.
 */
import { buildFeatSearchText } from "@/lib/featBrowse";
import { getCollEntriesMap, resolveEntries } from "@/lib/resolveEntries";

export async function GET() {
  const maps = await resolveEntries();
  const collEntriesMap = await getCollEntriesMap();
  const body = buildFeatSearchText(maps, collEntriesMap);
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}
