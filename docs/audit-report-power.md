# Spheres of Power — Content Parity Audit Report

**Date**: 2026-06-13
**Source (old)**: http://spheresofpower.wikidot.com/
**Target (new)**: https://taylorturnerit.github.io/spheres-wiki/
**Scope**: All 25 Spheres of Power sphere pages

---

## Summary

| Metric | Count |
|---|---|
| Spheres audited | 25 |
| Spheres with genuine gaps | 15 |
| Missing talents | 7 |
| Missing feats | 20 |
| Missing appendix/rule text | 1 |
| Missing entire pages | 2 (Bear, Technomancy) |
| Categorization errors (content present, wrong tag) | 73 |
| False positives (parser errors) | 20 |

---

## Missing Talents

These talents exist on the old Wikidot wiki but are **completely absent** from the new wiki page — zero matches in body text or TOC sidebar.

### Death
- **Curse (ghost strike) [curse]** — Ghost strike talent granting curse abilities (e.g., blindness, muteness, phobia). Referenced as prerequisite by Greater Curse (advanced talent) which links to `/spheres-wiki/power/fate/curse/`. Full text at old wiki line ~907.

### Mana
- **Bulwark (Manipulation)** — Manipulation talent. Old wiki `<h4>` at toc42.

### Mind
- **Disrupt Focus (charm)** — Charm talent. Old wiki `<h4>` at toc23.
- **Polyglot (Cognition) [utility] [Apoc]** — Cognition utility talent. Old wiki `<h4>` at toc56.

### Telekinesis
- **Flight** — Telekinesis talent granting flight. Old wiki `<h4>` at toc14.

### War
- **Commander [utility]** — Utility talent. Old wiki `<h4>`.

### Fallen Fey
- **Ventriloquism (fey-blessing)** — Fey-blessing talent.

### TOC-Invisible (content present in body, not in sidebar)
- **Grimalkin Shade** (Fallen Fey) — Talent-entry div exists (`id="grimalkin-shade"`) but has no `data-toc-item` in the sidebar navigation.

---

## Missing Feats

These feats exist on the old wiki but have **zero matches** on the new wiki for the given sphere.

### Alteration
- **Bully [3PP]** — Combat feat
- **Extradimensional Gullet (Combat) [Alienist HB]** — Also missing from Death

