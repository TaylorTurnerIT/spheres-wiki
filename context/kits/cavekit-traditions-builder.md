---
name: traditions-builder
description: Follow-up UX, validation, persistence, and export plan for the live Casting Tradition Builder.
metadata:
  type: plan
  created: 2026-06-15
  last_edited: 2026-06-18
  status: planned
---

# Cavekit: Casting Tradition Builder Follow-Up

## Current State

The Builder tab is live on `/power/casting-traditions/` and consumes the structured `drawback`, `boon`, and `tradition` entries through `src/lib/castingTraditions/`. It can select general drawbacks, sphere-specific drawbacks, and boons; calculates drawback value, boon slots, unspent drawback value, bonus spell points, diagnostics, and Markdown/JSON export; and structured entries render on the article tabs through `EntryCard.astro`.

The next pass is not a new builder. It is a UX and data-behavior remediation pass that must keep one shared implementation path for:

- builder checklist entries,
- add buttons on article-tab cards,
- disabled/prerequisite/incompatibility rules,
- hover tooltip bodies,
- selected-entry text used by Markdown/JSON export.

Do not build separate tab-card and builder-entry implementations that can disagree.

## Goals

1. Make the Builder tab the prominent primary workflow on Casting Traditions.
2. Keep article prose always visible and make entry listings optional/toggleable.
3. Make every drawback/boon/tradition entry actionable from its listing card.
4. Make disabled states explainable and, where appropriate, fixable.
5. Support GM override workflows without corrupting the normal rule engine.
6. Persist in-progress and named saved traditions in browser storage and document that storage.
7. Remove Magic Type from the builder/tradition data flow, while preserving hard-coded magic-type labels for standard traditions where the PF1e source text expects them.

## Requirements

### R1: Layout and Navigation Polish

Acceptance criteria:

- [ ] Builder tab is visually emphasized compared with the prose/listing tabs.
- [ ] The book card is hidden when the Builder tab is active.
- [ ] The builder summary rail expands into the space freed by the hidden book card on desktop.
- [ ] Summary top spacing uses bottom margin only; no unexplained gap above the summary rail.
- [ ] Tab label and listing headings use `Sphere-Specific Drawbacks`, not `Sphere Drawbacks`.
- [ ] Listing toggles remove the word `Structured` from their visible labels.
- [ ] Builder copy uses `Casting Ability Modifier`, not `CAM`.
- [ ] Muted entry metadata/subtext is revised for readable contrast.

### R2: Shared Entry Model and Actions

Acceptance criteria:

- [ ] Build one compact client-side entry index for drawbacks and boons that includes `id`, `name`, `kind`, source book title, tags, rendered plain-text excerpt, full rendered text, prerequisite/incompatibility metadata, cost/value, and sphere grouping metadata.
- [ ] Builder checklists, listing-card action buttons, hover tooltips, exports, diagnostics, and storage all read from that shared index.
- [ ] Every drawback and boon listing card has an Add/Remove builder action button.
- [ ] Add buttons use the same `canSelectEntry()` logic as the builder checklist controls.
- [ ] If an entry cannot be added, the button is disabled and its tooltip explains the blocking prerequisite, incompatibility, or currency problem.
- [ ] Every listed drawback/boon/tradition has a direct-link button to its stable anchor.
- [ ] Entries with the `3pp` tag render that tag through `TagBadge` so third-party content is visible.
- [ ] Hovering a drawback, boon, or tradition action target shows a tooltip with that entry's ability/rules text excerpt.

### R3: Drawback and Boon Browsing

Acceptance criteria:

