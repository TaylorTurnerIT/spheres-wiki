# Implementation Plan: Casting Tradition Builder Follow-Up

Date: 2026-06-18

## Objective

Implement the next pass of Casting Tradition Builder UX and behavior from `context/kits/cavekit-traditions-builder.md`. The core constraint is to avoid duplicate implementations: builder checklists, article-tab Add buttons, tooltips, diagnostics, filters, and exports must use shared entry data and shared selection-validation helpers.

## Phase 1: Shared Builder Data Model

Primary files:

- `src/pages/power/casting-traditions/index.astro`
- `src/lib/castingTraditions/rules.ts`
- `src/lib/castingTraditions/export.ts`
- `src/lib/castingTraditions/types.ts`
- `tests/lib/castingTraditions.test.ts`

Work:

- Hydrate one compact client-side entry index for drawbacks, boons, and traditions.
- Include source title, tags, `3pp` tag state, cost/value, sphere grouping metadata, prerequisite/incompatibility data, rendered excerpt, and full rendered text.
- Add shared helpers for filtering, sorting, prerequisite excerpts, formatted diagnostic names, and `canSelectEntry()`.
- Ensure article-tab card buttons and builder checkbox state consume the same helpers.

Verification:

- Unit tests for formatted incompatibility names, prerequisite excerpts, selection eligibility, and text-bearing JSON export.
- `bun run test`
- `bun run build`

## Phase 2: Layout, Labels, and Builder Prominence

Primary files:

- `src/components/TabbedContent.astro`
- `src/layouts/ArticlePage.astro`
- `src/pages/power/casting-traditions/index.astro`

Work:

- Emphasize the Builder tab visually while preserving tab semantics.
- Hide the book card while Builder is active.
- Let the builder summary rail use the freed sidebar space on desktop.
- Fix the summary top gap by using bottom-only spacing.
- Rename visible copy:
  - `Sphere Drawbacks` -> `Sphere-Specific Drawbacks`
  - `CAM` -> `Casting Ability Modifier`
  - listing toggles remove `Structured`
  - Start from Tradition default text -> `None`
- Improve muted card metadata/subtext contrast.

Verification:

- Build and generated HTML spot checks for labels.
- Manual browser check of Builder tab layout at desktop and mobile widths.

## Phase 3: Filters, Grouping, and Ordering

Primary files:

- `src/pages/power/casting-traditions/index.astro`
- optional helper module under `src/lib/castingTraditions/`

Work:

- Group sphere-specific drawbacks by parent sphere.
- Sort sphere-specific drawbacks by sphere, then by name.
- Move Boons above Sphere-Specific Drawbacks in the Builder tab.
- Add text filters for Boons and Sphere-Specific Drawbacks.
- Add a sphere dropdown for Sphere-Specific Drawbacks with a half-width adjacent text filter.
- Add equivalent filters/dropdowns to the Boons and Sphere-Specific Drawbacks article-tab listing sections.

Verification:

- Manual checks for a known sphere-specific drawback and a known boon.
- `bun run build`

## Phase 4: Entry Card Actions and Tooltips

Primary files:

- `src/components/EntryCard.astro`
- `src/pages/power/casting-traditions/index.astro`
- shared builder helpers from Phase 1

Work:

- Add Add/Remove builder action buttons to every drawback and boon card on the article tabs.
- Add direct anchor-link buttons to every drawback, boon, and tradition card.
- Disable Add buttons when prerequisites, incompatibilities, or currency fail.
- Tooltip disabled Add buttons with the blocking reason.
- Tooltip hover targets with entry text excerpts.
- Render `TagBadge` tags, including `3pp`, on boons and drawbacks.

Verification:

- Listing-card Add state and Builder checkbox state agree for the same entry.
- Disabled prerequisite case has a specific tooltip.
- `bun run build`

## Phase 5: Overrides, Manual Adjustments, and Diagnostics

Primary files:

- `src/lib/castingTraditions/rules.ts`
- `src/lib/castingTraditions/types.ts`
- `src/pages/power/casting-traditions/index.astro`
- `tests/lib/castingTraditions.test.ts`

Work:

- Add lock/unlock override for Casting Ability Modifier restrictions.
- Blocked ability choices show the exact required tooltip:
  `"Unless a particular boon or magic trait is being used, this choice must be made from Intelligence, Wisdom, or Charisma. With GM permission, this can be overwritten by clicking the lock icon."`
