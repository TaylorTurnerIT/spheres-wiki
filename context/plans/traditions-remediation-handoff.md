# Implementation Handoff: Casting Traditions Remediation

You are implementing a specific remediation plan on an existing Astro 6 static wiki codebase for the Spheres tabletop RPG. Read this document fully before touching any code.

---

## Project context

**Stack:** Astro 6 SSG + TypeScript, Bun ≥ 1.1.0, Pagefind for client-side search, vanilla CSS (no framework). Deployed to GitHub Pages at base path `/spheres-wiki/`. All internal links must go through the `url()` helper from `src/lib/url.ts` — hardcoded `/...` paths break the base path.

**Build gate (run between every major step):**
```bash
bun run build    # validate → fallow-audit → astro check → astro build → pagefind → check-toc
bun run test     # Vitest unit tests
```
Both must exit 0 with zero errors/warnings/hints/Fallow findings before you commit anything.

**Fallow gate (run before any commit):**
```bash
bunx fallow audit --format json --quiet --explain --gate-marker agent
```
Verdict `fail` = do not commit. Fix findings first.

**Key files to orient yourself:**
- `SPEC.md` — invariants (V-numbers), tasks (T-numbers), bugs (B-numbers). Read §V, §T, §I.
- `AGENTS.md` — repo layout, content model, conventions.
- `DESIGN.md` §4 — "Entry Card" subsection — visual spec for the `EntryCard.astro` component you will build.
- `src/content.config.ts` — Zod schema for all entry types including `drawback`, `boon`, `tradition`.
- `src/lib/types.ts` — TypeScript types for `DrawbackEntry`, `BoonEntry`, `TraditionEntry`.
- `src/lib/inferFromPath.ts` — path → entry type inference including `resolveCastingTraditionEntry`.
- `src/lib/resolveEntries.ts` — builds `ResolvedMaps`; exports `drawbackMap`, `boonMap`, `traditionMap`.
- `src/lib/castingTraditions/rules.ts` — pure validation/calculation logic (currently test-only).
- `src/lib/castingTraditions/export.ts` — markdown/JSON export helpers.
- `src/lib/castingTraditions/types.ts` — `TraditionSelection`, `TraditionData`, `ResolvedTraditionState`, `TraditionDiagnostic`.
- `tests/lib/castingTraditions.test.ts` — 15 passing unit tests (inline fixtures only).
- `src/pages/power/casting-traditions/index.astro` — the casting-traditions page (currently just the prose tabs).
- `src/components/TagBadge.astro` — tag badge component; use this, never reimplement.
- `src/components/ClassFeatureBlock.astro` — contains inline `.talent-header` pattern (migration target for T111).
- `src/pages/[system]/[sphere]/index.astro` — sphere index (also contains inline talent-header markup, migration target for T111).
- `src/pages/search/index.astro` — search manifest; add `drawback`/`boon`/`tradition` rows here (R2).
- `src/styles/global.css` — CSS for `.talent-header`, `.talent-header-top`, `.talent-header-bottom`, `.talent-name`, `.talent-source`, `.talent-tag`, `.entry-description`, `.entry-card`.

---

## What already exists (do not re-derive or re-implement)

- **Schema** (`src/content.config.ts`): `drawback`, `boon`, `tradition` entry types with full Zod validation including `entryRefSchema`, `predicateSchema`, `ruleSchema`, `choiceSchema`. Correct — do not change.
- **Content** (`src/content/*/power/casting-traditions/`): 364 structured `.md` files (57 general drawbacks, 162 sphere drawbacks, 29 dual-sphere drawbacks, 21 boons, 95 traditions). All resolve into `ResolvedMaps` correctly. Entries do not contain inline `*Source:*` body lines (already stripped/avoided).
- **Resolver** (`src/lib/resolveEntries.ts`): `drawbackMap`, `boonMap`, `traditionMap` in `ResolvedMaps` — already populated.
- **Rule engine** (`src/lib/castingTraditions/rules.ts`): exports `buildTraditionState`, `calculateGeneralDrawbackValue`, `calculateAvailableBoonSlots`, `calculateUnspentDrawbackValue`, `bonusSpellPointFormula`, `getAllowedCastingAbilities`, `validateTradition`. Logic is correct for the basic path; has specific bugs listed below.
- **Export helpers** (`src/lib/castingTraditions/export.ts`): `exportTraditionMarkdown`, `exportTraditionJson`.
- **Tests** (`tests/lib/castingTraditions.test.ts`): 15 passing tests. Extend; do not delete.

