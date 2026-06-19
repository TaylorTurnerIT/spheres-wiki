---
name: traditions-remediation
description: Fix-on-kit for Casting Traditions — corrects the "built but not wired" failure: surfaces the structured data, fixes the rule engine, and ships the Builder UI. Supersedes the integration-blind acceptance criteria in traditions-builder/schema.
metadata:
  type: plan
  created: 2026-06-18
  last_edited: 2026-06-18
  status: complete
---

# Cavekit: Casting Traditions Remediation

Completion note (2026-06-18): R1–R4 shipped. The rule engine honors tradition CAM and CAM rules, structured casting-tradition entries render on `/power/casting-traditions/` via `EntryCard.astro`, search includes drawback/boon/tradition rows, the Builder tab is live, and `bun run test` / `bun run build` pass.

## Why this kit exists

The traditions overhaul (kits: overview, tabs, schema, builder, full-plan) shipped a correct schema and a fully unit-tested logic engine, then stopped one step short of a working feature. Review found the whole data + logic layer reaches **zero users**:

- `src/lib/castingTraditions/{rules,export,types}.ts` is imported **only by `tests/`**. No page, layout, or component uses it.
- 364 structured `drawback`/`boon`/`tradition` entries resolve into `ResolvedMaps` but render on **no route** and are **absent from the search manifest** (`search/index.astro`). They are invisible, and they duplicate the prose article tabs that still render.
- The rule engine is wrong on the preset-tradition path that the builder depends on (B19–B22).
- SPEC §T was never reconciled: T106 was done but still `.`; T107 was partial but still `.`.

Recorded as SPEC B18–B22, invariants V65–V69, tasks T107 (~), T108, T109.

## Root cause (the kit-level defect)

Every acceptance criterion in `cavekit-traditions-builder.md` and `cavekit-traditions-schema.md` was **isolation-testable**: "schema is valid", "logic can validate X", "export produces Y". None required a user-facing surface, a real-content test, or that declared schema fields actually be read. A feature can satisfy all of them and still be invisible and partly broken — which is what happened.

**Correction applied to this kit:** every requirement below carries at least one *integration* criterion — reachable route, search presence, or real-`ResolvedMaps` test — in addition to logic criteria. This kit's criteria supersede the builder/schema kits where they conflict. The schema kit (Phase 2) remains accurate for the data model; only its "done" definition was incomplete.

## Dependency order

```
R1 Rule-engine fixes  (correctness — unblocks everything)
        │
        ▼
R2 Surface structured entries  (routes + search; makes data reachable)
        │
        ▼
R3 Builder UI  (consumes R1 logic + R2 data)
        │
        ▼
R4 Integration test + SPEC/kit reconciliation  (close the loop)
```

R1 and R2 are independent and may run in parallel; R3 needs both; R4 is last.

---

## R1: Fix the tradition rule engine

**Goal:** make `src/lib/castingTraditions/rules.ts` correct on the preset-tradition path and stop ignoring declared rule fields. Pure logic only — no UI.

**Defects to fix (SPEC B19–B22):**

- B19 — `getAllowedCastingAbilities` reads only boon `rules`. It must also fold in `tradition.cam` (when a tradition is loaded) and `set-cam`/`allow-cam` rules from drawbacks and the tradition itself.
- B20 — no hydrator. Add `selectionFromTradition(entry, data): TraditionSelection` that expands a `TraditionEntry`'s own `drawbacks`/`sphereDrawbacks`/`boons`/`choiceSelections` into a selection so a preset can be validated/loaded in one call.
- B21 — `selectedChoiceDrawbackValue` adds `addsDrawbackValue` from *any* selected choice into general boon currency. Scope it to choices whose owning entry is a `general` drawback.
- B22 — CAM rule `mode` (`if-higher-than-base` | `always` | `fixed` | `highest`) is never read in `applyCamRule`. Surface the constraint so a downstream consumer can render/enforce "Con only if higher than base CAM" rather than an unconditional allow.

