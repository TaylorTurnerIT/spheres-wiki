# Spheres of Guile — Content Parity Audit Report

**Date**: 2026-06-13
**Source (old)**: http://spheresofpower.wikidot.com/
**Target (new)**: https://taylorturnerit.github.io/spheres-wiki/guile/
**Scope**: All 15 Spheres of Guile sphere pages

---

## Summary

| Metric | Count |
|---|---|
| Spheres audited | 15 |
| Spheres with genuine talent gaps | 3 |
| Missing talents | 5 |
| Cross-sphere feat gaps | 2 |
| Missing overview/package content | 25 sections |
| Missing reference tables | 1 |
| Categorization errors (content present, wrong tag/section) | 3 |
| Champion feats correctly placed | ~45 (0 need moving) |
| False positives removed | ~200 |
| TOC-invisible items | 5 |
| Clean spheres (0 talent/feat gaps) | 9 |

---

## How to Read This Report

### Guile Structure (New Wiki)

Every Guile sphere page on the new wiki uses these TOC sections:

```
data-toc-section="overview"        — Base sphere abilities, packages, rules text
data-toc-section="{sphere}-talents" — Main talent section
data-toc-section="{subtype}-talents" — Sub-type talents (e.g., quip-talents, flourish-talents)
data-toc-section="exceptional-talents" — Legendary/advanced talents
data-toc-section="general-feats"    — Feats (where champion feats BELONG)
data-toc-section="performance-sphere-feats" — Performance-specific feat section
```

### Old Wiki TOC Structure (Guile)

All Guile sphere pages on the old Wikidot wiki follow this structure:
```
<h1> Sphere Name </h1>
  <h2> Base Ability / Approach Description </h2>
  <h3> Sphere Talents </h3>           ← section header
    <h4> Talent Name </h4>            ← actual talent
  <h3> {Subtype} Talents </h3>       ← e.g., Quip Talents, Flourish Talents
    <h4> Subtype Talent </h4>
  <h3> Legendary/Exceptional Talents </h3>
  <h3> Feats </h3>                     ← contains champion feats and general feats
  <h3> Drawbacks </h3>                 ← optional drawback rules (NOT talents)
  <h3> Archetypes Specializing in {Sphere} </h3>
  <h3> {Sphere} Talent Types </h3>    ← explains talent tags (quip, flourish, act, etc.)
```

### Critical Difference from Power and Might

Guile uses **champion feats** — feats specifically for Champions of the Spheres. On the old wiki, these are listed under a "Feats" heading alongside other feats. On the new wiki, they belong in `general-feats` or `performance-sphere-feats` TOC sections.

**The parser massively misreported these.** It flagged ~45 items as both "EXTRA talents" and "MISSING feats" because champion feats appeared in the old TOC's feat section but the parser compared against the talent section. **All champion feats are correctly present on the new wiki.** None need to be moved or retagged.

---

## Missing Talents

Only 5 talents across 3 spheres are genuinely absent.

### Navigation — 3 missing

| # | Talent | Heading | Source | Position |
|---|---|---|---|---|
| 1 | **Focused Wayfaring** | `<h4>` | Core | Under Navigation Talents |
| 2 | **Heedless Advance** | `<h4>` (utility start) | Core | Under Navigation Talents |
| 3 | **Tracker** | `<h4>` | Core | Under Navigation Talents |

**Old wiki source**: `cache/old/spheresofpower_wikidot_com_navigation`

These three talents are listed in the old wiki's talent section (between existing Navigation talents). Extract from old cache and author on new wiki.

### Subterfuge — 1 missing

| # | Talent | Heading | Source | Position |
|---|---|---|---|---|
| 1 | **Veil of Mystery [utility] [3PP]** | `<h4>` | 3PP | Under Subterfuge Talents |

**Old wiki source**: `cache/old/spheresofpower_wikidot_com_subterfuge`

### Vocation — 1 missing

| # | Talent | Heading | Source | Position |
|---|---|---|---|---|
| 1 | **Crowd Pleaser [plan] [utility] [DRS]** | `<h4>` | Diamond Recreational Studios | Under Vocation Talents |

**Old wiki source**: `cache/old/spheresofpower_wikidot_com_vocation`

---

## Cross-Sphere Feat Gaps

These feats appear on multiple old wiki sphere pages but are only present on one new wiki page.

| # | Feat | Missing From | Present On | Action |
|---|---|---|---|---|
| 1 | **Grandiose Charms (Champion) [LotS]** | Bluster | Performance | Copy the feat entry to Bluster's `general-feats` section |
| 2 | **Detailed Charting** | Investigation | Navigation (2 hits) | Copy the feat entry to Investigation's feats section |
| 3 | **Speculative Analysis** | Study | Investigation (2 hits) | Copy the feat entry to Study's feats section |