---

## Work — execute in this order

### Step 1 — R1: Fix the rule engine (pure logic, no UI)

Four specific bugs in `src/lib/castingTraditions/rules.ts`:

**B19 — `getAllowedCastingAbilities` ignores `tradition.cam` and drawback/tradition rules.**
Currently starts from `{int,wis,cha}` and only applies boon `rules`. Must also:
- When a `TraditionEntry` is in scope (`state.tradition`), apply its `cam` field: `mode: "fixed"` → replace allowed set entirely with `cam.abilities`; `mode: "highest"` → union allowed with `cam.abilities`; `mode: "choose-one"` → union.
- Scan drawback entries in `state.drawbacks` + `state.sphereDrawbacks` for `set-cam`/`allow-cam` rules and apply them (same logic as boons, same `applyCamRule` helper).
- Scan `state.tradition.rules` (if present) for `set-cam`/`allow-cam` and apply.

**B20 — No preset-tradition hydrator.**
Add exported function to `rules.ts`:
```typescript
export function selectionFromTradition(
  entry: TraditionEntry,
  data: TraditionData,
): TraditionSelection
```
Returns a `TraditionSelection` with `traditionId`, `drawbacks`, `sphereDrawbacks`, `boons`, and `choices` (from `entry.choiceSelections`) pre-populated from the tradition entry. Callers can then pass directly to `validateTradition` or `buildTraditionState`.

**B21 — `selectedChoiceDrawbackValue` leaks boon/sphere-drawback choice values into boon currency.**
`calculateGeneralDrawbackValue` calls `selectedChoiceDrawbackValue` which sums `addsDrawbackValue` across ALL choices from ALL selected entries. Fix: only sum `addsDrawbackValue` from choices belonging to entries where `drawbackKind === "general"`. Choices on boons or sphere drawbacks must not fund boon slots.

**B22 — CAM rule `mode` is never read.**
`applyCamRule` unconditionally adds an ability when `op === "allow-cam"` regardless of `mode`. The `mode` field (`"if-higher-than-base"` | `"always"`) must be surfaced. Minimum fix: return an annotated structure from `getAllowedCastingAbilities` that includes the mode for each ability, so the UI/validator can distinguish unconditional allows from conditional ones. Shape suggestion:
```typescript
export type AllowedCam = { ability: AbilityScore; mode: "always" | "if-higher-than-base" | "fixed" };
export function getAllowedCastingAbilities(state: ResolvedTraditionState): AllowedCam[]
```
Update `validateTradition` to use this — a `cam` selection is valid if the ability appears in the list (regardless of mode, since "if-higher" is a runtime check the player performs).

**Also fix `export.ts` — "None" suppression bug:**
In `exportTraditionMarkdown`, when boons is empty but a spell-point bonus exists, the output is `**Boons:** None; +1 per…`. Fix: when `boonText === "None"` and `spellPointBoon` is truthy, use `spellPointBoon` alone (not `"None; +1 per…"`).

**Tests to add in `tests/lib/castingTraditions.test.ts`:**
- Fixed-CAM test: `selectionFromTradition(bloodMagicEntry, data)` → `getAllowedCastingAbilities` returns only `con`; `validateTradition` for `cam:"int"` returns `invalid-cam` error; for `cam:"con"` returns no errors.
- Highest-CAM test: `selectionFromTradition(demonologyEntry, data)` → allowed set is `{cha, con}`; `int`/`wis` rejected.
- Choice-value scope test: boon with a choice carrying `addsDrawbackValue` does NOT increase `calculateAvailableBoonSlots`. (This is a regression guard for B21.)
- CAM mode test: `getAllowedCastingAbilities` with Fortified Casting returns `con` annotated `if-higher-than-base`, not `always`.
- **Integration test (required, satisfies V67):** one `describe` block loads real resolved maps via `await resolveEntries()`, constructs `TraditionData` from `drawbackMap`/`boonMap`/`traditionMap`, calls `selectionFromTradition` on Blood Magic and Demonology entries, validates both — zero unexpected diagnostics.

After this step: `bun run test` must pass. `bun run build` must pass.

---

### Step 2 — T110: Create `EntryCard.astro`

Create `src/components/EntryCard.astro`. This is the canonical rendering primitive for every named game entry (SPEC V70, V71). Follow DESIGN.md §4 "Entry Card" subsection exactly.

