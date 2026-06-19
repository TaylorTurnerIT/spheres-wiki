---
name: traditions-full-plan
description: Comprehensive implementation plan for structured Casting Traditions content and Builder follow-up work.
metadata:
  type: plan
  created: 2026-06-17
  last_edited: 2026-06-18
---

# Cavekit: Casting Traditions Full Plan

## Current State

Casting Traditions are now structurally migrated and surfaced on the user-facing page, with remaining future work limited to deeper builder-grade semantics:

- `src/pages/power/casting-traditions/index.astro` renders the tabbed article view through `ArticlePage` plus `TabbedContent`, with structured `drawback`, `boon`, and `tradition` listing sections on the relevant tabs.
- Typed `drawback`, `boon`, and `tradition` entries exist, resolve through `ResolvedMaps`, render on `/power/casting-traditions/` with stable anchor ids, and participate in the current search/build pipeline.
- Pure builder-facing logic exists in `src/lib/castingTraditions/`, including selection validation, drawback value accounting, boon slot accounting, Casting Ability Modifier resolution, preset hydration, and export helpers. The page-level Builder tab now imports and consumes this logic.
- `bun run build` is currently green: content validation, Fallow, `astro check`, static build, Pagefind, and TOC audit all pass.
- Full `bun run test` has passed after replacing remaining `_book.yaml` metadata stubs with verified publisher/date/price data.

Structured inventory now on disk:

- 57 general drawbacks.
- 162 sphere drawbacks.
- 29 dual-sphere drawbacks.
- 21 boons.
- 24 standard traditions.
- 58 custom traditions.
- 7 card traditions.
- 6 variant traditions.
- 95 total tradition entries.

Remaining semantic gaps after coverage migration:

- Several builder-critical decisions now have schema-backed `choices`, and selected choice option `grants` are applied into resolved selections.
- `Card Casting` now exposes source-stated modifications as machine-readable choices, including preset `choiceSelections` for the seven card traditions and runtime validation for option prerequisites.
- All 95 structured traditions currently have explicit `magicType`, but the next builder follow-up removes Magic Type from the builder/state/export system. Standard traditions may keep hard-coded source-faithful magic-type display labels in their listing headers only.
- All 29 dual-sphere drawbacks now expose granted feats through structured `grants`, and selector-style entries such as `Admixture Specialist`, `Propagandist`, and `Unnatural Crafter` also expose structured `choices`.

Important rule cases that still drive the remaining plan:

- `Fortified Casting` allows Constitution as Casting Ability Modifier if higher and requires `Draining Casting`.
- `Bloodletting` and `Blood Magic` use Constitution directly.
- `Demonology` uses Charisma or Constitution if higher.
- `Spellscourged` allows a boon choice that changes Casting Ability Modifier behavior.
- `Card Casting` has nested selectable modifications and variable drawback value; this is now represented through `choices`, `choiceSelections`, and selected option `addsDrawbackValue`.
- Several entries have incompatibilities, prerequisites, repeat counts, forced bonus talents, required spheres, special buyoff rules, source tags, and source-book overrides.

## Goals

1. Convert casting tradition material into structured content under `src/content/` using project-native markdown plus YAML.
2. Preserve readable article pages during and after migration.
3. Model enough rules logic to power a high-quality Casting Tradition Builder.
4. Keep future authors able to add special drawbacks and boons without code changes for common cases.
5. Restrict code-only special handling to genuinely unusual mechanics, exposed through named rule operations.

## Non-Goals

- Do not remove the existing article tabs until structured pages are at parity.
- Do not store user-built traditions on a server.
- Do not introduce a frontend framework unless a later implementation pass proves vanilla TypeScript is insufficient.
- Do not make general logic Turing-complete in content frontmatter.

## Content Layout

Preferred paths:

```text
src/content/<book>/power/casting-traditions/drawbacks/general/<id>.md
src/content/<book>/power/casting-traditions/drawbacks/spheres/<sphere>/<id>.md
src/content/<book>/power/casting-traditions/drawbacks/dual-spheres/<id>.md
src/content/<book>/power/casting-traditions/boons/<id>.md
src/content/<book>/power/casting-traditions/traditions/standard/<id>.md
src/content/<book>/power/casting-traditions/traditions/custom/<id>.md
```