- Add +/- controls for manual General Drawback Value adjustment.
- Add +/- controls for manual Available Boon Slots adjustment.
- Mark manual adjustments as GM adjustments in UI and exported JSON.
- Upgrade diagnostics:
  - unmet prerequisites include readable excerpts,
  - incompatibilities show formatted names,
  - Fix buttons appear only when applying the fix does not cause a new restriction failure.

Verification:

- Unit tests for override state, manual adjustment calculations, formatted diagnostics, and safe-fix eligibility.
- `bun run test`
- `bun run build`

## Phase 6: Export and Persistence

Primary files:

- `src/lib/castingTraditions/export.ts`
- `src/lib/castingTraditions/types.ts`
- `src/pages/power/casting-traditions/index.astro`
- privacy page route/content
- `tests/lib/castingTraditions.test.ts`

Work:

- Add Detailed Markdown toggle.
- Concise Markdown remains current.
- Detailed Markdown appends selected drawback/boon/sphere-specific drawback text in blockquotes.
- Preserve Markdown tables in detailed export, especially boon tables.
- JSON always includes full entry text regardless of Detailed mode.
- Persist the active builder draft in browser storage.
- Implement realtime autosave with a debounce so text input, checkbox toggles, filters, and export toggles do not write on every event.
- Autosave writes only compact serialized builder state: selection ids, choices, name, Casting Ability Modifier override state, manual GM adjustments, export options, schema version, and timestamps. Do not store rendered HTML or the hydrated source-entry catalog.
- Flush pending autosave on explicit Save, reset/delete actions, and `pagehide` where supported.
- Add a visible Save button that stores the current builder state as a named saved casting tradition.
- Track and display save status: unsaved changes, saving, saved, and save failed.
- Add a saved-tradition picker for loading previously saved casting traditions.
- Add confirmed deletion for saved casting traditions.
- Add reset-to-defaults control. If the current state has unsaved changes, confirm before clearing. Reset clears selected drawbacks, boons, sphere-specific drawbacks, choices, overrides, manual GM adjustments, and export toggles, but does not delete saved traditions.
- Include stable id, display name, updated timestamp, and builder schema version in each saved tradition record.
- URL state wins over stored drafts when URL parameters are present.
- Document browser storage key, purpose, retention, and deletion behavior on `/privacy/`.

Verification:

- Unit tests for detailed Markdown, text-rich JSON, storage serialization shape, and reset-defaults behavior.
- Manual storage restore, named Save/load, confirmed delete, reset-defaults, autosave debounce, and URL precedence checks.
- `bun run test`
- `bun run build`

## Phase 7: Magic Type Removal

Primary files:

- `src/content.config.ts`
- `src/lib/types.ts`
- `src/lib/castingTraditions/types.ts`
- `src/lib/castingTraditions/rules.ts`
- `src/lib/castingTraditions/export.ts`
- `src/pages/power/casting-traditions/index.astro`
- structured tradition content under `src/content/**/power/casting-traditions/traditions/`

Work:

- Remove Magic Type from Builder controls, selection state, saved state, concise Markdown, and JSON.
- Remove Magic Type from nonstandard tradition card metadata.
- Preserve hard-coded magic-type display labels on standard tradition cards only.
- Remove or ignore `magicType` from structured content/schema once validation is updated.

Verification:

- `rg -n "magicType|Magic Type" src tests` should only show approved standard-tradition display mapping or historical docs.
- `bun run test`
- `bun run build`

## Final Gate

Run:

```bash
bun run test
bun run build
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Before commit, manually verify:

- Builder tab hides book card and summary rail expands.
- Sphere-specific drawbacks are grouped and sorted by sphere.
- Article-tab Add buttons and Builder controls agree on restrictions.
- Casting Ability Modifier lock override works.
- Manual GM adjustments affect calculations without mutating selections.
- Detailed Markdown includes blockquoted entry text and keeps boon tables readable.
- JSON includes full entry text.
- Stored drafts restore after navigation, and URL parameters override stored drafts.
- Manual Save creates a named saved tradition; the saved-tradition picker can reload it.
- Delete requires confirmation and removes only the selected saved tradition.
- Reset defaults clears the active builder state without deleting saved traditions.
- Autosave is debounced and does not write the hydrated source-entry catalog.

## Relevant Planning Docs:

- [cavekit-traditions-builder.md](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/context/kits/cavekit-traditions-builder.md)
- [cavekit-traditions-full-plan.md](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/context/kits/cavekit-traditions-full-plan.md)