**Props:**
```typescript
interface Props {
  name: string;
  sourceBookTitle?: string | null;
  tagIds?: string[];
  Content?: any;                          // rendered Astro content component
  href?: string;                          // if set, name renders as <a>
  metadata?: Record<string, string>;      // key-value pairs, rendered between header and body
  id?: string;                            // for anchor links
  tagMap: Map<string, TagEntry>;
  bookMetaMap: Map<string, BookMeta>;
}
```

**DOM structure (use existing CSS classes — no new classes needed in global.css):**
```
<div class="entry-card-block" id={id}>
  <div class="talent-header">
    <div class="talent-header-top">
      <!-- if href: <a href={href} class="talent-name"> else <span class="talent-name"> -->
      {name}
      {sourceBookTitle && <span class="talent-source">{sourceBookTitle}</span>}
    </div>
    <div class="talent-header-bottom">
      {tagIds?.map(tagId => <TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />)}
    </div>
  </div>
  {metadata && Object.keys(metadata).length > 0 && (
    <dl class="entry-card-meta">
      {Object.entries(metadata).map(([k, v]) => <><dt>{k}</dt><dd>{v}</dd></>)}
    </dl>
  )}
  {Content && <div class="entry-description"><Content /></div>}
</div>
```

Add minimal CSS scoped to the component for `.entry-card-block` (the left border, padding, hover) and `.entry-card-meta` (compact `dl` row, `--fs-xs`, `--clr-muted`). Do not alter `global.css` — use existing `.talent-header*`, `.talent-name`, `.talent-source`, `.entry-description` classes from there.

After this step: `bun run build` must pass.

---

### Step 3 — T111: Replace inline talent-header markup with `EntryCard`

Two files contain inline `.talent-header` reimplementations that are now migration targets. Replace them with `EntryCard`. Visual parity required — spot-check sphere pages and class pages before moving on.

**`src/pages/[system]/[sphere]/index.astro`** — base-ability blocks (around line 188–210 in the `base-ability-block` section). Replace the inline `<div class="base-ability-header">…` structure with `<EntryCard name={t.name} sourceBookTitle={tBook?.title} tagIds={buildOrderedTagIds(…)} Content={tContent?.Content} href={url(…)} id={t.id} tagMap={tagMap} bookMetaMap={bookMetaMap} />`.

**`src/components/ClassFeatureBlock.astro`** — class-trait blocks (lines 73–94, the `<div class="class-trait">` loop). Replace with `<EntryCard>` per trait, passing `name`, `sourceBookTitle`, `tagIds` (via `buildOrderedTagIds`), `Content`, `id`, and `metadata={{ Prerequisites: trait.requires }}` when `trait.requires` is set.

After this step: `bun run build` must pass. Spot-check: `/power/alteration/` (talents/base abilities) and `/power/classes/shifter/` (class traits) should look visually unchanged.

---

### Step 4 — T108/R2: Surface structured entries on the casting-traditions page

**Render structured entries inside the existing tabs.** The casting-traditions page at `src/pages/power/casting-traditions/index.astro` renders six article-tab prose files via `TabbedContent`. Add structured listing sections *below* (or replacing if prose is duplicated) the existing prose in the General Drawbacks, Sphere Drawbacks, and Boons tabs using `EntryCard`, sourced from the resolved maps.

**Data sourcing:**
```typescript
const { drawbackMap, boonMap, traditionMap, bookMetaMap, tagMap } = await resolveEntries();
const generalDrawbacks = [...drawbackMap.values()].filter(d => d.drawbackKind === 'general' && d.system === 'power').sort((a,b) => a.name.localeCompare(b.name));
const sphereDrawbacks  = [...drawbackMap.values()].filter(d => d.drawbackKind === 'sphere'   && d.system === 'power').sort((a,b) => a.name.localeCompare(b.name));
const dualDrawbacks    = [...drawbackMap.values()].filter(d => d.drawbackKind === 'dual-sphere' && d.system === 'power').sort((a,b) => a.name.localeCompare(b.name));
const boons            = [...boonMap.values()].filter(b => b.system === 'power').sort((a,b) => a.name.localeCompare(b.name));
const traditions       = [...traditionMap.values()].filter(t => t.system === 'power').sort((a,b) => a.name.localeCompare(b.name));
```