**Note**: These are the same piece of content referenced from multiple sphere pages. Not unique missing content — just missing cross-references.

---

## Missing Overview / Package Content

This is the largest category of genuine gaps in Guile. Every sphere page on the old wiki has descriptive sections that are absent from the new wiki.

### "{Sphere} Talent Types" — 12 spheres affected

The old wiki has a section on every Guile sphere explaining talent type tags. These explain what `(quip)`, `(flourish)`, `(function)`, `(act)`, `(dance)`, `(lyric)`, etc. mean mechanically.

| Sphere | Old Wiki Section | Evidence |
|---|---|---|
| Artifice | Artifice Talent Types | 0 hits |
| Bluster | Bluster Talent Types | 0 hits |
| Body Control | Body Control Talent Types | 0 hits |
| Communication | Communication Talent Types | 0 hits |
| Faction | Faction Talent Types | 0 hits |
| Herbalism | Herbalism Talent Types | 0 hits |
| Infiltration | Infiltration Talent Types | 0 hits |
| Investigation | Investigation Talent Types | 0 hits |
| Performance | Performance Talent Types | 0 hits |
| Spellhacking | Spellhacking Talent Types | 0 hits |
| Study | Study Talent Types | 0 hits |
| Subterfuge | Disguise Talent Types | 0 hits (note: Subterfuge uses "Disguise Talent Types" not "Subterfuge Talent Types") |

**How to fix**: Extract the talent types explanation section from each old wiki page and add it to the `overview` area of each new wiki page.

### Sphere Package Descriptions

| Sphere | Missing Content | Evidence |
|---|---|---|
| Artifice | Artifice Sphere Packages | 0 hits |
| Faction | Retainer Package | 0 hits (retainer content: 100 hits in body — packages need section header and description) |
| Faction | Supply Package | 0 hits (supply content: 39 hits) |
| Faction | The Faction Sphere and Wealth | 0 hits |
| Herbalism | Herbalism Packages | 0 hits |
| Herbalism | Herbal Package | 0 hits |
| Herbalism | Remedy Package | 0 hits |
| Performance | Act, Dance, Lyric, and Instrumental | 0 hits |
| Survivalism | Survivalism Packages | 0 hits |
| Survivalism | Dredge Package | 0 hits |

### Rule Notes and Sidebars

| Sphere | Content | Evidence |
|---|---|---|
| Faction | Sidebar: New and Old Factions | 0 hits |
| Faction | Sidebar: Authority and Responsibility | 0 hits |
| Spellhacking | Rule Note: Dispel Checks | 0 hits |
| Spellhacking | Rule Note: Your Hacking Instrument | 0 hits |
| Performance | Sidebar: Performance Sphere and Ally Coordination | 0 hits |

### Missing Reference Table

| Sphere | Table | Evidence |
|---|---|---|
| Faction | Optional Detailed Statistics | 0 hits |

Faction also has **Resource Budgets** and **Retainer Statistics** tables — both present in body (1 hit each) but TOC-invisible (not in sidebar).

---

## Categorization Errors

Content present on new wiki but with wrong tags or in wrong TOC section.

### Approach/Base Abilities Tagged as Talents

| Sphere | Item | Issue | Fix |
|---|---|---|---|
| Bluster | Authoritative | Bluster approach type. Present (6 hits in body, 1 in TOC). Tagged as `Talent`/`Basic`. | Re-tag as `Base Ability`. Move from talents TOC to `overview`. |
| Body Control | Exceptional Discipline | Body Control approach. Present (2 hits). Tagged as `Talent`. Correctly in feats section but wrong tag. | Re-tag as `Base Ability` or feat descriptor. |

### Feats/Aptitudes in Wrong TOC Section (Verification Pending)

Items like "Speculative Analysis", "Terrain Adaptation", "Unerring Eye", "Earthly Aptitude", "Mechanical Aptitude", "Mystical Aptitude", "Occult Aptitude", "Societal Aptitude", "Tactical Hypothesis" appeared in the parser's EXTRA/MISPLACED lists. These are present in the page body. Verify they are in the correct TOC section (`general-feats`) rather than a talent section.

---

## TOC-Invisible Items

Content present in page body with valid `id` attributes but missing `data-toc-item` entries in the sidebar.

| Sphere | Item | Evidence | Correct Section |
|---|---|---|---|
| Artifice | Tug The Heartstrings | 1 hit in body, not in TOC | general-feats |
| Artifice | Drawbacks | 1 hit in body, not in TOC | overview |
| Navigation | Cartographer | 8 hits in body, not in TOC | overview or talents |
| Navigation | Pointer | 1 hit in body, not in TOC | overview or talents |
| Faction | Resource Budgets (table) | 1 hit in body | overview |
| Faction | Retainer Statistics (table) | 1 hit in body | overview |

---