This keeps the domain grouped while still letting `inferFromPath()` derive type, id, system, sphere, and tradition category.

## Entry Types

Add three new entry types:

- `drawback`
- `boon`
- `tradition`

Extend:

- `src/content.config.ts`
- `src/lib/inferFromPath.ts`
- `src/lib/types.ts`
- `src/lib/resolveEntries.ts`
- `src/pages/search/index.astro`
- `src/lib/entryDatabase.ts`
- focused tests under `tests/lib/`

## Schema Shape

### Shared Reference Types

Use object references instead of only strings when quantity, option, or scope matters.

```ts
type EntryRef = {
  id: string;
  label?: string;
  count?: number;
  option?: string;
  sphere?: string;
  sourceBook?: string;
};
```

Use normalized ids for rule links. Display labels stay in `name`.

### Drawback Entry

```yaml
---
id: card-casting
name: Card Casting
type: drawback
drawbackKind: general
drawbackValue: 1
repeat:
  max: 3
  valueMode: scaling
tags: ["casting-tradition"]
choices:
  - id: card-casting-mode
    label: Card casting mode
    min: 0
    max: 3
    options:
      - id: cooldown
        label: Cooldown
        addsDrawbackValue: 1
      - id: mana-pool
        label: Mana Pool
        addsDrawbackValue: 1
      - id: mana-graveyard
        label: Mana Graveyard
        requires:
          all:
            - choice: cooldown
            - choice: mana-pool
        addsDrawbackValue: 1
rules:
  - op: add-drawback-value
    value: 1
---
```

Fields:

- `drawbackKind`: `general | sphere | dual-sphere`
- `drawbackValue`: numeric value for boon currency. Defaults to `1`.
- `sphere`: required for sphere drawbacks, optional for universal drawbacks.
- `spheres`: optional for dual-sphere drawbacks.
- `grants`: bonus talents, bonus feats, or other gained resources.
- `buyoff`: `talent | feat | none | custom`.
- `repeat`: min/max and how repeated selections affect value.
- `choices`: structured user choices required by the drawback.
- `requires`: prerequisites for selecting the drawback.
- `incompatible`: explicit incompatible ids or rule predicates.
- `rules`: builder-facing operations.

### Boon Entry

```yaml
---
id: fortified-casting
name: Fortified Casting
type: boon
boonCost: 1
requires:
  all:
    - drawback: draining-casting
rules:
  - op: allow-cam
    ability: con
    mode: if-higher-than-base
---
```

Fields:

- `boonCost`: number of boon slots. Defaults to `1`.
- `requires`: prerequisites.
- `repeat`: repeat rules.
- `choices`: boon-specific choices.
- `rules`: operations such as Casting Ability Modifier overrides, CL bonuses, export notes, or conditional effects.

### Tradition Entry

```yaml
---
id: blood-magic
name: Blood Magic
type: tradition
traditionKind: custom
cam:
  mode: fixed
  abilities: [con]
drawbacks:
  - id: draining-casting
  - id: extended-casting
  - id: somatic-casting
    count: 2
  - id: verbal-casting
boons:
  - id: deathful-magic
  - id: fortified-casting
  - id: overcharge
---
```

Fields:

- `traditionKind`: `standard | custom | card | variant`.
- `magicType`: legacy migration field slated for removal from builder state, exports, and nonstandard cards. Standard traditions may retain hard-coded display labels for PF1e source parity.
- `cam`: structured casting ability model.
- `drawbacks`: selected drawback refs.
- `sphereDrawbacks`: selected sphere/dual-sphere refs.
- `boons`: selected boon refs and spell-point boon entries.
- `classes`: optional PF1e class ids for standard traditions.
- `parentTradition`: optional for subtraditions such as Divine Crusader.
- `notes`: optional structured note refs, not prose replacement.

## Rule Expression Model

Do not put arbitrary JavaScript in content. Use a small operation vocabulary:

```ts
type RuleOp =
  | { op: "allow-cam"; ability: Ability; mode: "always" | "if-higher-than-base" }
  | { op: "set-cam"; abilities: Ability[]; mode: "fixed" | "choose-one" | "highest" }
  | { op: "add-drawback-value"; value: number; when?: Predicate }
  | { op: "add-bonus-spell-points"; formula: SpellPointFormula }
  | { op: "grant-talent"; sphere?: string; talent?: string; selector?: TalentSelector }
  | { op: "grant-feat"; feat?: string; selector?: FeatSelector }
  | { op: "require-choice"; choice: string }
  | { op: "export-note"; text: string };
```

Predicates should be declarative:

```ts
type Predicate =
  | { drawback: string }
  | { boon: string }
  | { choice: string }
  | { not: Predicate }
  | { all: Predicate[] }
  | { any: Predicate[] };
```

This gives future authors a safe way to express common special cases while keeping validation deterministic.

## Builder Logic Model

Create pure logic in `src/lib/castingTraditions/`:

```text
src/lib/castingTraditions/types.ts
src/lib/castingTraditions/rules.ts
src/lib/castingTraditions/validate.ts
src/lib/castingTraditions/export.ts
src/lib/castingTraditions/fixtures.ts
```

Core functions:

- `buildTraditionState(selection, data)`.
- `calculateDrawbackValue(state)`.
- `calculateBoonCost(state)`.
- `calculateBonusSpellPoints(unspentDrawbacks)`.
- `getAllowedCastingAbilities(state)`.
- `validateTradition(state)`.
- `exportTraditionMarkdown(state)`.
- `exportTraditionJson(state)`.

Validation outputs should be typed:

```ts
type TraditionDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  sourceIds: string[];
};
```

## Required Rule Coverage

Phase 1 required logic:

- General drawback currency.
- Boon cost: 2 general drawback value per boon.
- Bonus spell point table for unspent general drawbacks.
- General vs sphere-specific drawback distinction.
- Sphere drawback grants a talent or feat and does not fund boons.
- Explicit incompatibilities.
- Explicit prerequisites.
- Repeated drawbacks and `x2` style entries.
- Casting Ability Modifier defaults: Int, Wis, Cha.
- Casting Ability Modifier exceptions: Constitution via `Fortified Casting` and fixed-Con traditions.

Phase 2 required logic:

- Choice-bearing drawbacks such as `Energy Focus`, `Limited Creation`, `Limited Nature`.
- Card Casting nested modifications.
- Universal sphere-specific drawbacks such as `Striker`.
- Dual-sphere drawback grouping.
- Buyoff method display.
- Source-book attribution per structured entry.

Phase 3 required logic:

- Export to wiki markdown.
- Export to JSON.
- Shareable URL state.
- Browser-storage drafts and named saved traditions, with debounced autosave and `/privacy/` documentation.

## UI Plan

The Builder tab now exists on `/power/casting-traditions/`. The next UI pass should make it the primary workflow while preserving the prose article tabs and reusing one shared entry-action implementation across the builder and article-tab cards.

Controls:

- Tradition name input.
- Casting Ability Modifier segmented control with dynamic enabled states.
- General drawbacks searchable multi-select/list.
- Boons panel enabled by available currency.
- Sphere-specific drawbacks grouped by sphere.
- Selected summary rail with diagnostics.
- Export panel with Markdown and JSON tabs plus a Detailed Markdown toggle.

UX rules:

- Article prose remains visible; entry listings are toggleable add-ons, not prose replacements.
- The Builder tab should be visually emphasized as the primary feature.
- When the Builder tab is active, hide the sidebar book card and let the summary rail occupy the freed space.
- Disabled choices must explain why.
- Incompatibilities should show formatted entry names on both sides, not ids.
- Required choices should be inline, not deferred to final validation.
- Calculated boon currency and bonus spell points should update immediately.
- Source links should point back to detail entries.
- Add/Remove buttons on listing cards and builder controls must share the same selection validation logic.
- Hovering drawbacks, boons, or traditions should show an excerpt tooltip from the entry text.
- Browser storage may persist drafts and named saved traditions, but `/privacy/` must document the key, purpose, retention, deletion behavior, and reset behavior.
- On mobile, summary moves below selections; no nested card layouts.