**EntryCard `metadata` per type:**
- General drawback: `{ "Drawback Value": String(d.drawbackValue), ...(d.buyoff ? { Buyoff: d.buyoff } : {}), ...(d.repeat?.max && d.repeat.max > 1 ? { "Max Repeat": String(d.repeat.max) } : {}) }`
- Sphere drawback: `{ Sphere: d.sphere ?? "", "Drawback Value": String(d.drawbackValue), ...(d.buyoff ? { Buyoff: d.buyoff } : {}) }`
- Dual-sphere drawback: `{ Spheres: (d.spheres ?? []).join(", "), "Drawback Value": String(d.drawbackValue) }`
- Boon: `{ "Boon Cost": `${b.boonCost} slot${b.boonCost !== 1 ? "s" : ""}` }`
- Tradition: `{ "Magic Type": t.magicType ?? "custom", CAM: t.cam.mode === "fixed" ? t.cam.abilities.map(a => a.toUpperCase()).join("/") : `Choose one: ${t.cam.abilities.map(a => a.toUpperCase()).join("/")}` }`

Source book title: `bookMetaMap.get(entry.sourceBook)?.title ?? entry.sourceBook`.

Each entry must have a stable `id` attribute (use `entry.id`) so it can be anchor-linked from search results.

**Prose/structured duplication:** The existing prose tabs may repeat the same rule text as structured entries. For the General Drawbacks and Boons tabs, prefer rendering structured entries as the primary content and keeping only the intro paragraph(s) of the prose. Do NOT silently run both. Record the decision in `context/kits/cavekit-traditions-full-plan.md` under "Open Decisions".

**Search manifest (`src/pages/search/index.astro`):**

Add after the existing `classTraitMap` entries:
```typescript
const { drawbackMap, boonMap, traditionMap } = await resolveEntries(); // extend existing destructure
for (const d of drawbackMap.values()) {
  if (d.system !== 'power') continue;  // only power for now; expand when other systems have traditions
  manifest.push({ url: url(`/power/casting-traditions/#${d.id}`), title: d.name, system: SYSTEMS['power'].label, type: 'drawback' });
}
for (const b of boonMap.values()) {
  if (b.system !== 'power') continue;
  manifest.push({ url: url(`/power/casting-traditions/#${b.id}`), title: b.name, system: SYSTEMS['power'].label, type: 'boon' });
}
for (const t of traditionMap.values()) {
  if (t.system !== 'power') continue;
  manifest.push({ url: url(`/power/casting-traditions/#${t.id}`), title: t.name, system: SYSTEMS['power'].label, type: 'tradition' });
}
```

Add to `TYPE_LABELS` and `TYPE_ORDER`:
```typescript
const TYPE_LABELS = { ..., drawback: 'Drawback', boon: 'Boon', tradition: 'Tradition' };
const TYPE_ORDER  = ['sphere','talent','feat','class','archetype','class-trait','drawback','boon','tradition'];
```

After this step: `bun run build` must pass. Verify at least one drawback, one boon, and one tradition appear in search results when querying a known name.

---

### Step 5 — R3: Casting Tradition Builder UI

Add a "Builder" tab to `/power/casting-traditions/` using the `TabbedContent` custom-slot support. The builder is a client-side interactive component wired on `astro:page-load` (SPEC V25). Vanilla TypeScript — no framework unless you cannot avoid it.

**Data hydration pattern:**
Serialize compact JSON from the resolved maps at build time. At runtime the builder script reads this to populate the selection UI. Approximate pattern:
```astro
---
// in index.astro frontmatter
const builderData = JSON.stringify({
  drawbacks: [...drawbackMap.values()].filter(d => d.system === 'power').map(d => ({ id: d.id, name: d.name, drawbackKind: d.drawbackKind, drawbackValue: d.drawbackValue, sphere: d.sphere, spheres: d.spheres, choices: d.choices, requires: d.requires, incompatible: d.incompatible, rules: d.rules, buyoff: d.buyoff })),
  boons:     [...boonMap.values()].filter(b => b.system === 'power').map(b => ({ id: b.id, name: b.name, boonCost: b.boonCost, choices: b.choices, requires: b.requires, rules: b.rules })),
  traditions:[...traditionMap.values()].filter(t => t.system === 'power').map(t => ({ id: t.id, name: t.name, traditionKind: t.traditionKind, magicType: t.magicType, cam: t.cam, drawbacks: t.drawbacks, sphereDrawbacks: t.sphereDrawbacks, boons: t.boons, choices: t.choices, choiceSelections: t.choiceSelections })),
});
---
<script define:vars={{ builderData }}>
window.__traditionBuilderData = JSON.parse(builderData);
</script>
```

**UI controls (from DESIGN.md §4 visual tokens):**
- Tradition name: `<input type="text">` styled to match `.search-bar` height/radius.
- Magic type: segmented control or `<select>` using TomSelect. Options: arcane, divine, psychic, other, none, custom.
- CAM: segmented control. Enabled options driven by `getAllowedCastingAbilities(state)`. Disabled options show tooltip explaining why.
- General drawbacks: searchable list with checkboxes. Grouped by source book. Incompatible selections grayed with reason tooltip.
- Sphere drawbacks: list grouped by sphere name.
- Boons: panel. Entries disabled when cost exceeds remaining currency; disabled state shows "requires N more drawback value".
- Summary rail: live boon currency counter, bonus spell points formula, diagnostic list. Each selected item rendered via `EntryCard` (pass `asCard` or a compact mode — do not build a separate card component).
- Export panel: two tabs — Markdown (textarea, copy button) and JSON (textarea, copy button). Calls `exportTraditionMarkdown` and `exportTraditionJson` from `src/lib/castingTraditions/export.ts`.
- "Start from tradition" dropdown: loads a standard/custom tradition via `selectionFromTradition`, populates all controls.

**State management:**
- Single `TraditionSelection` object in memory.
- URL search params (`?name=…&cam=…&drawbacks=…&boons=…&choices=…`) for shareability — encode/decode on load.
- No `localStorage` unless `/privacy/` is updated to document it (prefer URL-only for now).
- Bind all event listeners inside `document.addEventListener('astro:page-load', () => { … })`.

**Export "None" fix (in `src/lib/castingTraditions/export.ts`):**
```typescript
// current (buggy):
lines.push(`**Boons:** ${[boonText, spellPointBoon].filter(Boolean).join("; ")}`);