**Acceptance criteria:**
- [x] `selectionFromTradition(blood-magic, data)` then `validateTradition(...)` returns no `invalid-cam` error for `cam: "con"` and **does** flag `int`/`wis`/`cha` as invalid (fixed-CAM honored).
- [x] Same path for `demonology` (`cam.mode: highest, [cha,con]`): `cha` and `con` allowed, `int`/`wis` rejected.
- [x] `getAllowedCastingAbilities` reflects `set-cam`/`allow-cam` rules declared on drawbacks and on the tradition, not only on boons.
- [x] A boon/sphere-drawback choice carrying `addsDrawbackValue` does **not** increase available boon slots; only general-drawback choices do. Regression test added.
- [x] CAM rule `mode` is exposed in the engine output (e.g. allowed abilities annotated with their gating mode), with a test asserting `if-higher-than-base` is distinguishable from `always`.
- [x] **Integration:** at least one test in `tests/lib/castingTraditions.test.ts` builds `TraditionData` from the **real resolved maps** (`resolveEntries()` → `drawbackMap`/`boonMap`/`traditionMap`), not only inline fixtures, and validates Blood Magic and Demonology through `selectionFromTradition`. (Satisfies V67.)
- [x] `fallow dead-code --trace src/lib/castingTraditions/rules.ts:selectionFromTradition` shows a non-test caller once R3 lands (tracked, not required until R3).

---

## R2: Surface structured entries (routes + search)

**Goal:** make the 364 structured entries reachable and searchable using the existing entry-card rendering primitive — maintaining visual consistency with talents, feats, and class traits while ending the invisible-duplicate state.

**Rendering approach — use `EntryCard.astro` (SPEC V70, V71, T110):**
Drawbacks, boons, and traditions must render using the **same** `.talent-header` / `.talent-header-top` / `.talent-header-bottom` + `.entry-description` component that talents and class traits use. Do not invent new card styles. Type-specific data surfaces through the `metadata` prop (key-value row between header and body):

| Entry type | `metadata` contents |
|------------|---------------------|
| `drawback` (general) | Drawback Value, Buyoff, Repeat (if > 1) |
| `drawback` (sphere) | Sphere, Drawback Value, Buyoff |
| `drawback` (dual-sphere) | Spheres, Drawback Value, Buyoff |
| `boon` | Boon Cost |
| `tradition` | Magic Type, CAM |

Tags from `buildOrderedTagIds()` render via `TagBadge` in the header-bottom row — no separate tag logic. Source attribution from `sourceBook` → `bookMetaMap` → `title` passes as `sourceBookTitle` — never inline `*Source:*` in body.

**Decision to resolve first (from full-plan Open Decisions):** standalone detail routes vs render-inside-the-traditions-page. Default recommendation: render structured **listing sections** inside the existing tabs (Drawbacks / Boons / Standard / Custom) sourced from the resolved maps, each entry with a stable anchor id; promote to standalone detail routes only if search/linking needs it. Whatever is chosen, record in `cavekit-traditions-full-plan.md` Open Decisions.

**Acceptance criteria:**
- [x] `EntryCard.astro` (T110) exists and is used — not inline `.talent-header` markup. (Satisfies V71.)
- [x] `drawback`, `boon`, and `tradition` entries render on at least one real route (listing section or detail page), reachable by a link a user can click. No entry resolves into `ResolvedMaps` while rendering nowhere. (Satisfies V65.)
- [x] Drawback metadata row shows drawback value, kind, and buyoff; boon metadata shows cost; tradition metadata shows magic type and CAM summary. Source shown via `sourceBookTitle` prop — no inline `*Source:*`.
- [x] `search/index.astro` manifest includes `drawback`, `boon`, `tradition` rows with correct `url`, `title`, `system`, `type`; `TYPE_LABELS`/`TYPE_ORDER` updated; type filter offers them. (Satisfies V7.)
- [x] Rendered entries are within Pagefind indexing scope (`WikiPage.astro`/`ArticlePage.astro`), confirmed by a built-index spot check.
- [x] Visual spot-check: a drawback card and a talent card on the same page look structurally identical — same name weight, same source label position, same tag badge row — differing only in metadata row content.
- [x] If prose tabs and structured sections now overlap, the duplication is resolved or explicitly justified in the full-plan (do not silently ship two copies of the same rule text).
- [x] All internal links use `url()` (V1/C2). `bun run build` TOC audit and check-toc pass for any new headings.

