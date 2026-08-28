// src/lib/inferFromPath.ts

export type EntryType =
  | "sphere"
  | "talent"
  | "feat"
  | "class"
  | "class-feature"
  | "class-trait"
  | "archetype"
  | "archetype-feature"
  | "article"
  | "tag"
  | "drawback"
  | "boon"
  | "tradition";

export type InferredFields = {
  type?: EntryType;
  id?: string;
  sphere?: string;
  className?: string;
  featureId?: string;
  archetypeId?: string;
  category?: string;
  system?: string;
  drawbackKind?: "general" | "sphere" | "dual-sphere";
  traditionKind?: "standard" | "custom" | "card" | "variant";
};

/** System ids that appear as the first directory segment in content paths. */
const KNOWN_SYSTEMS = new Set(["power", "might", "guile", "champions"]);

/** Attaches the detected system prefix (if any) onto inferred fields. */
type WithSystem = (fields: InferredFields) => InferredFields;

/** Last/penultimate/grandparent path segments -- the common reference points
 * every flexible-nesting resolver below matches against. */
function getSegmentRefs(parts: string[]): {
  last: string;
  prev: string;
  prev2: string;
} {
  return {
    last: parts[parts.length - 1],
    prev: parts.length > 1 ? parts[parts.length - 2] : "",
    prev2: parts.length > 2 ? parts[parts.length - 3] : "",
  };
}

// ─── Sphere / talent / feat ─────────────────────────────────────────────────

function resolveSphereFlat(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  const [s0, s1] = parts;
  if (parts.length === 2) {
    if (s0 === "talents") return withSystem({ type: "talent", id: s1 });
    if (s0 === "feats") return withSystem({ type: "feat", id: s1 });
    if (s0 === "spheres") return withSystem({ type: "sphere", id: s1 });
  }
  if (parts.length === 3 && s0 === "feats") {
    return withSystem({ type: "feat", category: s1, id: parts[2] });
  }
  return undefined;
}

function resolveSphereNested(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 3) return undefined;
  const { last, prev } = getSegmentRefs(parts);
  const grandparent = parts[parts.length - 3];

  if (prev === "talents") {
    return withSystem({ type: "talent", sphere: grandparent, id: last });
  }
  if (prev === "feats") {
    return withSystem({ type: "feat", sphere: grandparent, id: last });
  }
  if (grandparent === "spheres" && (last === prev || last === "index")) {
    return withSystem({ type: "sphere", id: prev });
  }
  return undefined;
}

/** Resolves sphere/talent/feat entries -- `spheres/`, `talents/`, `feats/` paths. */
export function resolveSphereEntry(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  return (
    resolveSphereFlat(parts, withSystem) ??
    resolveSphereNested(parts, withSystem)
  );
}

// ─── Archetype / archetype-feature ──────────────────────────────────────────

function resolveArchetypeFlat(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  const [s0, s1, s2] = parts;
  if (parts.length === 2) {
    if (s0 === "archetypes") return withSystem({ type: "archetype", id: s1 });
    if (s0 === "archetype-features")
      return withSystem({ type: "archetype-feature", id: s1 });
  }
  if (parts.length === 3 && s0 === "archetype-features") {
    return withSystem({ type: "archetype-feature", archetypeId: s1, id: s2 });
  }
  return undefined;
}

/** classes/[cid]/archetypes/[aid]/archetype-features/[id] (or .../features/[id]) */
function resolveArchetypeFeatureNested(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 4) return undefined;
  const { last, prev } = getSegmentRefs(parts);
  const grandparent = parts[parts.length - 4];

  const isArchetypeFeaturePath =
    prev === "archetype-features" ||
    (prev === "features" && grandparent.toLowerCase() === "archetypes");
  if (!isArchetypeFeaturePath) return undefined;

  const aid = parts[parts.length - 3];
  // className lives two levels above archetypeId when fully nested
  const className = parts.length >= 6 ? parts[parts.length - 5] : undefined;
  return withSystem({
    type: "archetype-feature",
    ...(className ? { className } : {}),
    archetypeId: aid,
    id: last,
  });
}