// fix:
const boonDisplay = state.boons.length > 0 ? boonText : null;
lines.push(`**Boons:** ${[boonDisplay, spellPointBoon].filter(Boolean).join("; ") || "None"}`);
```

**Integration check (satisfies V66):** after wiring the builder, run:
```bash
bunx fallow dead-code --trace src/lib/castingTraditions/rules.ts:buildTraditionState
bunx fallow dead-code --trace src/lib/castingTraditions/rules.ts:validateTradition
bunx fallow dead-code --trace src/lib/castingTraditions/export.ts:exportTraditionMarkdown
```
Each must report a non-test caller. If any still shows only `tests/` as caller, you missed wiring that function.

After this step: `bun run build` must pass. Manually verify the Builder tab is reachable by navigating to `/power/casting-traditions/` and clicking the Builder tab.

---

### Step 6 — R4: Close the loop

1. **`bun run test`** — all tests green including the new integration test from Step 1.
2. **`bun run build`** — exits 0, zero actionable diagnostics.
3. **`bunx fallow audit --format json --quiet --explain --gate-marker agent`** — verdict `pass`.
4. **SPEC §T reconciliation** — update `SPEC.md`:
   - T107 → `x` (builder complete)
   - T108 → `x` (entries surfaced)
   - T109 → `x` (rule engine fixed)
   - T110 → `x` (EntryCard created)
   - T111 → `x` (inline markup replaced)
5. **`context/kits/cavekit-traditions-full-plan.md`** — update "Current State" section and resolve the Open Decision about standalone vs in-page rendering.
6. **`context/kits/cavekit-traditions-remediation.md`** — mark all acceptance criteria checked.

---

## Hard constraints (do not violate)

- Every internal `<a href>` must use `url()` from `src/lib/url.ts` — no hardcoded `/power/…` paths (SPEC V1, C2).
- No `system:` field in entry `.md` frontmatter — derived from path (SPEC V26, C11).
- No `*Source: Book*` lines in rendered body text — source is shown via `sourceBookTitle` prop on `EntryCard` (SPEC §I.class-family).
- No `localStorage` write without documenting the key on `/privacy/` (SPEC V14).
- All interactive JS binds on `document.addEventListener('astro:page-load', …)` — not `DOMContentLoaded` (SPEC V25).
- `bun run build` must pass between every step. Never proceed past a broken build.
- `TagBadge` is the only tag display component — never reimplement badge/tooltip logic inline (SPEC V51).
- `EntryCard.astro` is the only entry-card layout — never inline `.talent-header` for a new entry type (SPEC V70, V71).
- No new external CDN requests, analytics, or remote fonts (SPEC V11, V12).

## What is out of scope

- FoundryVTT-specific JSON beyond a generic structured shape.
- Server-side persistence (URL state only, no backend).
- Non-Power systems (Might/Guile/Champions have no casting traditions content yet).
- Re-designing the schema/data model — it is correct as-is.
- Changing the existing prose article tabs (keep them; resolve duplication, but don't delete unique content).
