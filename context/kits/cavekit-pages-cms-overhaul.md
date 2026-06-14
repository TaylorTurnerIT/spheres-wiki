---
name: pages-cms-overhaul
description: Full overhaul of .pages.yml after power dirs land under [book]/power/ — per-book collections with system subdirs, type-specific field schemas, no path-derived fields
metadata:
  type: project
  created: "2026-06-14"
  last_edited: "2026-06-14"
---

# Cavekit: Pages CMS Overhaul

## Scope

Rewrite `.pages.yml` after step 1 of [[dir-truth-overview]] lands the confirmed structure:

```
src/content/[book]/[system]/[type]/...
```

Books stay at root. `__built-in__` stays at root. No inversion.

## Wildcard Constraint

Pages CMS has no glob/wildcard path support. Cross-book views like
"all power feats across every book" require one of:

- **Option A — Symlink aggregation (FAILED for GitHub API):**
  `src/cms/power/feats/[book] → ../../content/[book]/power/feats`
  Rejected: GitHub API represents symlinks as mode-120000 blobs, not directories.
  Pages CMS cannot traverse into them.

- **Option B — Inverted root (RULED OUT):**
  `src/content/[system]/[type]/[book]/[id].md`
  Ruled out: books must stay at the root of `src/content/`.

- **Option C — Per-book collections (CONFIRMED APPROACH):**
  One collection per book, using the `[book]/[system]/[type]/` subtree.
  Each book's types are visible via `subfolders: true` within its collection.
  Adding a new book = add one collection block (or auto-generate `.pages.yml`
  from discovered book slugs via a build script).

## Target Collection Layout

```
Pages CMS sidebar
├── Books                        (format: yaml → _book.yaml files)
├── [book-slug]                  (one entry per book)
│   └── [system]/[type]/         (navigated via subfolders: true, layout: tree)
│       ├── power/
│       │   ├── spheres/
│       │   ├── feats/
│       │   ├── talents/  (inside spheres/[sphere]/talents/)
│       │   ├── articles/
│       │   └── classes/
│       ├── might/
│       │   └── ...
│       └── guile/
│           └── ...
```

Each book collection uses `layout: tree` and `subfolders: true` so editors
navigate system → type → entries within a single collection.

## Requirements

### R1: Books Collection (metadata only)

```yaml
- name: books
  label: Books
  type: collection
  path: src/content
  subfolders: true
  format: yaml
  filename: _book.yaml
  view:
    layout: tree
    primary: title
    fields: [title, publisher, price]
    search: [title, publisher]
    node:
      filename: _book.yaml
      hideDirs: others
    default:
      sort: title
      order: asc
  fields: [title, publisher, publishedDate, price, buyUrl, coverImage]
```

### R2: Per-Book Content Collections

One collection per discovered book slug. Fields vary by type — use the
narrowest schema per type (no superset hack). Path-derived fields (`type`,
`id`, `system`, `sourceBook`, `sphere`, `className`, etc.) are ABSENT from
all field definitions — they are injected by the Astro loader from the path.

**Shared field set (all entry types):**
```yaml
- {name: name, type: string, required: true}
- {name: tags, type: string, list: true}
- {name: body, type: rich-text}
```

**Talent / Feat additional fields:**
```yaml
- {name: tier, type: select, options: {values: [base, basic, advanced]}}   # talent only
- {name: dualSphere, type: string}
- {name: modifies, type: string}
```

**Sphere additional fields:**
```yaml
- {name: icon, type: string, required: true}
```

**Class additional fields:**
```yaml
- {name: hitDie, type: number}
- {name: alignment, type: string}
- {name: startingWealth, type: string}
- {name: skillRanks, type: number}
- {name: classSkills, type: string, list: true}
- {name: babProgression, type: select, options: {values: [full, "3/4", half]}}
- {name: fortSaveProgression, type: select, options: {values: [good, poor]}}
- {name: refSaveProgression, type: select, options: {values: [good, poor]}}
- {name: willSaveProgression, type: select, options: {values: [good, poor]}}
- {name: casterTier, type: select, options: {values: [high, mid, low, none]}}
```

**Archetype-feature additional fields:**
```yaml
- {name: level, type: number}
- {name: replaces, type: string, list: true}
- {name: alters, type: string, list: true}
- {name: mutuallyExclusive, type: boolean}
```

### R3: Auto-Generation

Rather than hand-authoring one collection block per book (40+ books),
generate `.pages.yml` from discovered book slugs:

```
scripts/generate-pages-yml.mjs
```

Reads every `src/content/[book]/_book.yaml`, emits one collection block
per book with the tree/subfolders config, then writes `.pages.yml`.

Run after adding a new book. Commit the result.

## Acceptance Criteria

- One content collection block per book in `.pages.yml`.
- Path-derived fields absent from all field definitions.
- Each collection uses `subfolders: true` and `layout: tree` to expose
  `[system]/[type]/` hierarchy to editors.
- `scripts/validate.mjs` passes.
- Astro build passes.

## Blocking Dependencies

- [[dir-validation]] step 1: power dirs must land under `[book]/power/`
  so the CMS sees the full `[system]/[type]/` subtree per book.
- [[dir-validation]] R2 (field stripping) must land first — CMS field
  schemas omit path-derived fields.
