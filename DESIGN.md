---
created: 2026-06-15T00:00:00Z
last_edited: 2026-06-15T00:00:00Z
source: extracted from src/styles/global.css (brownfield codify)
---

# DESIGN.md — Spheres Wiki

> Authoritative visual spec for the Spheres tabletop RPG wiki (Power / Might / Guile / Champions).
> Extracted from the existing, mature design system in `src/styles/global.css`. Token names below
> are the **real** CSS custom properties in use — reference them, do not invent parallel names.

---

## 1. Visual Theme & Atmosphere

A warm, parchment-bound reference tome. Think: a well-worn rulebook on aged paper under candlelight —
serif throughout, restrained ornament, dense but legible. This is a reference work first; every element
serves wayfinding and reading, not spectacle. Decoration is limited to sphere iconography and the
four-orb logo flourish.

The defining mechanic is **per-system recoloring**: the page background and chrome stay neutral
parchment, while one accent color (`--clr-active` / `--clr-ns`) floods the active game system's pages —
crimson for the brand/home, blue for Power, rust for Might, purple for Guile, green for Champions.
A reader always knows which system they're in by color alone.

**Key attributes:** Warm, editorial, scholarly, dense-but-readable, restrained
**Density:** Medium-high — compact cards, tight metadata, information-rich pages
**Personality:** Annotated grimoire, not flashy storefront
**Color strategy:** Neutral canvas + single per-system accent that swaps site-wide

---

## 2. Color Palette & Roles

### Surface (neutral canvas)
| Token | Hex | Role |
|-------|-----|------|
| `--clr-bg` | #e3ddd6 | Page background; recessed surfaces (cards, tabs at rest, banners) |
| `--clr-surface` | #ede8df | Raised surfaces — content area, sidebar, dropdowns, active tab |
| `--clr-border` | #c0b9b0 | Hairline borders, dividers, rules |

### Text
| Token | Hex | Role |
|-------|-----|------|
| `--clr-text` | #1c1c1c | Primary body text, headings on neutral |
| `--clr-muted` | #6b5f58 | Secondary text, captions, metadata, source labels, section eyebrows |

### Brand & Action
| Token | Hex | Role |
|-------|-----|------|
| `--clr-brand` | #990000 | Crimson brand anchor — logo, home nav links, focus rings, default `--clr-active` |
| `--clr-cta` | #2c8738 | Green call-to-action (shop/buy buttons); hover `#237030` |

### System Accents (the swap set)
| Token | Hex | System | Notes |
|-------|-----|--------|-------|
| `--clr-power` | #174b93 | Spheres of Power | Blue |
| `--clr-might` | #8f2d00 | Spheres of Might | Rust |
| `--clr-guile` | #5a2d96 | Spheres of Guile | Purple |
| `--clr-champ` | #165a1c | Champions of the Spheres | Green |

**Active-color mechanism:**
- `--clr-active` — the current page's dominant accent. Defaults to `--clr-brand`; overridden per page by `[data-system="power|might|guile|champions"]`.
- `--clr-ns` — namespace color for inline/repeated accent (set by `.power/.might/.guile/.champ` classes and the same `[data-system]` attributes).
- Drive all per-system color through these two vars; never hardcode a system hex in a component.

### Tag Semantic Buckets (≤5 hues)
| Token | Value | Role |
|-------|-------|------|
| `--clr-tag-tier-base` | `color-mix(in srgb, var(--clr-ns) 55%, #000 45%)` | Base Ability tag (dark system tint) |
| `--clr-tag-tier-basic` | `var(--clr-ns)` | Basic talent tag (system color) |
| `--clr-tag-tier-adv` | `color-mix(in srgb, var(--clr-ns) 60%, #152 40%)` | Advanced talent tag (muted system) |
| `--clr-tag-prov` | #474540 | Provenance — 3PP content (warm gray) |
| `--clr-tag-rules` | #8c1d40 | PF1e rules descriptor — Ex / Su / Sp (crimson) |