/** classes/[cid]/Archetypes/[aid]/[aid] or index or ends with [aid] */
function resolveArchetypeNested(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 3) return undefined;
  const { last, prev, prev2 } = getSegmentRefs(parts);

  const isArchetypeChild =
    (prev2 === "Archetypes" || prev2 === "archetypes") &&
    (last === prev ||
      last === "index" ||
      last.endsWith(`-${prev}`) ||
      last.includes(prev));
  if (!isArchetypeChild) return undefined;

  const cid = parts[parts.length - 4];
  return withSystem({ type: "archetype", className: cid, id: prev });
}

/** Resolves archetype/archetype-feature entries -- `archetypes/`, `archetype-features/`,
 * and `classes/[cid]/archetypes/[aid]/...` nested paths. */
export function resolveArchetypeEntry(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  return (
    resolveArchetypeFlat(parts, withSystem) ??
    resolveArchetypeFeatureNested(parts, withSystem) ??
    resolveArchetypeNested(parts, withSystem)
  );
}

// ─── Class / class-feature / class-trait ────────────────────────────────────

function resolveClassFlat(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  const [s0, s1, s2] = parts;
  if (parts.length === 2) {
    if (s0 === "classes") return withSystem({ type: "class", id: s1 });
    if (s0 === "class-features")
      return withSystem({ type: "class-feature", id: s1 });
  }
  if (parts.length === 3) {
    if (s0 === "class-features")
      return withSystem({ type: "class-feature", className: s1, id: s2 });
    if (s0 === "class-traits")
      return withSystem({ type: "class-trait", className: s1, id: s2 });
  }
  return undefined;
}

/** classes/[cid]/features/[fid]/traits/[id] (class-traits/[id] handled by resolveClassFlat) */
function resolveClassTraitNested(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 4) return undefined;
  const { last, prev } = getSegmentRefs(parts);
  const grandparent = parts[parts.length - 4];

  const isClassTraitPath =
    prev === "class-traits" ||
    (prev === "traits" && grandparent.toLowerCase() === "features");
  if (!isClassTraitPath) return undefined;

  const featureId = parts[parts.length - 3];
  const className = parts.length >= 6 ? parts[parts.length - 5] : undefined;
  // When under features/[fid]/traits, the className is two levels above featureId.
  // For class-traits/[id], parts[parts.length - 3] IS the className.
  const cid = prev === "class-traits" ? featureId : className;
  return withSystem({
    type: "class-trait",
    className: cid,
    featureId,
    id: last,
  });
}

/** .../[cid]/class-features/[id] or features/[id] */
function resolveClassFeatureNested(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 3) return undefined;
  const { last, prev } = getSegmentRefs(parts);
  if (prev !== "class-features" && prev !== "features") return undefined;
  const cid = parts[parts.length - 3];
  return withSystem({ type: "class-feature", className: cid, id: last });
}

/** classes/[cid]/index or classes/[cid]/[cid] */
function resolveClassRoot(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts.length < 3) return undefined;
  const { last, prev } = getSegmentRefs(parts);
  if (parts[0].toLowerCase() !== "classes") return undefined;
  if (last !== prev && last !== "index") return undefined;
  return withSystem({ type: "class", id: prev });
}

/** Resolves class/class-feature/class-trait entries -- `classes/`, `class-features/`,
 * `class-traits/`, and their nested `classes/[cid]/features/...` forms. */
export function resolveClassEntry(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  return (
    resolveClassFlat(parts, withSystem) ??
    resolveClassTraitNested(parts, withSystem) ??
    resolveClassFeatureNested(parts, withSystem) ??
    resolveClassRoot(parts, withSystem)
  );
}

