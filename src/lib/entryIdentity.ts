/**
 * Identity and collision handling for content entries.
 *
 * An entry id is unique within an entry type and system.  Different systems
 * may reuse the same id.  When two entries from the same system and type use
 * the same id, the oldest entry keeps the original id and later entries get a
 * source-book suffix (for example `ability-sop`).
 */

export type IdentityEntry = {
  type: string;
  id: string;
  system?: string;
  modifies?: string;
};

export type IdentityRecord<T extends IdentityEntry = IdentityEntry> = {
  sourceBook: string;
  sourceBookTitle?: string;
  publishedDate: string;
  sourceIndex: number;
  entry: T;
};

export type AssignedIdentityRecord<T extends IdentityEntry = IdentityEntry> =
  IdentityRecord<T> & {
    originalId: string;
  };

export type IdentityCollision = {
  legacyKey: string;
  scopedKey: string;
  entries: Array<{
    sourceBook: string;
    sourceBookTitle?: string;
    system?: string;
    publishedDate: string;
    sourceIndex: number;
    originalId: string;
    assignedId: string;
  }>;
};

/** Key used by typed resolved maps and raw collection-entry caches. */
export function contentEntryKey(
  type: string,
  system: string | undefined,
  id: string,
): string {
  return `${type}:${system ?? "_"}:${id}`;
}

/**
 * Return clean lowercase initials suitable for a kebab-case id suffix.
 * Unicode accents and punctuation are removed; a slug fallback guarantees a
 * usable result for a title containing no ASCII letters or digits.
 */
export function sourceBookInitials(
  sourceBookTitle: string | undefined,
  sourceBookSlug: string,
): string {
  const source = sourceBookTitle || sourceBookSlug;
  const ascii = source.normalize("NFKD").replace(/[^\p{ASCII}]/gu, "");
  const words = ascii.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const initials = words
    .map((word) => word[0])
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (initials) return initials;

  const fallback = sourceBookSlug
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return fallback || "source";
}

function systemScope(system: string | undefined): string {
  return system ?? "_";
}

function scopedIdKey(
  type: string,
  system: string | undefined,
  id: string,
): string {
  return `${type}:${systemScope(system)}:${id}`;
}

function compareRecords<T extends IdentityEntry>(
  a: IdentityRecord<T>,
  b: IdentityRecord<T>,
): number {
  const aTime = Date.parse(a.publishedDate);
  const bTime = Date.parse(b.publishedDate);
  const aDate = Number.isNaN(aTime) ? 0 : aTime;
  const bDate = Number.isNaN(bTime) ? 0 : bTime;
  return (
    aDate - bDate ||
    a.sourceBook.localeCompare(b.sourceBook) ||
    a.sourceIndex - b.sourceIndex
  );
}

