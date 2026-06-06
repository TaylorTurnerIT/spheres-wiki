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
  | "tag";

export type InferredFields = {
  type?: EntryType;
  id?: string;
  sphere?: string;
  className?: string;
  featureId?: string;
  archetypeId?: string;
};

/**
 * Infers structural metadata from an Astro content entry's file id.
 * `fileId` is the path relative to the collection (book) directory, e.g.
 * "talents/foo.md" or "classes/shifter/features/casting.md".
 *
 * Returns only the fields that can be inferred. Callers merge this with
 * frontmatter data — frontmatter always wins, enabling per-file overrides.
 */
export function inferFromPath(fileId: string): InferredFields {
  const parts = fileId.replace(/\.mdx?$/, "").split("/");
  const [s0, s1, s2, s3, s4, s5] = parts;

  // ── 2-segment paths (legacy flat) ─────────────────────────────────────────
  if (parts.length === 2) {
    switch (s0) {
      case "talents":
        return { type: "talent", id: s1 };
      case "feats":
        return { type: "feat", id: s1 };
      case "spheres":
        return { type: "sphere", id: s1 };
      case "classes":
        return { type: "class", id: s1 };
      case "archetypes":
        return { type: "archetype", id: s1 };
      case "archetype-features":
        return { type: "archetype-feature", id: s1 };
      case "articles":
        return { type: "article", id: s1 };
      case "tags":
        return { type: "tag", id: s1 };
    }
  }

  // ── 3-segment legacy paths ──────────────────────────────────────────────────
  if (parts.length === 3) {
    if (s0 === "class-features")
      return { type: "class-feature", className: s1, id: s2 };
    if (s0 === "class-traits")
      return { type: "class-trait", className: s1, id: s2 };
  }

  const last = parts[parts.length - 1];
  const prev = parts.length > 1 ? parts[parts.length - 2] : "";
  const prev2 = parts.length > 2 ? parts[parts.length - 3] : "";

  // ── Flexible nesting rules ──────────────────────────────────────────────────

  if (parts.length >= 4) {
    // Archetype Features: .../archetypes/[aid]/archetype-features/[id] or features
    if (
      prev === "archetype-features" ||
      (prev === "features" &&
        parts[parts.length - 4].toLowerCase() === "archetypes")
    ) {
      const aid = parts[parts.length - 3];
      return { type: "archetype-feature", archetypeId: aid, id: last };
    }
    // Class Traits: .../[cid]/class-features/[fid]/class-traits/[id] or features/traits
    if (
      prev === "class-traits" ||
      (prev === "traits" &&
        parts[parts.length - 4].toLowerCase() === "features")
    ) {
      const fid = parts[parts.length - 3];
      // cid is two levels above fid: .../[cid]/class-features/[fid]
      const cid = parts[parts.length - 5] || parts[1]; // fallback if nesting is weird
      return { type: "class-trait", className: cid, featureId: fid, id: last };
    }
  }

  if (parts.length >= 3) {
    // {system}/spheres/{sphere-id}: three-segment system-prefixed sphere path
    if (prev === "spheres") {
      return { type: "sphere", id: last };
    }
    // Class Features: .../[cid]/class-features/[id] or features/[id]
    if (prev === "class-features" || prev === "features") {
      const cid = parts[parts.length - 3];
      return { type: "class-feature", className: cid, id: last };
    }
    // Archetypes: .../[cid]/Archetypes/[aid]/[aid] or index or ends with [aid]
    if (
      (prev2 === "Archetypes" || prev2 === "archetypes") &&
      (last === prev ||
        last === "index" ||
        last.endsWith("-" + prev) ||
        last.includes(prev))
    ) {
      const aid = prev;
      const cid = parts[parts.length - 4];
      return { type: "archetype", className: cid, id: aid };
    }
    // Sphere talents and feats
    if (prev === "talents") {
      const sid = parts[parts.length - 3];
      return { type: "talent", sphere: sid, id: last };
    }
    if (prev === "feats") {
      const sid = parts[parts.length - 3];
      return { type: "feat", sphere: sid, id: last };
    }
    // Spheres root
    if (
      parts.length >= 3 &&
      parts[parts.length - 3] === "spheres" &&
      (last === prev || last === "index")
    ) {
      return { type: "sphere", id: prev };
    }
  }

  if (s0.toLowerCase() === "classes") {
    if (last === prev || last === "index") {
      return { type: "class", id: prev };
    }
  }

  return {};
}