Implementation should use vanilla TypeScript unless later complexity justifies an island framework.

## Builder UX Follow-Up Plan

This plan is the next implementation pass after the initial remediation shipped. It is tracked in more detail in `cavekit-traditions-builder.md`.

### Step 1: Shared builder/listing entry model

- Build one client-side entry index for drawbacks, boons, and traditions.
- Include id, display name, source, tags, `3pp` tag state, sphere metadata, cost/value, prerequisite/incompatibility data, plain-text excerpt, and full rendered text.
- Use this index for builder checklists, article-tab card actions, hover tooltips, diagnostics, detailed export, JSON export, and storage.
- Add a shared `canSelectEntry()` path for builder checkbox state and listing-card Add buttons.

### Step 2: Layout and wording

- Hide the book card when the Builder tab is active and allow the builder summary rail to use the freed sidebar width.
- Emphasize the Builder tab visually while preserving `role="tab"` semantics.
- Rename `Sphere Drawbacks` to `Sphere-Specific Drawbacks`.
- Replace `CAM` with `Casting Ability Modifier`.
- Remove `Structured` from listing toggle labels.
- Fix the summary top gap by using bottom-only spacing.
- Improve muted metadata/subtext contrast.

### Step 3: Filtering, grouping, and ordering

- Group sphere-specific drawbacks by parent sphere.
- Sort sphere-specific drawbacks by sphere and then alphabetically within each sphere.
- Move boons above sphere-specific drawbacks in the Builder tab.
- Add text filters for boons and sphere-specific drawbacks.
- Add a sphere dropdown to sphere-specific drawbacks; keep the text filter half width next to the dropdown.
- Expose the same boon filter and sphere-specific drawback filter/dropdown on the corresponding article tabs.
- Set the Start From Tradition default option text to `None`.

### Step 4: Entry-card actions and tooltips

- Add Add/Remove buttons to every drawback and boon listing card.
- Disable Add when prerequisites, incompatibilities, currency, or other restrictions fail.
- Provide a tooltip with the exact reason an Add button is disabled.
- Add a direct anchor-link button beside every listed drawback, boon, and tradition.
- Show entry text excerpts in hover tooltips for drawbacks, boons, and traditions.
- Render `TagBadge` tags, including `3pp`, on boons and drawbacks.

### Step 5: Overrides and adjustments

- Blocked Casting Ability Modifier choices show the exact tooltip:
  `"Unless a particular boon or magic trait is being used, this choice must be made from Intelligence, Wisdom, or Charisma. With GM permission, this can be overwritten by clicking the lock icon."`
- Add lock/unlock override for Casting Ability Modifier restrictions; locked state follows the rule engine, unlocked state permits any ability.
- Add +/- controls for manual General Drawback Value adjustment.
- Add +/- controls for manual Available Boon Slots adjustment.
- Treat manual adjustments as explicit GM adjustments in the UI, saved state, and JSON export.

### Step 6: Diagnostics and safe fixes

- Show prerequisite excerpts in unmet prerequisite diagnostics.
- Show formatted names in incompatibility diagnostics.
- Add Fix buttons for diagnostics only when the fix can be applied without creating another restriction failure.
- Reuse the shared selection-validation helper for Fix button eligibility.

### Step 7: Export and persistence

- Add Detailed Markdown output.
- Concise Markdown remains the current name-only style.
- Detailed Markdown appends full entry text for selected drawbacks, boons, and sphere-specific drawbacks, each separated into its own blockquote.
- Preserve Markdown tables inside detailed export, especially boon tables.
- JSON export always includes full entry text regardless of Detailed mode.
- Persist the current builder draft in browser storage with debounced realtime autosave.
- Add a visible Save button that writes the current state as a named saved casting tradition.
- Add saved-tradition selection so users can load prior saved traditions.
- Add confirmed deletion for saved traditions.
- Add reset-to-defaults behavior that clears the active builder state, choices, overrides, manual GM adjustments, and export toggles without deleting saved traditions.
- Store only compact serialized builder state and saved-tradition metadata; do not write rendered card HTML or hydrated source-entry data.
- Track save status in the UI: unsaved changes, saving, saved, and save failed.
- Document browser storage keys and saved-tradition behavior on `/privacy/`.
- URL state remains supported and wins over stored drafts when URL parameters are present.