- [ ] Sphere-specific drawbacks are grouped by parent sphere.
- [ ] Sphere-specific drawbacks sort by parent sphere, then alphabetically inside each sphere.
- [ ] Dual-sphere drawbacks are included in the same browse surface with clear dual-sphere labels.
- [ ] Sphere-specific drawback controls move below boons in the Builder tab.
- [ ] Boons move into the position currently occupied by sphere drawbacks.
- [ ] Sphere-specific drawbacks have a text filter and a sphere dropdown; the text filter is half width when the dropdown is present.
- [ ] Boons have a text filter in the Builder tab.
- [ ] The Sphere-Specific Drawbacks and Boons article tabs expose the same relevant filters and sphere selector as the Builder tab.
- [ ] "Start from Tradition" default option text is `None`.

### R4: Casting Ability Modifier and GM Overrides

Acceptance criteria:

- [ ] Blocked Casting Ability Modifier choices show this tooltip exactly: "Unless a particular boon or magic trait is being used, this choice must be made from Intelligence, Wisdom, or Charisma. With GM permission, this can be overwritten by clicking the lock icon."
- [ ] Add a lock/unlock button for Casting Ability Modifier restrictions.
- [ ] Locked/default state follows `getAllowedCastingAbilities()`.
- [ ] Unlocked/GM override state allows selecting any ability score.
- [ ] Override state is visibly marked and is included in saved builder state and exported JSON.

### R5: Manual Currency Adjustments

Acceptance criteria:

- [ ] Add +/- controls for manual General Drawback Value adjustment.
- [ ] Add +/- controls for manual Available Boon Slots adjustment.
- [ ] Manual adjustments are visibly labeled as GM adjustments and do not mutate selected drawbacks/boons.
- [ ] Validation and export calculations include those adjustments.
- [ ] Saved state and JSON export include adjustment values.

### R6: Diagnostics and Quick Fixes

Acceptance criteria:

- [ ] Unmet prerequisite diagnostics include a human-readable excerpt of the prerequisite, not only a generic message.
- [ ] Incompatibility diagnostics show formatted entry names, not raw ids.
- [ ] Diagnostics include a Fix button when the missing prerequisite can be toggled safely.
- [ ] A Fix button is enabled only if applying it does not create another prerequisite failure, incompatibility, or currency violation.
- [ ] Fix logic uses the same `canSelectEntry()` and validation helpers as manual add buttons.

### R7: Export and Persistence

Acceptance criteria:

- [ ] Markdown export has a Detailed toggle.
- [ ] Detailed off keeps the current concise export style.
- [ ] Detailed on appends each selected drawback/boon/sphere-specific drawback's full text in its own Markdown blockquote.
- [ ] JSON export always includes the full text for each selected ability, regardless of Detailed mode.
- [ ] Broken tables in boon Markdown render correctly in the exported detailed text.
- [ ] Builder state is persisted in browser storage so users do not lose work when navigating away.
- [ ] Realtime autosave is debounced and writes only the compact serialized builder state, not rendered card HTML or hydrated source entry data.
- [ ] Autosave flushes on deliberate Save, reset/delete actions, and page lifecycle events such as `pagehide` when supported.
- [ ] A visible Save button writes the current tradition as a named saved tradition.
- [ ] Save status is visible without being noisy: unsaved changes, saving, saved, and save failed states.
- [ ] Users can select a previously saved casting tradition from a saved-traditions control.
- [ ] Users can delete a saved casting tradition only after a confirmation popup.
- [ ] Users can reset the current builder back to defaults after a confirmation popup if the current state has unsaved changes.
- [ ] Reset defaults clears selected drawbacks, boons, sphere-specific drawbacks, choices, overrides, manual GM adjustments, and export toggles, and restores the empty builder defaults without deleting saved traditions.
- [ ] Saved tradition records include a stable id, display name, updated timestamp, and builder schema version for future migrations.
- [ ] Users can export their entire saved-tradition catalog as a portable JSON backup file.
- [ ] Users can import a saved-tradition catalog from a JSON backup file.
- [ ] Import validates schema version and record shape before writing to browser storage.
- [ ] Import offers a clear choice between merging with existing saved traditions and replacing the existing catalog.
- [ ] Import never overwrites a saved tradition with the same id without user confirmation or deterministic conflict handling.
- [ ] The saved-traditions area includes a small info icon tooltip warning that clearing browser data will remove saved casting traditions unless they have exported a backup.
- [ ] Browser storage key, purpose, retention, and deletion behavior are documented on `/privacy/`.
- [ ] URL state remains shareable; loading precedence is explicit: URL state wins over stored draft when URL parameters are present.