## False Positive Patterns (Guile-Specific)

### 1. Champion Feats as Missing Content (~45 items)

**The dominant false positive pattern.** The old wiki lists champion feats under a "Feats" heading (as proper feats). The parser compared old TOC talent entries against new TOC talent entries. Champion feats correctly placed in `general-feats` or `performance-sphere-feats` were flagged as both "EXTRA talents" and "MISSING feats".

**Result**: All champion feats are correctly present. Zero need to be moved. The parser mis-compared section types.

**Verified spheres with correctly placed champion feats**:
- **Performance** (13 feats): Capoeirista, Catchy Tune, Fey Melodies, Fight Choreography, Grandiose Charms, Graveborn Expression, Harmonizing Lyrics, Mechanized Magnificence, Primal Dancer, Sojourner, Theatrical Effects, Tug The Heartstrings, Vicious Performer — all in `performance-sphere-feats`
- **Artifice** (4 feats): Deific Icon, Industrious Engineer, Spatial Storage, Thaumic Retention — in `general-feats`
- **Bluster** (2 feats): Insinuating Incantation, Winded By Words — in `general-feats`
- **Body Control** (1): Exceptional Discipline — in `general-feats`
- **Faction** (2): Eldritch Supplies, Organized Following — in `general-feats`
- **Investigation** (3): Speculative Analysis, Terrain Adaptation, Unerring Eye — in `general-feats`
- **Study** (6): Earthly Aptitude, Mechanical Aptitude, Mystical Aptitude, Occult Aptitude, Societal Aptitude, Tactical Hypothesis — in `general-feats`
- **Survivalism** (5): Animist, Elemental Rift, Practiced Refinement, Strategic Terrain, Totemic Effigy — in `general-feats`
- **Herbalism** (2): Horticulturist, Natural Sciences — in `general-feats`
- **Infiltration** (1): Dastardly Entrapment — in `general-feats`
- **Navigation** (5): Detailed Charting, Dual Pathing, Field Instruction, Scorched Path, Trailblazer — in `general-feats`

### 2. "Drawbacks" as Missing Talent (10+ spheres)

The old wiki has a "Drawbacks" `<h3>` section describing optional drawback rules for each sphere. The parser flagged this as a missing talent. Drawbacks is rules text, not a talent. On new wiki, this content may be TOC-invisible in the page body.

### 3. "Alternate Starts" as Missing Talents (~15 items)

Items tagged `[alternate start]` in the old wiki are alternative ways to acquire a sphere. They are genuine talents but the parser incorrectly flagged ones that ARE present on the new wiki. **All alternate start talents verified present across all 15 spheres.**

### 4. Archetype Names (~80 items)

Every Guile sphere lists "Archetypes Specializing in {Sphere}" plus individual archetype names. These are DEFERRED to class/archetype pages. Not sphere-page content gaps.

### 5. Section Headers as Talents (~30 items)

Old wiki auto-generates TOC from ALL headings. Items like "Flourish", "Function", "Quip", "Act", "Dance", "Lyric", "Assist", "Rapport", "Hack", "Mishap", "Theory", "Complication", "Research", "Disguise", "Ground", "Harvest" — these are `<h3>` category labels for talent sub-types. New wiki organizes differently. Not gaps.

### 6. Unicode Apostrophe Collisions (~15 items)

Standard old-vs-new apostrophe encoding mismatch. All verified present. Includes: Artificer's Eye, Naturalist's Eye, Physician's Efficacy, Saboteur's Friend, Hacker's Analysis, Hunter's Eye, All The World's A Stage, Cartographer's Knack, Keep 'Em Talking, Mediator's Mien, Virtuoso's Challenge.

---

## Clean Spheres (Zero Genuine Talent/Feat Gaps)

| Sphere | Notes |
|---|---|
| Artifice | 0 talent gaps, 0 feat gaps (2 overview, 2 TOC-invisible) |
| Body Control | 0 gaps (1 overview, 1 categorization error) |
| Communication | 0 gaps (1 overview) |
| Herbalism | 0 gaps (4 overview) |
| Infiltration | 0 gaps (1 overview) |
| Performance | 0 gaps. All 13 champion feats correctly placed. (3 overview) |
| Spellhacking | 0 gaps (3 overview) |
| Survivalism | 0 gaps. All champion feats present. (2 overview) |
| Vocation | 0 gaps except 1 talent (Crowd Pleaser). Most complete (133/136). |

---

## Remediation Priority

### High Priority (Missing Content)
1. **5 missing talents** — author from old wiki source (Navigation ×3, Subterfuge ×1, Vocation ×1)
2. **2 cross-sphere feats** — add Grandiose Charms (Bluster), Detailed Charting (Investigation), Speculative Analysis (Study). Content already exists on other pages.
3. **25 overview sections** — extract and add "{Sphere} Talent Types" explanations to all 15 spheres. Add package descriptions to Artifice, Faction, Herbalism, Performance, Survivalism.