### Step 8: Magic Type removal

- Remove Magic Type from the Builder UI.
- Remove `magicType` from `TraditionSelection`, builder hydration/state, storage, concise Markdown export, and JSON export.
- Remove Magic Type metadata from nonstandard tradition cards.
- Keep hard-coded magic-type labels on standard tradition cards only, because those standard traditions align directly with Pathfinder 1e source categories.
- Remove or ignore `magicType` in structured content/schema after verifying validation and page rendering.

## Migration Plan

### Step 0: Audit and Fixtures

- Keep the current article tabs intact.
- Add parsing/audit script that inventories headings and source tags from the current six article files.
- Create fixture data for 5-10 representative entries:
  - Addictive Casting
  - Somatic Casting
  - Verbal Casting
  - Draining Casting
  - Card Casting
  - Fortified Casting
  - Easy Focus
  - Blood Magic
  - Demonology
  - one sphere-specific drawback with required bonus talent

### Step 1: Schema and Resolver

- Add entry types and maps.
- Add path inference for `power/casting-traditions/...`.
- Add unit tests for inference, schema validation, and map resolution.
- Add search manifest support only after routes exist.

### Step 2: Data Migration

- Write a converter for current article tabs into separate markdown entries.
- Generate drafts under `src/content/ultimate-spheres-of-power/power/casting-traditions/...`.
- Manually review generated frontmatter for every non-trivial rule case.
- Keep article body text in each entry body.
- Preserve source attribution through `sourceBook`, not inline `Source:` body text, where possible.

### Step 3: Structured Listing Pages

- Keep existing tab articles as legacy readable views.
- Add data-driven sections inside the same tabs or parallel detail routes.
- Render drawback/boon/tradition entries with shared header/source/tag pattern.
- Add Pagefind metadata and internal entry URLs.

### Step 4: Rule Engine

- Implement pure validation and calculation helpers.
- Add unit tests for every required rule coverage item.
- Treat unknown `rules` operations as build-time validation errors.

### Step 5: Builder Tab

- Add custom tab content through `TabbedContent` slot support.
- Hydrate builder data as compact JSON from resolved maps.
- Bind on `astro:page-load`.
- Add no localStorage at first; use URL state for shareability.

### Step 6: Hardening

- Full migration parity audit:
  - heading count matches known totals.
  - every legacy drawback/boon/tradition has structured entry or documented skip.
  - every tradition ref resolves to known drawback/boon id or documented free-form note.
- Run `bun run test`, `bun run validate`, and `bun run build`.
- Update SPEC T106/T107 when complete.

## Post-Migration Remediation Plan

The coverage pass is done. The remaining work is no longer “migrate missing files”; it is “replace prose-only semantics with structured builder-ready data”.

### Workstream 1: Variant Traditions

- Status: complete.
- Structured `traditionKind: variant` entries now exist for the 6 former prose-only subtraditions from `custom-traditions.md`.
- `parentTradition` is now used for those variant entries, and the duplicated subheading prose was removed from the affected parent structured entries.

Implemented entries:

- `divine-crusader`
- `inquisitor-divine-petitioner`
- `hunter-druidic`
- `combat-sorcery`
- `combat-wizardry`
- `witchcraft`

### Workstream 2: Choice Normalization

- Status: complete for non-Card-Casting choices.
- Schema-backed `choices` now exist on tradition entries as well as boons and drawbacks.
- `Spellscourged`, `Morose Essentialist`, and `Inherent Divinity` no longer depend on prose-only notes for their key selection prompts.
- `Akashic Tech` now references the source-backed `Essence Empowerment` and `Essence Pool` boons from `Spheres of Akasha`.
- `Qlippoth Psionics` now has a normalized spell-point note instead of an ambiguous `+1` note.
- `buildTraditionState()` now applies selected choice option `grants` into drawback, sphere drawback, and boon refs.
- `validateTradition()` now validates choice `min` and `max` cardinality and rejects unknown choice ids/options.

Remaining follow-up:

