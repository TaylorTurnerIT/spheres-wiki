// src/lib/inferFromPath.ts

export type InferredFields = {
  type?: string;
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
  const parts = fileId.replace(/\.md$/, '').split('/');
  const [s0, s1, s2, s3, s4, s5] = parts;

  // ── 2-segment paths (legacy flat) ─────────────────────────────────────────
  if (parts.length === 2) {
    switch (s0) {
      case 'talents':             return { type: 'talent', id: s1 };
      case 'feats':               return { type: 'feat', id: s1 };
      case 'spheres':             return { type: 'sphere', id: s1 };
      case 'classes':             return { type: 'class', id: s1 };
      case 'archetypes':          return { type: 'archetype', id: s1 };
      case 'archetype-features':  return { type: 'archetype-feature', id: s1 };
      case 'articles':            return { type: 'article', id: s1 };
      case 'tags':                return { type: 'tag', id: s1 };
    }
  }

  // ── 3-segment paths ────────────────────────────────────────────────────────
  if (parts.length === 3) {
    // Legacy: class-features/{cid}/{id}
    if (s0 === 'class-features')  return { type: 'class-feature', className: s1, id: s2 };
    // Legacy: class-traits/{cid}/{id}
    if (s0 === 'class-traits')    return { type: 'class-trait', className: s1, id: s2 };
    // New: spheres/{sid}/index
    if (s0 === 'spheres' && s2 === 'index') return { type: 'sphere', id: s1 };
    // New: classes/{cid}/index
    if (s0 === 'classes' && s2 === 'index') return { type: 'class', id: s1 };
  }

  // ── 4-segment paths ────────────────────────────────────────────────────────
  if (parts.length === 4) {
    // New: spheres/{sid}/talents/{id}
    if (s0 === 'spheres' && s2 === 'talents') return { type: 'talent', sphere: s1, id: s3 };
    // New: spheres/{sid}/feats/{id}
    if (s0 === 'spheres' && s2 === 'feats')   return { type: 'feat', sphere: s1, id: s3 };
    // New: classes/{cid}/features/{id}
    if (s0 === 'classes' && s2 === 'features') return { type: 'class-feature', className: s1, id: s3 };
  }

  // ── 5-segment paths ────────────────────────────────────────────────────────
  if (parts.length === 5) {
    // New: classes/{cid}/archetypes/{aid}/index
    if (s0 === 'classes' && s2 === 'archetypes' && s4 === 'index') {
      return { type: 'archetype', className: s1, id: s3 };
    }
  }

  // ── 6-segment paths ────────────────────────────────────────────────────────
  if (parts.length === 6) {
    // New: classes/{cid}/features/{fid}/traits/{id}
    if (s0 === 'classes' && s2 === 'features' && s4 === 'traits') {
      return { type: 'class-trait', className: s1, featureId: s3, id: s5 };
    }
    // New: classes/{cid}/archetypes/{aid}/features/{id}
    if (s0 === 'classes' && s2 === 'archetypes' && s4 === 'features') {
      return { type: 'archetype-feature', archetypeId: s3, id: s5 };
    }
  }

  return {};
}
