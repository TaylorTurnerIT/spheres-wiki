---
name: dir-truth-overview
description: Overview index for the directory-as-source-of-truth campaign — validate and strip path-derivable fields from frontmatter, overhaul the tag system to auto-discover structural tags and support hidden-by-default visibility
metadata:
  type: project
  created: "2026-06-14"
  last_edited: "2026-06-14"
---

# Cavekit Overview: Directory as Source of Truth

The wiki's `inferFromPath` already derives `type`, `id`, `system`, `sphere`,
`className`, `featureId`, `archetypeId`, and `sourceBook` from the file path.
The Astro loader merges these with frontmatter — frontmatter currently wins,
meaning a file can silently declare a different `system` or `sphere` than its
directory implies. This campaign:

1. **Validates** all current conflicts between path-inferred values and
   frontmatter-declared values, producing a clean audit.
2. **Strips** path-derivable fields from frontmatter once the audit is clean,
   making override structurally impossible.
3. **Extends** the tag system so structural tags (`might`, `power`, `guile`,
   sphere identity) are auto-discovered from the directory and so tags can carry
   a `hidden: true` property controlling default visibility.

## Kits

| Kit | Description |
|-----|-------------|
| cavekit-dir-truth-overview.md | This index. |
| cavekit-dir-validation.md | Validation script + field-stripping plan. Finds all conflicts, then removes path-derivable fields from Zod schema and frontmatter. |
| cavekit-tag-system.md | Tag system overhaul: system tags auto-added from path, `hidden` field on tag definitions, render layer updated to filter hidden tags by default. |

## Dependency Graph

```
cavekit-dir-truth-overview         (index, no requirements)

cavekit-dir-validation             (run first — audit must be clean before stripping)
   R1 Conflict detection script
   R2 Field stripping (Zod schema + frontmatter)

cavekit-tag-system                 (independent of validation, but benefits from clean
   R1 System auto-tags             path fields since system comes from path not frontmatter)
   R2 Hidden tag property
   R3 Render layer update
```

Validation and tag system are independent but both land on the same invariant:
the directory is the only source of structural truth.

## Fields: Inferable vs Kept

| Field | Inferable from path? | Action |
|---|---|---|
| `type` | yes | strip from frontmatter |
| `id` | yes (= filename) | strip — filename IS the id |
| `system` | yes (first segment if known) | strip from frontmatter |
| `sourceBook` | yes (top-level dir) | strip from frontmatter |
| `sphere` | yes (parent sphere dir, for talent/feat) | strip from frontmatter |
| `className` | yes (parent class dir) | strip from frontmatter |
| `featureId` | yes (parent feature dir) | strip from frontmatter |
| `archetypeId` | yes (parent archetype dir) | strip from frontmatter |
| `name` | no | keep |
| `tier` | no | keep |
| `tags` | no (manual subcategory tags only) | keep |
| `dualSphere` | no | keep |
| `icon` | no | keep |
| `modifies` | no | keep |
| all class fields | no | keep |
| all archetype-feature fields | no | keep |

## Cross-Reference Map

| Kit | References |
|-----|-----------|
| cavekit-dir-validation | overview, cavekit-tag-system, cavekit-pages-cms-overhaul |
| cavekit-tag-system | overview, cavekit-dir-validation |
| cavekit-pages-cms-overhaul | overview, cavekit-dir-validation |