---

## R3: Build the Casting Tradition Builder UI

**Goal:** deliver the interactive component the original `cavekit-traditions-builder.md` R1–R3 described, wired into the page and consuming R1 logic + R2 data. Vanilla TypeScript unless complexity proves otherwise (full-plan UI Plan). The builder's selected-entry summary panel must reuse `EntryCard.astro` (T110/R2) for consistency — not a bespoke builder card design.

**Acceptance criteria (logic surface):**
- [x] New "Builder" tab in `/power/casting-traditions/` via `TabbedContent` custom-slot support.
- [x] Controls: tradition name input, magic-type control, CAM control with dynamic enabled states from `getAllowedCastingAbilities`, general-drawback multi-select, sphere-drawback grouped select, boons panel gated by available currency, selected-summary rail with live diagnostics, export panel (Markdown + JSON).
- [x] Live recalculation of boon currency, unspent drawback value, and bonus spell points on every change.
- [x] Disabled choices state *why*; incompatibilities show both sides; required choices are inline (not deferred to final validation).
- [x] "Start from a standard tradition" loads a preset via `selectionFromTradition` (R1) and is editable.
- [x] Export Markdown matches existing wiki tradition style; export JSON is structured. Empty-boons + spell-point-bonus line no longer renders `**Boons:** None; …` (fix `export.ts` "None" suppression).
- [x] Builder hydrates compact JSON from resolved maps; binds on `astro:page-load` (V25); shareable URL state; no `localStorage` unless documented on `/privacy/` (V14).

**Acceptance criteria (integration — the part the old kit missed):**
- [x] A production page imports `src/lib/castingTraditions/`; `fallow dead-code` shows non-test callers for `buildTraditionState`, `validateTradition`, `exportTraditionMarkdown`, `exportTraditionJson`. (Satisfies V66.)
- [x] Builder reachable by navigating the live site (verified, not just built).

---

## R4: Close the loop — tests, audit, SPEC/kit reconciliation

**Acceptance criteria:**
- [x] `bun run test`, `bun run validate`, `bun run build` all green (V34); Fallow clean (V63).
- [x] SPEC §T updated in the same change: T107 → `x` when R3 ships; T108 → `x` when R2 ships; T109 → `x` when R1 ships. Partial states stay `~`, never `x` (V69).
- [x] `cavekit-traditions-full-plan.md` "Current State" and "Open Decisions" updated to reflect surfaced entries and the rendered-vs-prose decision.
- [x] This kit's status set to complete; overview kit's coverage summary updated.

---

## Out of scope

- Server-side persistence of user-built traditions (URL/localStorage only).
- FoundryVTT-specific JSON schema beyond a generic structured shape (full-plan Open Decision).
- Re-deriving the schema/data model — Phase 2 (`cavekit-traditions-schema.md`) data is correct; this kit consumes it.
- Non-Power tradition systems.

## Cross-references

- Supersedes the "done" definition in: cavekit-traditions-builder.md, cavekit-traditions-schema.md (R2 criteria).
- See also: cavekit-traditions-overview.md, cavekit-traditions-full-plan.md, cavekit-traditions-tabs.md, cavekit-traditions-source-map.md.
- SPEC: invariants V65–V71; bugs B18–B22; tasks T107, T108, T109, T110, T111.
- DESIGN.md §4 → "Entry Card — canonical named-entry primitive (`EntryCard.astro`)" for visual spec.
- Pattern note: `docs/lessons-learned.md` → "Integration Before 'Done' (built-but-not-wired)".
