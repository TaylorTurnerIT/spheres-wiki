---
name: courser-class-conversion
description: Overview index for converting the Courser class from Spheres of Guile (Wikidot) to spheres-wiki markdown
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit Overview: Courser Class Conversion

Convert the legacy Wikidot archive page `courser.txt` into the full set of
spheres-wiki content entries for the Courser class: one class entry, its class
features, its ventures (class-traits), and its Diamond Spheres ventures and Cook
alternate class feature. Source attribution is path-derived; content is split
across the Spheres of Guile, Diamond Spheres: Hustle & Bustle, and Diamond
Spheres: Invention & Ingenuity books.

## Kits

- **cavekit-courser-class-entry.md** — The single `class` entry: class-family
  frontmatter, the 20-level progression table (three extra columns plus
  improvement/venture labels for non-feature levels), and the class description body.
- **cavekit-courser-class-features.md** — The 21 `class-feature` entries (one per
  named Courser feature), including the Courser Ventures trait container.
- **cavekit-courser-core-ventures.md** — The 26 `class-trait` venture entries
  sourced from Spheres of Guile, with level gates and sphere prerequisites.
- **cavekit-courser-drs-content.md** — The five Diamond Spheres venture
  `class-trait` entries and the Cook `archetype-feature` (alternate class feature).

## Dependency Graph

```
cavekit-courser-class-entry        (no dependencies)
        ▲
        │
cavekit-courser-class-features     (depends on: class-entry)
        ▲
        │
        ├── cavekit-courser-core-ventures   (depends on: class-entry + class-features)
        └── cavekit-courser-drs-content     (depends on: class-entry + class-features)
```

- class-entry has no dependencies.
- class-features depends on class-entry (feature levels trace to the progression table).
- core-ventures depends on class-entry and class-features (ventures attach to the Courser Ventures container feature).
- drs-content depends on class-entry and class-features (ventures attach to the Courser Ventures container; the Cook ACF replaces the Harrying Assault and Deadly Assault features).
- No circular dependencies.

## Cross-Reference Map

Every kit cross-references every other kit and this overview:

| Kit | References |
|-----|-----------|
| cavekit-courser-class-entry | overview, class-features, core-ventures, drs-content |
| cavekit-courser-class-features | overview, class-entry, core-ventures, drs-content |
| cavekit-courser-core-ventures | overview, class-entry, class-features, drs-content |
| cavekit-courser-drs-content | overview, class-entry, class-features, core-ventures |

## Coverage Summary

- Kits: 4
- Output content entries: 54 (1 class entry + 21 class features + 26 core ventures + 5 Diamond Spheres ventures + 1 Cook ACF)
- Requirements: 25 (class-entry 5, class-features 6, core-ventures 7, drs-content 7)
- Acceptance criteria per kit: class-entry 29, class-features 13, core-ventures 22, drs-content 26 (total 90)
