import { buildTagDetails, TAG_DETAIL_SSR_CAP } from "@/lib/tagDetail";

/**
 * Tail rows for tag detail pages: entries beyond the server-rendered cap,
 * fetched by lib/tagDetailClient after first paint. Keeping them out of the
 * static HTML bounds the four giant system-tag pages (the "talent" tag
 * alone renders 3,800 rows / 2.8MB of markup).
 */
export async function getStaticPaths() {
  const details = await buildTagDetails();
  return [...details.values()].map((detail) => ({
    params: { tag: detail.tag.id },
    props: { detail },
  }));
}

export const GET = async ({ props }: { props: { detail: any } }) => {
  const { detail } = props;

  // Flatten in the same group order the page renders its head rows; the
  // client skips the first SSR-capped rows and appends the rest.
  const tail: { g: number; n: string; u: string; s: string; b: string[] }[] =
    [];
  detail.groups.forEach((group: any, g: number) => {
    for (const row of group.entries) {
      tail.push({
        g,
        n: row.name,
        u: row.href,
        s: row.sphereName,
        b: row.badges,
      });
    }
  });

  return new Response(
    JSON.stringify({
      cap: TAG_DETAIL_SSR_CAP,
      groups: detail.groups.map((g: any) => g.systemLabel),
      labels: detail.tagLabels,
      total: tail.length,
      tail: tail.slice(TAG_DETAIL_SSR_CAP),
    }),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
};