function nextAvailableId(
  type: string,
  originalId: string,
  suffix: string,
  scope: string,
  used: Set<string>,
): string {
  const base = `${originalId}-${suffix}`;
  let candidate = base;
  let attempt = 2;
  while (used.has(scopedIdKey(type, scope, candidate))) {
    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
  return candidate;
}

function rewriteRelatedId(
  type: string,
  system: string | undefined,
  id: string | undefined,
  sourceBook: string,
  byAssignedId: Map<string, AssignedIdentityRecord[]>,
  byOriginalId: Map<string, AssignedIdentityRecord[]>,
): string | undefined {
  if (!id) return id;

  const assigned = byAssignedId.get(scopedIdKey(type, system, id));
  if (assigned?.length === 1) return assigned[0].entry.id;

  const original = byOriginalId.get(scopedIdKey(type, system, id));
  if (!original?.length) return id;

  return (
    original.find((record) => record.sourceBook === sourceBook)?.entry.id ??
    original[0].entry.id
  );
}

type RelatedIdRewriter = (type: string, id: unknown) => unknown;
type RelationshipRewriter = (
  entry: Record<string, unknown>,
  rewrite: RelatedIdRewriter,
) => void;

const RELATIONSHIP_REWRITERS: Record<string, RelationshipRewriter> = {
  talent: (entry, rewrite) => {
    entry.sphere = rewrite("sphere", entry.sphere);
    entry.dualSphere = rewrite("sphere", entry.dualSphere);
  },
  feat: (entry, rewrite) => {
    entry.sphere = rewrite("sphere", entry.sphere);
    entry.dualSphere = rewrite("sphere", entry.dualSphere);
  },
  "class-feature": (entry, rewrite) => {
    entry.className = rewrite("class", entry.className);
  },
  "class-trait": (entry, rewrite) => {
    entry.className = rewrite("class", entry.className);
    entry.featureId = rewrite("class-feature", entry.featureId);
  },
  archetype: (entry, rewrite) => {
    entry.className = rewrite("class", entry.className);
  },
  "archetype-feature": (entry, rewrite) => {
    entry.archetypeId = rewrite("archetype", entry.archetypeId);
  },
  drawback: (entry, rewrite) => {
    entry.sphere = rewrite("sphere", entry.sphere);
    if (Array.isArray(entry.spheres)) {
      entry.spheres = entry.spheres.map((sphere) => rewrite("sphere", sphere));
    }
  },
};

function rewriteEntryRelationships<T extends IdentityEntry>(
  record: AssignedIdentityRecord<T>,
  byAssignedId: Map<string, AssignedIdentityRecord[]>,
  byOriginalId: Map<string, AssignedIdentityRecord[]>,
): AssignedIdentityRecord<T> {
  const entry = record.entry as IdentityEntry & Record<string, unknown>;
  const system = entry.system;
  const sourceBook = record.sourceBook;
  const rewrite = (type: string, id: unknown): unknown =>
    typeof id === "string"
      ? rewriteRelatedId(
          type,
          system,
          id,
          sourceBook,
          byAssignedId,
          byOriginalId,
        )
      : id;

  const rewritten: Record<string, unknown> = { ...entry };

  if (typeof entry.modifies === "string") {
    rewritten.modifies = rewrite(entry.type, entry.modifies);
  }

  RELATIONSHIP_REWRITERS[entry.type]?.(rewritten, rewrite);

  return { ...record, entry: rewritten as T };
}

/**
 * Assign deterministic, system-scoped ids without dropping any entry.
 * Explicit ids are reserved before generated suffixes are chosen, so a
 * generated id can never steal an id already present in the content corpus.
 */
export function assignSystemUniqueIds<T extends IdentityEntry>(
  records: IdentityRecord<T>[],
): AssignedIdentityRecord<T>[] {
  const ordered = [...records].sort(compareRecords);
  const used = new Set<string>();
  const claims = new Map<string, string>();

  // Reserve explicit ids first. This preserves an id that a later source has
  // already deliberately chosen, even if it resembles a generated suffix.
  for (const record of ordered) {
    if (record.entry.modifies) continue;
    used.add(
      scopedIdKey(record.entry.type, record.entry.system, record.entry.id),
    );
  }

  const assigned: AssignedIdentityRecord<T>[] = [];
  for (const record of ordered) {
    const originalId = record.entry.id;
    if (record.entry.modifies) {
      assigned.push({ ...record, originalId });
      continue;
    }

    const claimKey = scopedIdKey(
      record.entry.type,
      record.entry.system,
      originalId,
    );
    let assignedId = claims.get(claimKey);

    if (!assignedId) {
      assignedId = originalId;
      claims.set(claimKey, assignedId);
    } else {
      const suffix = sourceBookInitials(
        record.sourceBookTitle,
        record.sourceBook,
      );
      assignedId = nextAvailableId(
        record.entry.type,
        originalId,
        suffix,
        systemScope(record.entry.system),
        used,
      );
    }

    used.add(scopedIdKey(record.entry.type, record.entry.system, assignedId));
    assigned.push({
      ...record,
      originalId,
      entry: { ...record.entry, id: assignedId },
    });
  }

  const byAssignedId = new Map<string, AssignedIdentityRecord[]>();
  const byOriginalId = new Map<string, AssignedIdentityRecord[]>();
  for (const record of assigned) {
    if (record.entry.modifies) continue;
    const assignedKey = scopedIdKey(
      record.entry.type,
      record.entry.system,
      record.entry.id,
    );
    const originalKey = scopedIdKey(
      record.entry.type,
      record.entry.system,
      record.originalId,
    );
    const assignedList = byAssignedId.get(assignedKey) ?? [];
    assignedList.push(record);
    byAssignedId.set(assignedKey, assignedList);
    const originalList = byOriginalId.get(originalKey) ?? [];
    originalList.push(record);
    byOriginalId.set(originalKey, originalList);
  }

  return assigned.map((record) =>
    rewriteEntryRelationships(record, byAssignedId, byOriginalId),
  );
}

/**
 * Produce a serializable audit of legacy duplicate keys and their scoped
 * assignments.  The legacy grouping preserves the historical corpus report;
 * the scoped grouping is the release invariant that must be collision-free.
 */
export function buildIdentityCollisionReport<T extends IdentityEntry>(
  records: IdentityRecord<T>[],
): IdentityCollision[] {
  const assigned = assignSystemUniqueIds(records);
  const groups = new Map<string, AssignedIdentityRecord<T>[]>();

  for (const record of assigned) {
    if (record.entry.modifies) continue;
    const legacyKey = `${record.entry.type}:${record.originalId}`;
    const group = groups.get(legacyKey) ?? [];
    group.push(record);
    groups.set(legacyKey, group);
  }

  return [...groups]
    .filter(([, group]) => group.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([legacyKey, group]) => {
      const first = group[0];
      return {
        legacyKey,
        scopedKey: contentEntryKey(
          first.entry.type,
          first.entry.system,
          first.originalId,
        ),
        entries: group.map((record) => ({
          sourceBook: record.sourceBook,
          ...(record.sourceBookTitle
            ? { sourceBookTitle: record.sourceBookTitle }
            : {}),
          ...(record.entry.system ? { system: record.entry.system } : {}),
          publishedDate: record.publishedDate,
          sourceIndex: record.sourceIndex,
          originalId: record.originalId,
          assignedId: record.entry.id,
        })),
      };
    });
}
