/** Native facets must carry the same values used by the search result cards. */
export function buildPagefindFilters(
  meta: Record<string, string>,
  extra: string[] = [],
): string[] {
  const filters = new Set(extra.filter(Boolean));
  for (const key of ["system", "type", "sphere"]) {
    if (meta[key]) filters.add(`${key}:${meta[key]}`);
  }
  for (const tag of (meta.tags ?? "").split(",")) {
    if (tag.trim()) filters.add(`tags:${tag.trim()}`);
  }
  return [...filters];
}