### Dark Mode
**Not implemented.** No dark theme exists. If added later, every Surface, Text, Brand, and System
Accent token above needs a mapped dark equivalent, plus contrast re-check on the `color-mix` tag buckets.

---

## 3. Typography Rules

### Font Stack
- **Display / Heading:** `--font-display` → `"Cinzel", serif` (self-hosted via @fontsource)
- **Body:** `--font-body` → `"Crimson Text", serif` (self-hosted via @fontsource)
- **Code:** none defined — no monospace surface in current UI

Cinzel (engraved Roman caps) carries all headings, names, labels, and badges. Crimson Text carries
prose, nav, and descriptions. Both serif — there is no sans in the system.

### Type Scale
All `font-size: inherit` is reset on `h1`–`h6`; size comes from the class, not the tag.

| Token | Size | Typical Weight | Line Height | Letter Spacing | Font | Usage |
|-------|------|----------------|-------------|----------------|------|-------|
| `--fs-xl` | 1.3rem (~20px) | 700 | 1.2 | 0.02em | Display | Site title, page title, prose `h1` |
| `--fs-lg` | 1.125rem (18px) | 700 | 1.2 | 0.02em | Display | Prose `h2` |
| `--fs-body` | clamp(1rem→1.125rem) fluid | 400 | 1.5 (prose 1.6) | 0 | Body | Body prose, entry descriptions |
| `--fs-md` | clamp(0.9375rem→1rem) fluid | 400 / 600–700 | 1.55 | 0 | Body / Display | Talent body, nav, class names, prose `h3` |
| `--fs-base` | 0.875rem (14px) | 600 | 1.0–1.2 | 0 | Body | Compact nav links, sphere lists, prose `h4` |
| `--fs-sm` | 0.8125rem (13px) | 600–700 | 1.4 | 0 | varies | Sidebar links, tabs, search results |
| `--fs-xs` | 0.75rem (12px) | 400–700 | 1.4 | 0–0.06em | varies | Metadata, callouts, breadcrumb, TOC body |
| `--fs-2xs` | 0.75rem (12px) | 700 | — | 0.03–0.07em | Display | Small labels, card names, eyebrows |
| `--fs-3xs` | 0.75rem (12px) | 700 | — | 0.03–0.08em | Display | Micro caps — source labels, tags, group labels |

> Note: `--fs-2xs`/`--fs-3xs` collapsed to 12px (were 11px/10px) for legibility; kept as distinct tokens for intent.

### Principles
- **Uppercase display eyebrows:** section/group/sidebar labels are Cinzel, 700, `text-transform: uppercase`, letter-spacing 0.05–0.1em, color `--clr-muted`.
- **Names take the accent:** entry/talent/card names render in `--clr-ns` (or `--clr-active`); brand-context names in `--clr-brand`.
- Body line-height 1.5; long-form prose 1.6; talent bodies 1.55.
- Links inherit color by default; prose links use `--clr-active` with a `--clr-border` underline that darkens to `--clr-active` on hover.

---

## 4. Component Stylings

Interaction states below are as implemented. Focus is global: `:focus-visible { outline: 2px solid var(--clr-brand); outline-offset: 2px }`.

