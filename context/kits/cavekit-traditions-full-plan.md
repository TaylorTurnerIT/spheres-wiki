---
name: traditions-full-plan
description: Comprehensive implementation plan for structured Casting Traditions content and the future builder.
metadata:
  type: plan
  created: 2026-06-17
  last_edited: 2026-06-17
---

# Cavekit: Casting Traditions Full Plan

## Current State

Casting Traditions are currently article-only content:

- `src/pages/power/casting-traditions/index.astro` renders `ArticlePage` plus `TabbedContent`.
- `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/` holds six tabs: rules, standard traditions, custom traditions, general drawbacks, sphere drawbacks, and boons.
- No typed `drawback`, `boon`, or `tradition` entries exist yet.
- SPEC already tracks this as T106 and T107.

Content inventory:

- 57 general drawback headings.
- 191 sphere or dual-sphere drawback headings.
- 19 boon headings.
- 24 standard traditions.
- 71 custom/card traditions.
- 89 casting ability modifier lines across standard/custom traditions.

Important rule cases already visible:

- `Fortified Casting` allows Constitution as CAM if higher and requires `Draining Casting`.
- `Bloodletting` and `Blood Magic` use Constitution directly.
- `Demonology` uses Charisma or Constitution if higher.
- `Spellscourged` allows Charisma or Constitution by text.
- `Card Casting` has nested selectable modifications and variable drawback value.
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
- `rules`: operations such as CAM overrides, CL bonuses, export notes, or conditional effects.

### Tradition Entry

```yaml
---
id: blood-magic
name: Blood Magic
type: tradition
traditionKind: custom
magicType: arcane
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
- `magicType`: `arcane | divine | psychic | other | none | custom`.
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
- CAM defaults: Int, Wis, Cha.
- CAM exceptions: Constitution via `Fortified Casting` and fixed-Con traditions.

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
- Optional localStorage drafts if documented on `/privacy/`.

## UI Plan

Add a new Builder tab to `/power/casting-traditions/` after the data layer exists.

Controls:

- Tradition name input.
- Magic type segmented control.
- CAM segmented control with dynamic enabled states.
- General drawbacks searchable multi-select/list.
- Sphere drawbacks grouped by sphere.
- Boons panel enabled by available currency.
- Selected summary rail with diagnostics.
- Export panel with Markdown and JSON tabs.

UX rules:

- Disabled choices must explain why.
- Incompatibilities should show both sides.
- Required choices should be inline, not deferred to final validation.
- Calculated boon currency and bonus spell points should update immediately.
- Source links should point back to detail entries.
- On mobile, summary moves below selections; no nested card layouts.

Implementation should use vanilla TypeScript unless later complexity justifies an island framework.

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

## Acceptance Criteria

- `drawback`, `boon`, and `tradition` are valid schema types.
- Structured entries resolve into `ResolvedMaps`.
- Existing article tabs still render.
- Builder can validate a Blood Magic tradition using Constitution.
- Builder can validate `Fortified Casting` only when `Draining Casting` is present.
- Builder can calculate unspent drawback spell-point bonuses.
- Builder can flag incompatible selections.
- Builder can export Markdown matching current tradition style.
- Future content authors can add a normal drawback, boon, or tradition with no code changes.

## Open Decisions

- Whether structured entries should get standalone public detail routes immediately or first render only inside the Casting Traditions page.
- Whether source tags embedded in old article bodies should be stripped during migration or preserved until source metadata is fully normalized.
- Whether tradition variants should be first-class `tradition` entries with `parentTradition`, or nested notes on the parent.
- Whether Foundry export should target a generic JSON shape first or a specific system/module schema.

