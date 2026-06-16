---
name: traditions-tabs
description: Split Casting Traditions content into sub-pages and implement generalized tabbed navigation.
metadata:
  type: implementation
  created: 2026-06-15
  last_edited: 2026-06-15
---

# Cavekit: Traditions Tabs & Splitting

## Scope

Decompose `src/content/ultimate-spheres-of-power/power/articles/casting-traditions.md` into multiple files within `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/` and update the `[system]/casting-traditions/` page to use a generalized tabbed interface.

## Requirements

### R1: Content Decomposition
**Description:** Split the 212KB file into smaller, logical units.
**Acceptance Criteria:**
- [ ] `rules.md` — Contains intro, "Using Casting Traditions", "Casting Ability Modifiers", "Magic Type", and "Multiple Traditions".
- [ ] `standard-traditions.md` — The "Standard Traditions" section.
- [ ] `custom-traditions.md` — "Custom Traditions" and "Sample Custom Casting Traditions".
- [ ] `general-drawbacks.md` — The "General Drawbacks" section.
- [ ] `boons.md` — The "Boons" section.
- [ ] `sphere-drawbacks.md` — The "Sphere-Specific Drawbacks" section.

### R2: Generalized TabbedContent Component
**Description:** Create a reusable `src/components/TabbedContent.astro` component.
**Acceptance Criteria:**
- [ ] Component accepts a `tabs` prop: `Array<{ label: string, slug: string, articleId?: string, collection?: string }>`.
- [ ] For tabs with `articleId`, the component automatically fetches and renders the content (via `render()`).
- [ ] For tabs without `articleId`, the component renders a named slot matching the `slug`.
- [ ] URL state preserved (e.g., via hash or query param) so refreshing stays on the active tab.
- [ ] Tabs implemented for: Rules, Standard Traditions, Custom Traditions, General Drawbacks, Boons, Sphere-Specific Drawbacks.
- [ ] The `src/pages/power/casting-traditions/index.astro` page uses this component.

### R3: Sidebar and Link Updates
**Description:** Ensure navigation still works correctly.
**Acceptance Criteria:**
- [ ] `src/components/Sidebar.astro` remains linked to `/power/casting-traditions/`.
- [ ] All internal links to `/power/casting-traditions/` are verified.

## Out of Scope

- Converting the content to structured data (Phase 2).
- Building the Tradition Builder (Phase 3).
- Modifying Traditions outside the Power sphere.

## Cross-References

- See also: cavekit-traditions-overview.md
- See also: cavekit-traditions-schema.md
- See also: cavekit-traditions-builder.md