### Buttons
**Shop / CTA (`.shop-btn`)** — primary action
- Background `--clr-cta` (#2c8738) [store-card variant uses `--clr-champ`]; text #fff; Body 600, `--fs-2xs`/`--fs-3xs`
- Padding 4px 8px; radius 3px (12px pill in store-card context)
- Hover: background `#237030`, `translateY(-1px)`
- Transition: `background .15s ease, transform .12s ease`

**Outline (`.ref-card-btn`)** — secondary, system-tinted
- Transparent bg; border `0.5px solid var(--clr-ns)`; text `--clr-ns`; Display 700 uppercase `--fs-3xs`, letter-spacing 0.06em
- Padding 6px 14px; radius 3px
- Hover: background `--clr-ns`, text `--clr-bg`

**Ghost (`.toggle-all-btn`)** — tertiary
- Transparent; border `1px solid --clr-border`; text `--clr-muted`; `--fs-xs`
- Hover: text + border → `--clr-brand`

**Icon round (`.carousel-btn`, `.a11y-trigger`, `.search-icon-btn`)**
- 32×32, circular (carousel/a11y) or square; transparent or `--clr-bg`
- Hover: fill `--clr-brand`, text #fff (carousel) / tinted `color-mix(--clr-brand 6-8%)` (a11y, search)
- `.search-icon-btn:active`: `scale(0.85)`

### Cards (shared idiom)
Base: background `--clr-bg`, border `0.5px solid --clr-border`, radius `--radius` (4px), accent stripe = top or left border in `--clr-ns`.

- **Intro card** (`.intro-card`): top border `2.5px solid --clr-ns`; hover `box-shadow: 0 3px 12px rgba(0,0,0,.1)` + `translateY(-2px)`.
- **Ref card** (`.ref-card`): top border `3px`; system-tinted title + outline button.
- **Entry card** (`.entry-card`): left border `3px solid --clr-ns`, radius 6px; hover bg `color-mix(--clr-ns 4%, --clr-surface)`.
- **Resource card** (`.resource-card`): flat, radius 4px; hover bg `--clr-surface`, border `--clr-active`, `translateY(-1px)`.
- **Store card** (`.store-card`): radius 4px, cover aspect 17/22; hover `translateY(-4px)` + `box-shadow: 0 12px 24px -8px rgba(0,0,0,.2)`, border `--clr-brand`.
- **Talent entry / base-ability block**: border `1px solid --clr-border` + left `3px solid --clr-active`; raises `z-index:10` on hover/focus-within (for tag tooltips).

### Inputs
**Search bar (`.search-bar`)**
- Background `--clr-surface`; border `0.5px solid rgba(0,0,0,.4)`; radius 4px; height 32px; padding 6px 12px
- `:focus-within`: `outline: 2px solid var(--clr-brand); outline-offset: 1px`
- Inner `input`: borderless, Body `--fs-sm`, color `--clr-muted`

### Navigation
**Tab nav (`.tab`)**: Body 600 `--fs-sm`; folder-tab radius `4px 4px 0 0`; border `0.5px --clr-border` no bottom; bg `--clr-bg`, text `--clr-ns`. Hover (inactive): `rgba(0,0,0,.04)`. Active: bg `--clr-surface`, lifts onto content area.
**Sidebar**: `--clr-surface` panel; headings Cinzel uppercase `--fs-3xs` (brand or `--clr-ns`); links `--fs-sm`.
**Header nav (`.header-nav a`)**: Body 600 `--fs-md`, color `--clr-brand`.
**Breadcrumb**: `--fs-xs` muted; links `--clr-brand`, underline on hover; separator opacity 0.4.
**Quick links / gs-card**: `›` chevron prefix that shifts `translateX` on hover; bg `color-mix(--clr-ns 8%)`.

### Tags & Tooltips
**Tag badge (`.talent-tag`)**: Display 600 `--fs-3xs`; bg `color-mix(--tag-clr 12%)`, text `--tag-clr`, border `color-mix(--tag-clr 40%)`; radius 3px. `--tag-clr` set per bucket (§2).
**Tooltip (`.tag-tooltip`)**: appears above on hover/focus-within; `--clr-surface` panel, border, radius 4px; `opacity 0→1` over 150ms; parent raises z-index.

### Badges & Icons
**Sphere icon (`.si`)**: 32px, `drop-shadow(0 1.5px 2px rgba(0,0,0,.4)) drop-shadow(0 0 2px rgba(255,255,255,.3))`. Might/Guile get extra `saturate/contrast/brightness`.
**Sphere badge grid (`.sphere-badge`)**: square-ish (`aspect 1/1.1`), 90px icon in `--clr-ns`; hover `inset 0 0 0 2px var(--clr-ns)` ring + `scale(1.02)`.

---

## 5. Layout Principles

### Spacing Scale (base 4px)
| Token | Value | Usage |
|-------|-------|-------|
| `--sp-1` | 4px | Tight gaps, icon margins |
| `--sp-2` | 8px | Related-element spacing, sidebar padding |
| `--sp-3` | 12px | Component internal padding |
| `--sp-4` | 16px | Standard gap, content vertical padding |
| `--sp-5` | 20px | Content horizontal padding |
| `--sp-6` | 24px | Page gutter, header padding, section breaks |
| `--sp-7` | 32px | Section-group rhythm (`.section-group`) |
| `--sp-8` | 48px | Major section break (`.classes-and-links`) |

### Containers & Shell
| Token | Value | Role |
|-------|-------|------|
| `--max-w` | 1440px | Page max width (header, layout) |
| `--sidebar-w` | 210px | Left sidebar |
| `--rail-w` | 180px | Right rail / inner rail |

Shell: `.site-header` (72px tall) → `.layout` (flex: sidebar + main) → `.content-area` (raised `--clr-surface` panel, tab-joined corner radius `0 4px 4px 4px`). Inner pages add a sticky right rail (TOC) collapsing at 1024px.

### Border Radius
| Token / value | Usage |
|---------------|-------|
| `--radius` (4px) | Default — cards, panels, inputs, buttons |
| 2px | Search badges (`calc(--radius - 2px)` for nested covers) |
| 3px | Tags, small CTAs |
| 6px | Entry cards, class-list panels |
| 12px | Store-card pill buttons |
| 50% | Circular icon buttons, logo orbs |

Only `--radius` is a token; the others are literal. Treat 4px as default; reach for larger only matching the patterns above.

---

## 6. Depth & Elevation

Shadow only on hover/floating; rest state is border + accent-stripe defined. Tokenized levels:

| Token | Value | Usage |
|-------|-------|-------|
| (none) | none | Cards at rest (depth via border + accent stripe, not shadow) |
| `--shadow-raised` | `0 3px 12px rgba(0,0,0,.10)` | Card hover (intro card) |
| `--shadow-floating` | `0 4px 12px rgba(0,0,0,.15)` | Dropdowns, popovers (search results) |
| `--shadow-lifted` | `0 12px 24px -8px rgba(0,0,0,.20)` | Store card hover |

> Carousel button (`0 2px 8px rgba(0,0,0,.15)`) and tinted/icon shadows remain literal — distinct one-offs, not part of the scale.

**Surface hierarchy:**
1. **Base** — page background `--clr-bg` (parchment)
2. **Raised** — content area, sidebar, dropdowns `--clr-surface` (no shadow; border-defined)
3. **Card** — `--clr-bg` panels with `--clr-border` + accent stripe; shadow only on hover
4. **Floating** — dropdowns/tooltips `--clr-surface` + floating shadow

Rest-state depth is communicated by **hairline borders and accent stripes**, not shadows — consistent with the flat parchment aesthetic. Shadows are a hover/floating affordance only.

---

## 7. Do's and Don'ts

### DO: drive per-system color through the accent vars
```css
/* Good — recolors automatically per [data-system] / .ns class */
.entry-card-name { color: var(--clr-ns); }
.talent-name { color: var(--clr-active); }
```
### DON'T: hardcode a system hex
```css
/* Bad — breaks the per-system swap */
.entry-card-name { color: #174b93; }
```

### DO: use the surface + border + accent-stripe card idiom
```css
/* Good — matches every card in the system */
.my-card { background: var(--clr-bg); border: .5px solid var(--clr-border);
           border-left: 3px solid var(--clr-ns); border-radius: var(--radius); }
```
### DON'T: invent solid-fill or heavy-shadow resting cards
```css
/* Bad — wrong altitude for this flat parchment theme */
.my-card { background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.3); }
```

### DO: use the spacing scale
```css
.panel { padding: var(--sp-3) var(--sp-4); margin-bottom: var(--sp-6); }
```
### DON'T: use off-scale spacing
```css
.panel { padding: 19px; margin-bottom: 37px; }
```

### DO: set display eyebrows in Cinzel uppercase muted
```css
.eyebrow { font-family: var(--font-display); font-weight:700;
           text-transform:uppercase; letter-spacing:.07em;
           font-size: var(--fs-3xs); color: var(--clr-muted); }
```
### DON'T: introduce a sans-serif or a font size outside the `--fs-*` scale.

### DO: include hover + focus on every interactive element (focus ring is global `--clr-brand`).
### DON'T: ship a button/card/link without a hover state.

---

## 8. Responsive Behavior

Mobile-first content site. Fluid type via `clamp()` on `--fs-body`/`--fs-md` means most text scales without breakpoints.

### Breakpoints
| Width | Effect |
|-------|--------|
| ≤ 1024px | Left sidebar hidden (hamburger drawer); inner rail narrows to 140px; multi-col grids → 2-col; three-column inner layout → single; quick-links un-stick |
| ≤ 900px | Sphere grid → 3 columns |
| ≤ 768px | **Mobile**: layout stacks (`flex-direction: column`); inner rail hidden; header nav + center search hidden; tabs shrink (`--fs-2xs`); ref-grid → 1-col; store body stacks; entry-grid → 1-col |
| ≤ 600px | Sphere grid → 2 columns |

### Touch & Motion
- Carousel arrow buttons hidden < 768px (swipe-scroll instead; `scroll-snap-type: x mandatory`).
- `@media (hover: hover) and (pointer: fine)` gates `.class-item` hover affordances — no sticky hover on touch.
- `@media (prefers-reduced-motion: reduce)` zeroes all animation/transition/scroll-behavior.

### Patterns
- Sidebar mobile drawer: `position: fixed; inset:0; overflow-y:auto` over `--clr-bg`.
- Tables: prose tables are full-width, border-collapse, Cinzel uppercase `th` on `--clr-bg`.
- Min interactive size: target 44×44 for new touch controls (existing icon buttons are 32px — bump for new work).

---

## 9. Agent Prompt Guide

### Quick Reference
- **Page background:** `--clr-bg` #e3ddd6 (parchment) · **Raised:** `--clr-surface` #ede8df · **Border:** `--clr-border` #c0b9b0
- **Text:** `--clr-text` #1c1c1c · **Muted:** `--clr-muted` #6b5f58
- **Brand:** `--clr-brand` #990000 · **CTA:** `--clr-cta` #2c8738
- **Per-system accent:** use `--clr-active` (page dominant) and `--clr-ns` (inline) — never a raw system hex
- **Heading font:** Cinzel 700 · **Body font:** Crimson Text 400 (both serif; no sans, no mono)
- **Standard spacing:** `--sp-4` (16px) / `--sp-6` (24px) · **Radius:** `--radius` (4px)
- **Card idiom:** `--clr-bg` + `.5px --clr-border` + 3px accent stripe in `--clr-ns`; shadow only on hover
- **Focus:** global `2px solid --clr-brand`

### How to Use This Document
1. Read DESIGN.md before writing any UI; CSS lives in `src/styles/global.css`.
2. Reference tokens by their real names (`var(--clr-ns)`, `var(--sp-4)`) — do not hardcode hex/px.
3. For anything system-colored, wire it to `--clr-active`/`--clr-ns` so the per-system swap (§2) works.
4. Match the existing card/eyebrow/tag idioms (§4) before inventing a new pattern.
5. New pattern needed? Build it to these conventions and flag for a DESIGN.md update (Section 4).

### Example Component Prompt
"Add a feat card on `--clr-bg` with a `0.5px solid var(--clr-border)` outline and a
`3px solid var(--clr-ns)` left stripe, `var(--radius)` corners, `var(--sp-3) var(--sp-4)` padding.
Title in Cinzel 700 `--fs-sm` colored `var(--clr-ns)`; source label in Cinzel italic `--fs-3xs`
`var(--clr-muted)` on the same row. Body in Crimson Text `--fs-md`, line-height 1.55. On hover,
bg `color-mix(in srgb, var(--clr-ns) 4%, var(--clr-surface))`, no transform."

### Iteration Guide
- Change one component at a time; name the token and the state (default/hover/focus/active).
- Verify per-system look by testing under each `[data-system]` (power/might/guile/champions) + brand default.
- Keep resting depth flat (border + stripe); reserve shadow for hover/floating only.