### R8: Remove Magic Type From the Builder System

Acceptance criteria:

- [ ] Remove Magic Type controls from the Builder UI.
- [ ] Remove `magicType` from `TraditionSelection`, builder JSON hydration, saved builder state, concise Markdown export, and JSON export.
- [ ] Remove Magic Type metadata from custom/nonstandard tradition listing cards.
- [ ] Standard tradition listing cards keep a hard-coded source-faithful magic-type label in their header metadata only.
- [ ] Schema/content cleanup removes or ignores `magicType` on structured traditions after confirming build validation and source parity.

## Implementation Plan

### Step 1: Data and Shared Helpers

- Create shared client-side helpers for entry lookup, text extraction, filtering, sorting, and `canSelectEntry()` decisions.
- Hydrate rendered/plain text for drawbacks, boons, and traditions once from the Astro page.
- Add tests for diagnostic name formatting, prerequisite excerpts, manual adjustments, and detailed export text.

### Step 2: Layout and Tab Integration

- Update `TabbedContent`/Casting Traditions tab behavior so active Builder state can hide the sidebar book card and widen the builder summary.
- Rename labels and listing toggles.
- Emphasize the Builder tab with CSS while keeping accessible tab semantics.

### Step 3: Filters, Grouping, and Entry Actions

- Add shared filters to builder panels and article-tab listing sections.
- Group sphere-specific drawbacks by sphere and sort by sphere/name.
- Add shared Add/Remove and anchor-link buttons to `EntryCard` usage for drawback/boon listing sections.

### Step 4: Override Controls and Diagnostics

- Add Casting Ability Modifier lock/unlock override.
- Add manual drawback-value and boon-slot steppers.
- Upgrade diagnostics with formatted names, prerequisite excerpts, and safe Fix buttons.

### Step 5: Export, Storage, and Privacy

- Extend export helpers to support detailed Markdown and always-text-rich JSON.
- Normalize table serialization for detailed exports.
- Add browser-storage persistence, URL precedence, named saved traditions, debounced autosave, manual Save, reset defaults, confirmed delete, catalog import/export, browser-data-loss warning tooltip, and `/privacy/` documentation.

### Step 6: Magic Type Removal and Verification

- Remove Magic Type from builder state and exports.
- Preserve hard-coded standard-tradition display labels only where required by source text.
- Remove/ignore `magicType` from schema/content after verifying the content validator and real standard tradition cards still render as intended.

## Verification

- `bun run test`
- `bun run build`
- `bunx fallow audit --format json --quiet --explain --gate-marker agent`
- Manual checks:
  - Builder tab hides book card and summary fills the right rail.
  - Listing-card Add buttons and builder checkboxes agree on enabled/disabled state.
  - Disabled Casting Ability Modifier tooltip and lock override work.
  - Detailed Markdown includes blockquoted entry text and boon tables remain tables.
  - JSON includes entry text.
  - Stored draft restores after leaving and returning; URL parameters override the draft.
  - Save creates/selects a named saved tradition; delete requires confirmation; reset defaults does not delete saved traditions.
  - Catalog export produces a portable JSON backup; catalog import can merge or replace saved traditions; the saved-traditions warning tooltip is visible.

## Cross-References

- `context/kits/cavekit-traditions-full-plan.md`
- `context/kits/cavekit-traditions-remediation.md`
- `src/pages/power/casting-traditions/index.astro`
- `src/lib/castingTraditions/`
- `src/components/EntryCard.astro`