### Conjuration
- **Deadcaller [Gravecaller's HB]** — Undead companion/Death synergy feat. Prereqs: Conjuration (Undead Creature x2), Death sphere.

### Dark
- **Extradimensional Shadow** — Dual Sphere feat (Dark + Warp). Combines Extradimensional Storage (Warp) with Shadow Stash (Dark).
- **Twilight Adept (Teamwork)** — Allows Light/Dark sphere effects to coexist.

### Death
- **Extradimensional Gullet (Combat) [Alienist HB]** — Also missing from Alteration
- **Lifebound Auspician [Gravecaller's HB]** — Also missing from Fate
- **Spiteful End [SM—]** — Present on Fate page but missing from Death

### Destruction
- **Arcing Strike (Combat)** — Also missing from Divination's Destruction cross-reference
- **Dimensional Tether [3PP]**
- **Dynamic Wallcrafter [SM—]**
- **Primal Admixture (Admixture) [3PP]** — Not to be confused with Primal Blast (dual sphere feat) which IS present
- **Spellshock Admixture (Admixture) [Mana HB]**

### Divination
- **Area Bypass [3PP]**

### Enhancement
- **Floating Panoply**

### Fate
- **Lifebound Auspician [Gravecaller's HB]** — Also missing from Death

### Illusion
- **Fool's Counterspell (Counterspell)**

### Life
- **Catty Observer [Catgirl HB]**

### Nature
- **World In Miniature**

### Telekinesis
- **Extradimensional Assembly** — Cross-sphere feat. Present on Warp page but missing from Telekinesis page.

---

## Missing Appendix/Rules Text

### Mind
- **About Dreamscapes** — Rules text describing the Dreamscapes subsystem. Old wiki `<h1>` at toc108. Not a talent, but appendix content about how dreamscapes work.

---

## Missing Entire Pages

These old wiki pages have no corresponding page on the new wiki:

- **Bear** — `http://spheresofpower.wikidot.com/bear`
- **Technomancy** — `http://spheresofpower.wikidot.com/technomancy`

Both return 404 on the new wiki.

---

## Categorization Errors (Content Present, Wrong Tag)

These items exist on the new wiki with full body text but are incorrectly rendered as `talent-entry` cards with `Talent`/`Basic` tags. They should be base abilities, section headers, rules descriptions, or reference tables.

### Conjuration (12 items)
**Companion Archetypes** (wrongly tagged as talents):
- Distinct Kin, Familiar, Guileful Companion, Martial Companion, Mindless, Unwilling, Warrior

**GM Advice/Rules** (wrongly tagged as talents):
- Companion Details, Keep It Moving, Roleplaying a Companion, Summoning and Calling, Too Many Companions

### Creation (9 items)
**Base abilities** (wrongly tagged as talents):
- Destroy, Repair

**Rule clarifications** (wrongly tagged as talents):
- Falling Objects, Falling Weapons, Buried, Walls and Coverings, Spikes and Hazardous Ground, Catches Nets and Cages

**Rule description** (wrongly tagged as talent):
- Material

### Dark (3 items)
- Blot Talents (section header)
- Note: Light And Darkness (rules note)
- Shadow Talents (section header)

### Death (3 items)
- Death Sphere as Evil, Death Sphere as Lawful, Death Sphere as Neutral (Gamemastering morality variants)

### Divination (1 item)
- Alternate Divinations, Advanced (section header)

### Enhancement (1 item)
- Enhance Equipment (base ability)

### Fate (4 items)
- Hallow (base ability), Serendipity (base ability), Motifs (section text), Fervent Spell (GM advice)

### Illusion (3 items)
- Minor Figments, Minor Glamers, Sensory (rules/section text)

### Light (1 item)
- Nimbus (base ability)

### Mana (3 items)
- Mystical Bond, Shuffle, Spellburn (base abilities)

### Mind (5 items)
- Cloud, Cognition, Suggestion (base abilities/section headers)
- Generating Manifestation Points, Psionic and Sphere Abilities in a Duel (rules text)

### Protection (3 items)
- Barrier, Deflection, Adaptation (aegis base abilities)

### Telekinesis (4 items)
- Bludgeon, Catch, Hostile Lift, Sustained Force (base abilities)

### Time (2 items)
- Haste, Slow (base abilities)

### War (2 items)
- Commanding Aid, Momentum (base abilities)

### Warp (1 item)
- Bend Space (base ability)

### Weather (7 items)
- Aridity, Ash, Fallout, Heat, Mantle, Precipitation, Vog (weather type/sroud packages)

### Fallen Fey (7 items)
- Faerie?, Fairy Mounds, Fairy Rings, Nature-Connection, Seasons, The Courts, Traveling through Faerie (rules/description text)

---

## Parser Bugs & False Positives

Known parser limitations identified during audit:

1. **Combat feats in `data-toc-section="combat-feats"` undetected** — Divination combat feats (Arcing Strike, Precogniscent Protection/Resistance/Smite) were present but not found by the parser.
2. **`<h5>` sub-sections in old TOC** flagged as missing separate talents — Cartographer's Divinations sub-sections (Divine Chart, Lay of the Land, Pathfinder), Animate Object CR table entries (Tiny through Colossal+++), Warping Structures sub-items (Store/Teleport Structure).
3. **Cross-sphere feats** appearing on one page but not another (e.g., Extradimensional Assembly on Warp but not Telekinesis).
4. **Rules/description text** in the old TOC auto-generated from headings (e.g., "GM Advice", "Rules Clarifications and Expansions") flagged as missing talents/feats.
5. **Slug corruption** — Martial Companion's `id` slug has hex color `993300` prefix: `993300martial-companion`.

---

## Clean Spheres (Zero Genuine Gaps)

These spheres have all talents and feats present with no missing content:
- **Blood** — All 47 talents and 21 feats matched perfectly
- **Creation** — All 47 talents and 21 feats present; 9 rules clarifications miscategorized
- **Light** — Content-complete; 1 base ability (Nimbus) miscategorized
- **Protection** — Content-complete; 3 aegis base abilities miscategorized
- **Time** — Content-complete; 2 base abilities miscategorized
- **Warp** — Content-complete; 1 base ability miscategorized
- **Weather** — Content-complete; 7 weather types miscategorized

---

## Remediation Priority

### High Priority (Missing Content)
1. Bear and Technomancy — author entire pages from old wiki source
2. All 7 missing talents — author from old wiki source
3. All 20 missing feats — author from old wiki source
4. About Dreamscapes (Mind appendix text)

### Medium Priority (Tagging Fixes)
5. Fix 73 categorization errors — re-tag items as base abilities, section headers, or rules text instead of talent cards
6. Fix Martial Companion slug (`993300martial-companion` → `martial-companion`)

### Low Priority (Parser Improvements)
7. Fix parser to detect combat-feats TOC section
8. Handle cross-sphere feats that appear on multiple pages
9. Distinguish `<h5>` sub-sections from standalone talents
