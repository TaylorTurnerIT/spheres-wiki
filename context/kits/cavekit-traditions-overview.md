---
name: traditions-overhaul
description: Master index for refactoring Casting Traditions into a multi-page tabbed interface with custom schemas and a future builder.
metadata:
  type: project
  created: 2026-06-15
  last_edited: 2026-06-15
---

# Cavekit Overview: Casting Traditions Overhaul

Refactor the massive `casting-traditions.md` (212KB) into a manageable, tabbed interface. The project is split into three phases: content decomposition into a tabbed UI (using a generalized component), schema-driven data modeling for tradition components (drawbacks/boons), and the architectural foundation for a Casting Tradition Builder.

## Kits

| Kit | Description |
|-----|-------------|
| cavekit-traditions-overview.md | This index: project description, cross-references, dependency graph, SPEC task map. |
| cavekit-traditions-tabs.md | Phase 1: Splitting the master article into logical sub-pages and implementing the generalized `TabbedContent` Astro component. 3 requirements (R1–R3). |
| cavekit-traditions-schema.md | Phase 2: Defining `drawback`, `boon`, and `tradition` content collections/schemas to support structured data and rule overrides. 3 requirements (R1–R3). |
| cavekit-traditions-builder.md | Phase 3: Architectural spec for the interactive Casting Tradition Builder, including real-time validation and multi-format export. 3 requirements (R1–R3). |

## Dependency Graph

```
cavekit-traditions-overview       (index, no requirements)

cavekit-traditions-tabs           (extract and tab first)
        ▲
        │
cavekit-traditions-schema         (define schemas and migrate data)
        ▲
        │
cavekit-traditions-builder        (build interactive tool on top of data)
```

- No circular dependencies.
- Traditions-tabs (Phase 1) creates the UI structure.
- Traditions-schema (Phase 2) provides the structured data that the Builder (Phase 3) consumes.

## Cross-Reference Map

Each kit cross-references all other sibling kits and this overview:

| Kit | References |
|-----|-----------|
| cavekit-traditions-tabs | overview, traditions-schema, traditions-builder |
| cavekit-traditions-schema | overview, traditions-tabs, traditions-builder |
| cavekit-traditions-builder | overview, traditions-tabs, traditions-schema |

## Coverage Summary

- Kits: 3 (plus this overview).
- Requirements: 9 (tabs 3, schema 3, builder 3).
- Acceptance criteria per kit: tabs 14, schema 8, builder 8 (total 30).

## SPEC Task Map

This overhaul realizes SPEC tasks T105–T107:

| SPEC item | Description | Governing requirement |
|-----------|-------------|-----------------------|
| T105 | Create generalized `TabbedContent.astro` component. | traditions-tabs R2 |
| T106 | Define custom schemas for traditions/drawbacks/boons. | traditions-schema R1 |
| T107 | Implement interactive Casting Tradition Builder. | traditions-builder R1–R3 |

## Validation Checklist (campaign-wide)

- [ ] Every acceptance criterion is testable.
- [ ] No circular dependencies in the graph.
- [ ] `TabbedContent.astro` is truly generalized (supports MD render + slots).
- [ ] `Fortified Casting` logic is correctly captured in the schema.
- [ ] Builder export matches the existing wiki Markdown style for traditions.
- [ ] The site builds with no data or schema errors (SPEC V34).
