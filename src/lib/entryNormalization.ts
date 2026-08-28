import { inferFromPath } from "./inferFromPath";

/**
 * Merge raw frontmatter with path-derived identity fields.
 *
 * Path inference wins for fields encoded by the directory (`type`, `id`,
 * `system`, and relationship fields). Legacy root-level entries may still
 * supply `system` through frontmatter or book metadata when the path has no
 * system segment. Callers add the owning book as `sourceBook` after this
 * normalization step.
 */
export function normalizeEntryData(
  raw: Record<string, unknown>,
  fileId: string,
  bookSystem?: string,
): Record<string, unknown> {
  const inferred = inferFromPath(fileId);
  const type = inferred.type ?? raw.type;
  const id = inferred.id ?? raw.id;
  const system = inferred.system ?? raw.system ?? bookSystem;

  return {
    ...raw,
    ...inferred,
    ...(type !== undefined ? { type } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(system !== undefined ? { system } : {}),
  };
}