// ─── Casting traditions ─────────────────────────────────────────────────────

function resolveDrawbackEntry(
  parts: string[],
  group: string,
  maybeId: string,
  maybeNestedId: string,
  withSystem: WithSystem,
): InferredFields | undefined {
  if (group === "general" && parts.length === 4) {
    return withSystem({
      type: "drawback",
      drawbackKind: "general",
      id: maybeId,
    });
  }
  if (group === "spheres" && parts.length === 5) {
    return withSystem({
      type: "drawback",
      drawbackKind: "sphere",
      sphere: maybeId,
      id: maybeNestedId,
    });
  }
  if (group === "dual-spheres" && parts.length === 4) {
    return withSystem({
      type: "drawback",
      drawbackKind: "dual-sphere",
      id: maybeId,
    });
  }
  return undefined;
}

const TRADITION_KIND_BY_GROUP: Record<
  string,
  "standard" | "custom" | "card" | "variant"
> = {
  standard: "standard",
  custom: "custom",
  card: "card",
  variants: "variant",
};

function resolveTraditionEntry(
  parts: string[],
  group: string,
  maybeId: string,
  withSystem: WithSystem,
): InferredFields | undefined {
  const traditionKind = TRADITION_KIND_BY_GROUP[group];
  if (traditionKind && parts.length === 4) {
    return withSystem({ type: "tradition", traditionKind, id: maybeId });
  }
  return undefined;
}

export function resolveCastingTraditionEntry(
  parts: string[],
  withSystem: WithSystem,
): InferredFields | undefined {
  if (parts[0] !== "casting-traditions") return undefined;

  const [, family, group, maybeId, maybeNestedId] = parts;
  if (family === "boons" && parts.length === 3) {
    return withSystem({ type: "boon", id: group });
  }
  if (family === "drawbacks") {
    return resolveDrawbackEntry(
      parts,
      group,
      maybeId,
      maybeNestedId,
      withSystem,
    );
  }
  if (family === "traditions") {
    return resolveTraditionEntry(parts, group, maybeId, withSystem);
  }
  return undefined;
}

/**
 * Infers structural metadata from an Astro content entry's file id.
 * `fileId` is the path relative to the collection (book) directory, e.g.
 * "talents/foo.md" or "classes/shifter/features/casting.md".
 *
 * Returns only the fields that can be inferred. Callers merge this with
 * frontmatter data -- frontmatter always wins, enabling per-file overrides.
 *
 * Delegates to per-entry-family resolvers (sphere/talent/feat, archetype,
 * class) tried in that order -- archetype paths must be checked before the
 * generic class-feature nesting rule, since `classes/[cid]/archetypes/[aid]/
 * features/[id]` would otherwise be misread as a plain class feature.
 */
export function inferFromPath(fileId: string): InferredFields {
  let parts = fileId.replace(/\.mdx?$/, "").split("/");

  // Detect system prefix: {system}/spheres/{id} or {system}/feats/{id} etc.
  let system: string | undefined;
  if (KNOWN_SYSTEMS.has(parts[0])) {
    system = parts[0];
    parts = parts.slice(1); // strip system prefix for type/sphere inference
  }

  const withSystem: WithSystem = (fields) =>
    system !== undefined ? { ...fields, system } : fields;

  if (parts.length === 2 && parts[0] === "tags") {
    // A system directory scopes its tag definitions; tags in a neutral book
    // remain systemless and may declare an explicit frontmatter system.
    return withSystem({ type: "tag", id: parts[1] });
  }
  if (parts[0] === "articles") {
    return withSystem({ type: "article", id: parts[parts.length - 1] });
  }

  return (
    resolveSphereEntry(parts, withSystem) ??
    resolveArchetypeEntry(parts, withSystem) ??
    resolveClassEntry(parts, withSystem) ??
    resolveCastingTraditionEntry(parts, withSystem) ??
    withSystem({})
  );
}