- Decide whether open selector choices should remain empty-option selectors or be expanded from resolved entry maps at runtime.

### Workstream 3: Card Casting Data Model

- Upgrade `card-casting` from prose-preserved migration output to a structured drawback with nested `choices` and rule-aware value scaling.
- Model the core modifications (`Cooldown`, `Mana Pool`, `Mana Graveyard`) and the bounded secondary modifications as normalized option ids.
- Repoint all 7 card traditions away from opaque `option:` text and toward the structured choice ids.
- Only leave free-text where the source is intentionally open-ended, such as “any Deck feat”, and document that as a deliberate escape hatch.

### Workstream 4: Dual-Sphere Grant Normalization

- Status: complete for static grant payloads; in progress for builder behavior.
- All 29 dual-sphere drawbacks expose `grants` payloads.
- `Admixture Specialist`, `Propagandist`, and `Unnatural Crafter` now expose selector/alternative `choices` instead of relying only on prose.
- Selected choice grants now flow into resolved selections for validation and export.

### Workstream 5: Metadata Completion

- Remove Magic Type from the builder-facing tradition system; keep only hard-coded standard-tradition display labels where needed for PF1e source parity.
- Remove explicit unresolved-normalization notes from migrated entries by converting them into structured frontmatter or documenting them as intentional skips in this plan. `Akashic Tech` no longer carries an unresolved normalization marker.
- Review `classes`, `parentTradition`, and other optional tradition metadata wherever the article gives concrete structured meaning.

### Workstream 6: Builder-Readiness Hardening

- Extend `tests/lib/castingTraditions.test.ts` to cover:
  - variant tradition inheritance and overrides
  - choice-bearing boon/drawback validation
  - dual-sphere grant surfacing
  - card-casting drawback value and prerequisite logic
- Add an audit pass that fails if structured casting-tradition entries still contain unresolved migration markers such as `Unresolved source references`.
- Re-run `bun run test` and `bun run build` after each workstream, not only at the end.

## Recommended Sequence

1. Tackle `Card Casting` last, because it is the most complex single rule surface and will likely refine the schema vocabulary.
2. Once Card Casting is complete, harden the builder and audit coverage around choices, grants, and export behavior.
3. Only after those are done should the interactive builder UI be treated as unblocked.

## Acceptance Criteria

- `drawback`, `boon`, and `tradition` are valid schema types.
- Structured entries resolve into `ResolvedMaps`.
- Existing article tabs still render, and structured entries render inside the Casting Traditions page.
- All 6 former prose-only subtraditions are represented as structured `tradition` entries.
- Builder can validate a Blood Magic tradition using Constitution.
- Builder can validate `Fortified Casting` only when `Draining Casting` is present.
- Builder can calculate unspent drawback spell-point bonuses.
- Builder can flag incompatible selections.
- Builder-critical choices are represented structurally rather than only in `notes`.
- Builder can apply selected choice option grants into resolved selections.
- Builder can validate required and maximum choice counts.
- Dual-sphere drawbacks expose granted feats through `grants`.
- Magic Type no longer participates in builder state or exports; standard tradition cards preserve source-faithful magic-type labels as hard-coded display metadata.
- Builder can export Markdown matching current tradition style.
- Builder has a manual Save button, debounced realtime autosave, saved-tradition selection, confirmed deletion, and reset-to-defaults controls.
- Future content authors can add a normal drawback, boon, or tradition with no code changes.

## Open Decisions

- Resolved 2026-06-18: structured entries first render inside the existing Casting Traditions page with stable anchor ids and search-manifest links. Standalone public detail routes remain deferred until there is a concrete need for per-entry pages.
- Resolved 2026-06-18: article prose remains always visible; structured entry listings are optional/toggleable sections appended to relevant tabs.
- Resolved 2026-06-18: Magic Type is removed from builder state/export semantics. Standard traditions may keep source-faithful magic-type display labels in their card headers only.
- Whether source tags embedded in old article bodies should be stripped during migration or preserved until source metadata is fully normalized.
- Whether tradition variants should be first-class `tradition` entries with `parentTradition`, or nested notes on the parent.
- Whether Foundry export should target a generic JSON shape first or a specific system/module schema.