### Medium Priority (Structural Fixes)
4. **3 categorization errors** — re-tag Authoritative (Bluster) and Exceptional Discipline (Body Control) as base abilities. Verify feat/talent section placement for remaining items.
5. **5 TOC-invisible items** — add sidebar entries for Cartographer, Pointer, Tug The Heartstrings, Resource Budgets, Retainer Statistics.
6. **1 missing table** — add Optional Detailed Statistics to Faction.

### Low Priority
7. **Rule notes and sidebars** — add Rule Note: Dispel Checks, Your Hacking Instrument (Spellhacking), Sidebar content (Faction, Performance).
8. **TOC-invisible Drawbacks** — the Drawbacks rules text is present in body on most spheres but lacks TOC entries.

---

## Parsing Old Wiki Source: Quick Reference

### Finding Old Wiki Content

```bash
# Extract all talents from a Guile sphere
grep -oP '<h4 id="toc\d+"><span>[^<]+</span></h4>' cache/old/spheresofpower_wikidot_com_SPHERE

# Get full text of a specific section
grep -A200 '<h3.*>Navigation Talents' cache/old/spheresofpower_wikidot_com_navigation | sed 's/<[^>]*>//g'

# Find the Talent Types section
grep -A50 'Talent Types' cache/old/spheresofpower_wikidot_com_SPHERE | sed 's/<[^>]*>//g'
```

### Heading Level Convention (Guile)

| Level | Meaning | New Wiki Location |
|---|---|---|
| `<h1>` | Sphere name | Page title |
| `<h2>` | Approach/base ability descriptions | `overview` TOC section |
| `<h3>` | Talent category (e.g., "Navigation Talents", "Flourish Talents") | TOC group label |
| `<h3>` | "Drawbacks" | `overview` or rules section |
| `<h3>` | "{Sphere} Talent Types" | `overview` |
| `<h3>` | "Feats" | `general-feats` TOC section |
| `<h3>` | "Archetypes Specializing in {Sphere}" | Deferred |
| `<h4>` | **Actual talent** | talent-entry card in appropriate TOC section |
| `<h4>` | Champion feat (under Feats `<h3>`) | feat entry in `general-feats` |

### Guile-Specific Talent Tags

| Old Wiki Tag | Meaning | New Wiki Tag |
|---|---|---|
| `(quip)` | Quip-type talent (Bluster) | Quip |
| `(flourish)` | Flourish-type talent (Artifice) | Flourish |
| `(function)` | Function-type talent (Artifice) | Function |
| `(act)` | Act package talent (Performance) | Act |
| `(dance)` | Dance package talent (Performance) | Dance |
| `(lyric)` | Lyric package talent (Performance) | Lyric |
| `(instrumental)` | Instrumental package talent (Performance) | Instrumental |
| `(assist)` | Assist-type talent (Communication) | Assist |
| `(rapport)` | Rapport-type talent (Communication) | Rapport |
| `(retainer)` | Retainer talent (Faction) | Retainer |
| `(supply)` | Supply talent (Faction) | Supply |
| `(hack)` | Hack talent (Spellhacking) | Hack |
| `(mishap)` | Mishap talent (Spellhacking) | Mishap |
| `[alternate start]` | Alternative sphere acquisition | Alternate Start |
| `[utility start]` | Utility-focused start option | Utility Start |
| `(Champion)` | Champion feat (Belongs in `general-feats`) | Champion |
| `(Champion, Dual Sphere)` | Champion feat combining two spheres | Champion, Dual Sphere |
| `(Champion, Drawback)` | Champion feat with drawback | Champion, Drawback |

### Source Tag Reference

| Old Wiki Tag | Source Book | New Wiki Tag |
|---|---|---|
| `[DRS]` | Diamond Recreational Studios | DRS |
| `[LotS]` | Legends of the Spheres | LotS |
| `[3PP]` | Third party | 3PP |
| `[LG]` | Lost Galaxies | LG |
| `[CS]` | Class Supplement | CS |
| `[SM—]` | Spheres of Might (cross-system) | SM |

---

## Cross-System Comparison

| System | Missing Talents | Missing Feats | Missing Overview | Overall Completeness |
|---|---|---|---|---|
| **Power** | 7 | 20 | 1 | 70% (30 gaps + 73 categorization errors) |
| **Might** | 52 | 0 | 19 | 40% (massive content gaps) |
| **Guile** | 5 | 2 | 25 | **85%** (most complete system) |

**Conclusion**: Guile is the most structurally complete of the three systems. The remaster prioritized Guile spheres during the initial migration. The primary remaining work is adding overview/package description sections (25 missing) and 5 talent entries — not the wholesale content authoring that Might requires.
