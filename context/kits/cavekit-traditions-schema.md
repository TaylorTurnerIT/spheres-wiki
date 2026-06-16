---
name: traditions-schema
description: Define custom schemas for traditions, drawbacks, and boons to support structured data.
metadata:
  type: schema
  created: 2026-06-15
  last_edited: 2026-06-15
---

# Cavekit: Traditions Data Schema

## Scope

Establish structured data formats for tradition components in `src/content.config.ts`. This allows the wiki to "understand" rule modifications (like casting ability score overrides) and enables the future Builder.

## Requirements

### R1: Tradition Component Schemas
**Description:** Define schemas for `drawback`, `boon`, and `tradition` in Astro.
**Acceptance Criteria:**
- [ ] `drawback` schema: includes `id`, `name`, `type` (general/sphere-specific), `cost` (number of drawbacks it counts as), `incompatible` (array of IDs), and `rules_override` (e.g., modifying casting ability).
- [ ] `boon` schema: includes `id`, `name`, `cost`, `prerequisites`, and `rules_override`.
- [ ] `tradition` schema: includes `id`, `name`, `magic_type`, `cam` (Casting Ability Modifier), `drawbacks` (array of IDs/refs), and `boons` (array of IDs/refs).

### R2: Content Migration to Data
**Description:** Transition the split markdown files into data-driven collections where appropriate.
**Acceptance Criteria:**
- [ ] Each individual General Drawback becomes a separate entry in the `drawbacks` collection.
- [ ] Each Boon becomes a separate entry in the `boons` collection.
- [ ] Standard and Custom Traditions are migrated to the `traditions` collection.

### R3: Rule Override Tracking
**Description:** Implement the logic to track which components modify default rules.
**Acceptance Criteria:**
- [ ] `Fortified Casting` is correctly tagged to override the default CAM logic (allowing Constitution).
- [ ] `Draining Casting` is linked as a prerequisite for `Fortified Casting`.

## Out of Scope

- The interactive UI for building traditions (Phase 3).
- Legacy Wikidot parsing for non-Power spheres.

## Cross-References

- See also: cavekit-traditions-overview.md
- See also: cavekit-traditions-tabs.md
- See also: cavekit-traditions-builder.md
