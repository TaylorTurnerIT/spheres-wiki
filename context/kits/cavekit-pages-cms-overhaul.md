---
name: pages-cms-overhaul
description: Full overhaul of .pages.yml after the directory refactor lands — per-type flat collections (feats, articles, talents, spheres) grouped by system, plus books metadata collection, exploiting the new src/content/[book]/[system]/[type]/ structure
metadata:
  type: project
  created: "2026-06-14"
  last_edited: "2026-06-14"
---

# Cavekit: Pages CMS Overhaul

## Scope

Rewrite `.pages.yml` after the directory refactor (see [[dir-truth-overview]])
lands the new structure:

```
src/content/[book]/[system]/[type]/...
```

This structure makes it possible to point one Pages CMS collection at a type-root
and get all entries across all books for that type, grouped by book subfolder, with
`subfolders: true` and `layout: list`. No hardcoded book slugs.

**Precondition:** Directory refactor complete. New structure live.

## Target Collection Layout

```
Pages CMS sidebar
├── Books                        (format: yaml → _book.yaml files)
├── Power
│   ├── Power Feats              (path: src/content, filter: */power/feats/)
│   ├── Power Spheres            (path: src/content, filter: */power/spheres/)  [tree, node=sphere]
│   ├── Power Talents            (path: src/content, filter: */power/spheres/*/talents/)
│   ├── Power Articles           (path: src/content, filter: */power/articles/)
│   └── Power Classes            (path: src/content, filter: */power/classes/)
├── Might
│   ├── Might Feats
│   ├── Might Spheres
│   ├── Might Talents
│   ├── Might Articles
│   └── Might Classes
├── Guile
│   ├── Guile Feats
│   ├── Guile Spheres
│   ├── Guile Talents
│   ├── Guile Articles
│   └── Guile Classes
└── Other
    └── All Entries (fallback)
```

**NOTE:** Pages CMS has no glob/wildcard path support. The per-system-per-type
collections listed above cannot be expressed as single wildcard paths.

Two viable approaches (choose one before implementing):

**Option A — Symlink aggregation (FAILED for GitHub API):**
`src/cms/power/feats/[book] → ../../content/[book]/power/feats`
Rejected: GitHub API represents symlinks as mode-120000 blobs, not directories.
Pages CMS cannot traverse into them.

**Option B — Inverted root (RECOMMENDED):**
Refactor content root so type is the FIRST directory level:
```
src/content/
  [system]/
    feats/
      [book]/
        [id].md
    spheres/
      [sphere]/
        [book]/
          [sphere].md (definition)
          talents/
            [id].md
    articles/
      [book]/
        [id].md
    classes/
      [book]/
        [class]/...
  books/
    [book]/
      _book.yaml
```

This lets Pages CMS point `path: src/content/power/feats` with `subfolders: true`
and get all books' power feats in one flat+subfolder list.

**Trade-off of Option B:** Astro routing and `inferFromPath` must be updated to
read `system` from the new first path segment, `sourceBook` from the second, etc.

## Requirements

### R1: Books Collection (unchanged from current)

```yaml
- name: books
  label: Books
  type: collection
  path: src/content/books          # or wherever _book.yaml files land
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
  fields: [title, publisher, publishedDate, price, buyUrl, coverImage]  # all required
```

### R2: Per-System-Per-Type Collections

One collection per (system × type) combination:

| system | types |
|---|---|
| power | feats, spheres, talents, articles, classes |
| might | feats, spheres, talents, articles, classes |
| guile | feats, spheres, talents, articles, classes |

Grouped in CMS sidebar via `type: group` per system.

**Feats collection template (power example):**
```yaml
- name: power-feats
  label: Power Feats
  type: collection
  path: src/content/power/feats
  subfolders: true
  format: yaml-frontmatter
  filename: "{id}.md"
  view:
    layout: list
    primary: name
    fields: [name, sphere, dualSphere]
    search: [name, sphere]
    default:
      sort: name
      order: asc
  fields:
    - {name: name, type: string, required: true}
    - {name: dualSphere, type: string}
    - {name: tags, type: string, list: true}
    - {name: modifies, type: string}
    - {name: body, type: rich-text}
```

Note: `type`, `id`, `system`, `sourceBook`, `sphere` all omitted — path-derived
after [[dir-validation]] field stripping.

**Talents collection template (power example):**
```yaml
- name: power-talents
  label: Power Talents
  type: collection
  path: src/content/power/spheres
  subfolders: true
  format: yaml-frontmatter
  filename: "{id}.md"
  exclude: ["*.md"]     # exclude sphere definition files at spheres root level
  view:
    layout: list
    primary: name
    fields: [name, tier, sphere]
    search: [name, sphere]
    default:
      sort: name
      order: asc
  fields:
    - {name: name, type: string, required: true}
    - {name: tier, type: select, options: {values: [base, basic, advanced]}}
    - {name: dualSphere, type: string}
    - {name: tags, type: string, list: true}
    - {name: modifies, type: string}
    - {name: body, type: rich-text}
```

**Spheres collection template (power example):**
```yaml
- name: power-spheres
  label: Power Spheres
  type: collection
  path: src/content/power/spheres
  subfolders: false      # sphere definitions are direct children, no deeper
  format: yaml-frontmatter
  view:
    layout: list
    primary: name
    fields: [name, icon]
    search: [name]
    default:
      sort: name
      order: asc
  fields:
    - {name: name, type: string, required: true}
    - {name: icon, type: string, required: true}
    - {name: tags, type: string, list: true}
    - {name: body, type: rich-text}
```

### R3: System Groups

Wrap per-type collections per system in `type: group`:

```yaml
- name: power
  label: Power
  type: group
  items:
    - [power-feats collection]
    - [power-spheres collection]
    - [power-talents collection]
    - [power-articles collection]
    - [power-classes collection]
```

### R4: Articles Collection

Same pattern as feats. Flat list, book subfolder, search by name.

Fields:
```yaml
- {name: name, type: string, required: true}
- {name: tags, type: string, list: true}
- {name: body, type: rich-text}
```

### R5: Classes Collection

Classes nest class-features and archetypes. Tree layout makes sense here.

```yaml
- name: power-classes
  label: Power Classes
  type: collection
  path: src/content/power/classes
  subfolders: true
  format: yaml-frontmatter
  view:
    layout: tree
    primary: name
    fields: [name]
    search: [name]
  fields:
    - {name: name, type: string, required: true}
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
    - {name: body, type: rich-text}
```

Class features and class traits inherit from the tree structure — no separate
collection needed; editors navigate into the class subfolder.

## Acceptance Criteria

- Zero book slugs hardcoded in `.pages.yml`.
- Adding a new book = add a new subfolder under the appropriate system/type dirs;
  it appears in the CMS automatically.
- Each collection uses type-appropriate field schemas (no superset hack).
- Path-derived fields (`type`, `id`, `system`, `sourceBook`, `sphere`) absent from
  all collection field definitions.
- All collections use `layout: list` except spheres (optional: list) and classes
  (tree).
- `scripts/validate.mjs` passes after refactor.
- Astro build passes.

## Blocking Dependencies

- [[dir-validation]] R2 (field stripping) must land first — CMS field schemas
  omit path-derived fields.
- Directory refactor (Option B inverted root, or equivalent) must land — current
  `[book]/[system]/[type]` structure cannot support wildcard-free per-type collections.
