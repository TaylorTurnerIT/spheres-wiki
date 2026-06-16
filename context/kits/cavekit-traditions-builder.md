---
name: traditions-builder
description: Architectural design for the interactive Casting Tradition Builder.
metadata:
  type: design
  created: 2026-06-15
  last_edited: 2026-06-15
---

# Cavekit: Casting Tradition Builder

## Scope

Design and implement a client-side interactive tool that allows users to select Drawbacks and Boons to create a valid Casting Tradition, calculating costs and rule modifications in real-time.

## Requirements

### R1: Interactive Selection UI
**Description:** A React/Svelte/Vue component (rendered via Astro) for picking components.
**Acceptance Criteria:**
- [ ] List of General Drawbacks with checkboxes.
- [ ] List of Boons with logic to enable/disable based on current Drawback "currency".
- [ ] Real-time total calculation (Number of Drawbacks vs Number of Boons).

### R2: Validation Logic
**Description:** Ensure the created tradition follows the rules.
**Acceptance Criteria:**
- [ ] Warn if incompatible drawbacks are selected (e.g., `Clarke Compliance` and `Age of Reason`).
- [ ] Enforce prerequisites (e.g., `Fortified Casting` requires `Draining Casting`).
- [ ] Verify CAM selection is valid (Int/Wis/Cha by default, others via Boons).

### R3: Export Functionality
**Description:** Export the tradition in various formats.
**Acceptance Criteria:**
- [ ] Export as formatted Markdown (matching the wiki's tradition style).
- [ ] Export as a JSON object compatible with FoundryVTT class feature import.

## Out of Scope

- Storing user traditions in a database (local storage only).
- Server-side rendering for individual custom traditions (unless saved as content).

## Cross-References

- See also: cavekit-traditions-overview.md
- See also: cavekit-traditions-tabs.md
- See also: cavekit-traditions-schema.md
