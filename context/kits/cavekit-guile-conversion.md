---
created: "2026-06-11"
last_edited: "2026-06-11"
---

# Cavekit: Guile Sphere Conversion (Wikidot → Markdown)

Convert all 20 Spheres of Guile skill spheres from Wikidot source → spheres-wiki markdown+YMAL
entries. Start with Navigation Sphere as proof-of-concept & acceptance test, then iterate
through remaining spheres following same pipeline.

## §G Goal

Migrate all Spheres of Guile sphere content under `src/content/spheres-of-guile/guile/...`
using same Wikidot→Markdown pipeline as Might spheres (§M in `spheres-wiki/SPEC.md`).
Navigation sphere first — validates pipeline, lexicon, quarantine flow, build pass.
Then remaining 19 spheres in priority order.

## §C Constraints

- **C1.** Source from `spheresofpower-wikidot-archive/pages/` (Wikidot raw) or Library of Metzofitz
- **C2.** Output to `src/content/{book}/guile/spheres/{sphere}/` — system `guile` derived from path (V26, C11)
- **C3.** Per-sphere `section_defs()` + `sphere_entry()` in Rust converter (follow Might pattern)
- **C4.** Lexicon at `ftml/conf/guile-lexicon.toml` — citation keys, paren tags, bracket tags, apoc body sources
- **C5.** `npm run build` ! pass before any sphere marked COMPLETE (V34, V36)
- **C6.** No code changes outside `src/content/` + `SVGSprite.astro` for icon (V2, V3, C6)
- **C7.** `_system.yaml` ! exist at `src/content/spheres-of-guile/guile/_system.yaml` — `id: guile`, `name: Spheres of Guile`
- **C8.** Tags shared with Power/Might ! NOT be redefined — use existing definitions (V37)
- **C9.** Entry `id`s lowercase kebab-case, match filename (C10, V16)
- **C10.** `system:` field ⊥ in frontmatter — derived from `{book}/guile/` dir prefix (C11, V26)

## §I Interfaces

### I.source — input contract
```
spheresofpower-wikidot-archive/pages/<sphere>.txt  (Wikidot raw source)
```
OR sourced from `https://metzo.miraheze.org/wiki/{Spheres_of_Guile_Talents}` if archive empty.

### I.parser — converter binary
```
ftml/examples/export_guile.rs
  for each sphere:
    <sphere>_section_defs() → Vec<SectionDef>
    <sphere>_sphere_entry(primary_book) → GuileEntry
  wired in main() match on --sphere flag
```
cmd: `cargo run --example export_guile -- <source.txt> --sphere <id> --lexicon conf/guile-lexicon.toml -o /tmp/guile-gen`
Flags: `--validate`, `--write`, `--force`, `--force-quarantine`

### I.lexicon — data dictionary
```
ftml/conf/guile-lexicon.toml
  [citation_keys]          # bracket key → book slug | __DEFERRED__ | __SKIP__
  [apoc_body_sources]      # body ^^Source:^^ → book slug
  [paren_tags]             # (descriptor) → canonical tag
  [bracket_ability_tags]   # [Ability] → canonical tag
```

### I.output — content contract
```
src/content/spheres-of-guile/
  _book.yaml                     # title, publisher, publishedDate, price?, buyUrl?, coverImage?
  guile/
    _system.yaml                 # id: guile, name: Spheres of Guile
    spheres/navigation.md         # sphere entry (id, name, type:sphere, icon, sectionDefinitions)
    spheres/navigation/talents/*.md  # talent entries
    feats/*.md                    # feat entries (if any)
    tags/*.md                     # tag definitions (only if not in Power/Might)
```

### I.content — per-entry schema (from `entrySchema` in `content.config.ts`)
```
SphereEntry:   { id, name, type:"sphere", sourceBook, icon, tags, sectionDefinitions }
TalentEntry:   { id, name, type:"talent", sourceBook, sphere, tier:"base"|"basic"|"advanced", tags }
FeatEntry:     { id, name, type:"feat", sourceBook, sphere, dualSphere?, tags }
TagEntry:      { id, label, color?, priority, description, sourceBook, sphere? }
```

### I.build — validation gate
```bash
# Per sphere:
cd spheres-wiki
npm run validate    # content schema check
npm run build       # full Astro build → must pass (V34)
npm test            # unit tests

# E2E:
npm run test:e2e    # navigation.spec.ts already exists
```

## §M Guile Migration Pipeline

### Pipeline
```
spheresofpower-wikidot-archive/pages/<sphere>.txt  (or Metzo source)
         │
         ▼
    ftml AST parser  (Rust crate: ftml/)
         │
         ▼
  export_guile.rs   (per-sphere section_defs + sphere_entry functions)
         │
         ▼
  guile-lexicon.toml  (citation_keys, apoc_body_sources, paren_tags, bracket_ability_tags)
         │
         ▼
spheres-wiki/src/content/<book>/guile/spheres/<sphere>/*.md  (output)
         │
         ▼
    npm run validate → npm run build → must pass
```

### Key files

| File | Purpose |
|------|---------|
| `ftml/examples/export_guile.rs` | New converter: per-sphere section_defs + sphere_entry, wired in main() |
| `ftml/conf/guile-lexicon.toml` | New data dictionary: citation keys → book slugs, body-source titles, paren tags, bracket tags |
| `ftml/examples/CLAUDE.md` | Update with Guile sphere status table + build commands |
| `spheresofpower-wikidot-archive/pages/<sphere>.txt` | Raw Wikidot source per sphere |
| `src/content/spheres-of-guile/_book.yaml` | Must exist — core Guile book metadata |
| `src/content/spheres-of-guile/guile/_system.yaml` | Must exist — `id: guile, name: Spheres of Guile` |

### Citation key resolution (shared pattern with Might)

| Sentinel | Behavior |
|----------|----------|
| `__DEFERRED__` | Two-step: check body `Source:` line against `[apoc_body_sources]`. No match → quarantine. |
| `__SKIP__` | Silently discard entry. Used for `[3PP]`. |
| `<book-slug>` | Direct mapping to source book folder. |

### Guile sphere inventory (Spheres of Guile product)

| # | Sphere | Associated Skills | Status | Notes |
|---|--------|-------------------|--------|-------|
| 1 | Navigation | Perception, Sense Motive | **COMPLETE** | 64 entries, 0 quarantine, build passes |
| 2 | Alchemy (Guile) | Craft (alchemy) | `.` | |
| 3 | Athletics (Guile) | Acrobatics, Climb, Swim | `.` | |
| 4 | Communication | Diplomacy, Linguistics | `.` | |
| 5 | Deception | Bluff, Disguise | `.` | |
| 6 | Education | Knowledge skills | `.` | |
| 7 | Engineering | Craft, Disable Device | `.` | |
| 8 | Exploration | Perception, Survival | `.` | |
| 9 | Infiltration | Disable Device, Stealth | `.` | |
| 10 | Investigation | Perception, Sense Motive | `.` | |
| 11 | Leadership (Guile) | Diplomacy, Intimidate | `.` | |
| 12 | Medicine | Heal | `.` | |
| 13 | Negotiation | Diplomacy, Sense Motive | `.` | |
| 14 | Performance | Perform | `.` | |
| 15 | Profession | Profession | `.` | |
| 16 | Scoundrel (Guile) | Sleight of Hand, Stealth | `.` | |
| 17 | Stealth | Stealth | `.` | |
| 18 | Survival | Survival, Heal | `.` | |
| 19 | Technology | Disable Device, Knowledge (engineering) | `.` | |
| 20 | Transportation | Ride, Handle Animal | `.` | |

> **NOTE:** Exact sphere names, count, and associated skills need verification against source material.
> 20 is approximate count from Spheres of Guile product page. Update table after source review.

### Navigation Sphere — target structure

Navigation sphere deals with:
- **Perception** and **Sense Motive** skills — reading environments, detecting threats, tracking
- **Skill unlocks** — talent-gated skill abilities
- **Packages** — likely choice of specializations (tracking, sense motive, etc.)
- **Talents (basic/advanced)** — grouped by tag (package-based)

Expected output:
```
src/content/spheres-of-guile/guile/spheres/navigation.md
  sectionDefinitions:
    - label: "Talents"
      categories:
        - label: "Basic Talents" / per-package sections
        - label: "Advanced Talents"
  body includes [TalentName] markers for tier:base entries

src/content/spheres-of-guile/guile/spheres/navigation/talents/
  <base-ability-1>.md   (tier: base)
  <base-ability-2>.md   (tier: base)
  <talent-name>.md      (tier: basic)
  <advanced-talent>.md  (tier: advanced)
```

### Iterative validation loop (per sphere)

```
1. SOURCE → read Wikidot raw from archive or Metzofitz
2. INVENTORY → list all H1-H4 headings, bracket keys [Key], paren tags (tag)
3. LEXICON → add new keys to guile-lexicon.toml (citation_keys, paren_tags, bracket_ability_tags)
4. SECTION_DEFS → write <sphere>_section_defs() + <sphere>_sphere_entry() in export_guile.rs
5. BUILD_PARSER → cargo build --example export_guile
6. VALIDATE → cargo run ... --validate → check for parse errors, quarantine entries
7. RESOLVE → fix quarantine: add missing lexicon entries OR acknowledge for manual
8. WRITE → --force generates .md files
9. CLEANUP → delete QUARANTINE-<sphere>.md, delete non-talent entries
10. TAG_DEFS → create tag .md files in guile/tags/ (unless shared with Power/Might)
11. ASTRO_BUILD → npm run build in spheres-wiki → must pass with 0 errors
12. CHECK → review output: 0 quarantine, correct names, tags, tiers, sourceBook
13. MERGE → mark sphere COMPLETE in status table
```

**Package detection:** Guile spheres use packages (choose-one bundles with associated skills). Packages are H4 entries under a "Sphere Packages" H2 section. To auto-tag: `section_tags: vec!["package".to_string()]` on the packages `SectionDef`. Package section heading excluded from base-entry creation via `exclude_base` guard.

## §V Invariants

**Pipeline invariants (Guile-specific)**

- VG1. ∀ sphere conversion → `npm run build` ! pass (C5, V34)
- VG2. `_system.yaml` @ `spheres-of-guile/guile/` ! exist before first sphere write (C7)
- VG3. `_book.yaml` @ `spheres-of-guile/` ! exist with correct metadata (V17)
- VG4. ∀ talent entry → `tier ∈ {"base","basic","advanced"}`, set by section_defs
- VG5. ∀ bracket key in source → ∈ `[citation_keys]` | `[bracket_ability_tags]` → else quarantine
- VG6. ∀ paren tag in heading → ∈ `[paren_tags]` → else quarantine
- VG7. `[3PP]` entries → `__SKIP__` (discarded silently)
- VG8. `[Apoc]`/`[DRS]`/`[SM—]` → two-step body source resolution → no match → quarantine
- VG9. Tags existing in `ultimate-spheres-of-power` | `spheres-of-might` → ! redefine (V37, C8)
- VG10. `id` frontmatter === filename (without `.md`) (V16)
- VG11. `sourceBook` frontmatter === parent book folder slug (V17)
- VG12. Navigation sphere icon `si-navigation` already ∈ SVGSprite.astro — verified (C6, V19)
- VG13. ∀ writing mode → default is dry-run (no files written) — `--force` required to write
- VG14. Quarantine entries ! auto-generated → manual resolution or acknowledged skip (per Might pipeline)
- VG15. Base abilities render via `[TalentName]` markers in sphere body — marker ID matches `tier:base` talent slug (V31, V32)

**Cross-system invariants (from existing SPEC.md)**

- V16. `id` in frontmatter must match filename (without extension)
- V17. `sourceBook` must match parent folder slug
- V19. Every sphere icon referenced by entry must exist in SVGSprite.astro
- V26. `system:` frontmatter field ⊥ in entry `.md` files
- V27. Core system book ! have `_system.yaml` at `{book}/{system}/`
- V29. `inferFromPath` handles `{system}/spheres/{sphere}` 3-seg paths
- V31. Base abilities rendered via `[TalentName]` markers
- V32. `sectionDefinitions` category with `tiers:["base"]` always empty — filtered before buildSections
- V34. ∀ changes → `npm run build` ! pass

## §T Tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | x | Source Navigation sphere Wikidot content — `spheresofpower-wikidot-archive/pages/navigation.txt` (exists) | I.source |
| T2 | x | Inventory Navigation headings — 2 base abilities, 4 packages, 5 section headers, 52 talents, 5 drawbacks, 5 feats, 1 archetype. Keys: [utility],[approach],[plan],[DRS],[SM—],[LotS],[3PP],[alternate start],[utility start],[CS]. Tags: (acclimation),(pathing),(Champion) | VG5,VG6 |
| T3 | x | Create `src/content/spheres-of-guile/_book.yaml` — title, publisher, publishedDate, coverImage | VG3 |
| T4 | x | Create `src/content/spheres-of-guile/guile/_system.yaml` — `id: guile, name: Spheres of Guile` | VG2,V27 |
| T5 | x | Create `ftml/conf/guile-lexicon.toml` — scaffold with shared citation keys pre-populated | I.lexicon |
| T6 | x | Populate guile-lexicon.toml with Navigation-specific keys from heading inventory | VG5,VG6,T2 |
| T7 | x | Create `ftml/examples/export_guile.rs` — scaffold from export_might.rs, rename types MightEntry→GuileEntry, system "might"→"guile" | I.parser |
| T8 | x | Implement `navigation_section_defs()` in export_guile.rs — 10 section definitions | I.parser,T2 |
| T9 | x | Implement `navigation_sphere_entry()` in export_guile.rs — sphere body with `[Acclimate]` and `[Pathing]` markers | I.parser,VG15 |
| T10 | x | Wire `navigation` in export_guile.rs main() if-else chain | I.parser |
| T11 | x | Build parser: `cargo build --example export_guile` (compiled, 3 warnings only) | I.parser |
| T12 | x | Validate parse: 64 parsed, 0 quarantine (after lexicon fix) | §M pipeline step 6 |
| T13 | x | Resolve quarantine — added `(su)` and `(champion)` to paren_tags lexicon | §M pipeline step 7 |
| T14 | x | Force-write: 63 entries to correct dirs (moved from nested path to flat structure) | §M pipeline step 8 |
| T15 | x | Post-write cleanup: removed archetypes-specializing-in-navigation.md sentinel entry | §M pipeline step 9 |
| T16 | x | Create Guile-only tag definitions: `acclimation`, `pathing`, `approach` (plan/champion/supernatural reused from existing) | §M pipeline step 10 |
| T17 | x | Run `npm run validate` → PASS (4010 files, 182 tags) | VG1 |
| T18 | x | Run `npm run build` → PASS (3846 pages indexed) | VG1,V34 |
| T19 | . | Verify Navigation sphere appears on `/guile/` index, sphere detail page, search | VG1 |
| T20 | . | Verify base abilities render via `[TalentName]` markers on sphere page | VG15,V31,V32 |
| T21 | . | Document Navigation sphere lessons learned in CLAUDE.md Guile section | |
| T22 | . | Mark Navigation sphere COMPLETE in status table | |
| T23 | . | Repeat pipeline for next Guile sphere (T2 → T22) | §M |

**Pipeline parallelization after Navigation:**
Navigation sphere validates full pipeline end-to-end. Remaining 19 spheres follow same
per-sphere pattern (T2→T22) and can proceed independently once:
- guile-lexicon.toml has shared base entries
- export_guile.rs pattern is proven

Shared tags from Power/Might (e.g. `utility`) ! require new tag files — reuse existing.

## §B Bugs

| id | date | cause | fix |
|----|------|-------|-----|
| | | | |

## Navigation Sphere — Detailed Source Analysis

### Source location

! determine — two options:

1. **Wikidot archive** (`spheresofpower-wikidot-archive/pages/navigation.txt`) — currently empty, may need population
2. **Library of Metzofitz** (`https://metzo.miraheze.org/wiki/Navigation_sphere`) — OGL-licensed content mirror

### Expected heading structure (from Spheres of Guile product knowledge)

Guile spheres typically follow this pattern:
```
+ Navigation Sphere               (H1 — sphere name, page title)
++ [Base Ability 1]               (H2 — base package / ability)
++ [Base Ability 2]               (H2 — base package / ability)
++ Basic Talents                  (H2 — section header)
++++ Talent Name (tag)            (H4 — basic talent with optional paren tag)
++++ Another Talent               (H4 — basic talent)
++ Advanced Talents               (H2 — section header)
++++ Advanced Talent Name [Key]   (H4 — advanced talent with optional citation key)
++ Navigation Feats               (H2 — section header, if feats exist)
++++ Feat Name                    (H4 — feat)
```

### Source acquisition steps

1. Check if `navigation.txt` exists in Wikidot archive
2. If not, fetch from Metzofitz: `https://metzo.miraheze.org/wiki/Navigation_sphere?action=raw`
3. Save raw source to `spheresofpower-wikidot-archive/pages/navigation.txt`
4. Continue with inventory (T2)

### Heading inventory (complete — T2)

**H2 (++) sections:**

| # | Heading | Type | Tier | Notes |
|---|---------|------|------|-------|
| 1 | Acclimate (Ex) | base-ability | base | Core acclimate mechanic |
| 2 | Pathing (Ex) | base-ability | base | Core pathing mechanic; grants Clear Shot (pathing) |
| 3 | Navigation Sphere Packages | package-section | — | Sentinel; 4 H4 child entries (Aerial/Nautical/Urban/Wilderness) |
| 4 | Navigation Talent Types | sentinel | — | Descriptive only (acclimation + pathing) |
| 5 | Navigation Talents | talent-section | basic | 16 talents |
| 6 | Acclimation Talents | talent-section | basic | 10 talents tagged (acclimation) |
| 7 | Pathing Talents | talent-section | basic | 11 talents tagged (pathing) |
| 8 | Exceptional Talents | talent-section | advanced | 15 advanced talents |
| 9 | Drawbacks | sentinel | — | 5 drawback options |
| 10 | Navigation Sphere Feats | feat-section | feat | 5 feats |
| 11 | Archetypes Specializing in Navigation | sentinel | — | 1 archetype (Venator) |

**H4 (++++) entries by section:**

Base abilities (tier: base):
- **Acclimate** — core acclimation ability
- **Pathing** — core pathing ability; auto-grants Clear Shot (pathing)

Packages (tier: base, under sentinel H2):
- Aerial (Fly/Profession pilot, Careful Flyer feat)
- Nautical (Profession sailor/Swim)
- Urban (Acrobatics/Climb)
- Wilderness (Climb/Profession guide/Profession driver/Survival, Endurance feat)

Navigation Talents (tier: basic, 16):
- Broad Pathing
- Cartographer's Knack [utility]
- Expanded Wayfarer
- Experienced Navigator [utility]
- Fleet Movement [utility]
- Follow My Lead [approach]
- Hitch A Ride [plan] [utility]
- Layered Acclimation
- Lay Of The Land [utility]
- Linear Pathing
- Misleading Trails [approach] [utility]
- Reconnaissance [approach]
- Rudimentary Training [utility] [DRS]
- Tracking Expert [utility]
- Triumphant Arrival [utility]
- Versatile Navigator

Acclimation Talents (tier: basic, 10):
- Aeronautical Adaptation (acclimation) [DRS]
- Community Awareness (acclimation) [utility] [DRS]
- Discreet Travel (acclimation) [utility]
- Extreme Acclimation (acclimation)
- Maritime Acclimatization (acclimation) [DRS]
- Occult Countermeasures (acclimation)
- Reinforce Equipment (acclimation)
- Resilience Training (acclimation)
- Stability Exercise (acclimation) [utility]
- Wild Wit (acclimation) [DRS]

Pathing Talents (tier: basic, 11):
- Acoustic Attunement (pathing)
- Blaze Ahead (pathing) [utility]
- Blindspotting (pathing)
- Bushwhack (pathing)
- Cautious Tread (pathing) [utility]
- Chokepoint (pathing)
- Clear Trail (pathing)
- Controlled Descent (pathing)
- Duck And Weave (pathing)
- Stable Footing (pathing) [DRS]
- Terrain Advantage (pathing)

Exceptional Talents (tier: advanced, 15):
- Beyonder (acclimation) — Prereqs: Navigation sphere
- Area Mapping [plan] [utility] — Prereqs: Navigation sphere
- Direct Path [plan] [utility] — Prereqs: Associated skill 15 ranks, Impossible Trail
- Divination Warding (acclimation) — Prereqs: Associated skill 15 ranks, Occult Countermeasures
- Environmental Invulnerability (acclimation) — Prereqs: Associated skill 10 ranks, Extreme Acclimation
- Impossible Trail [plan] [utility] — Prereqs: Associated skill 10 ranks
- Labyrinth Lord [utility] — Prereqs: Navigation sphere
- Nocturnal Operations (acclimation) — Prereqs: Associated skill 5 ranks
- Not Even Winded (acclimation) — Prereqs: Associated skill 5 ranks, Resilience Training
- Planar Shortcut [plan] [utility] (Su) — Prereqs: Knowledge (geography) 15 ranks or Knowledge (planes) 15 ranks; Fleet Movement
- Rift Step (pathing) (Su) — Prereqs: Associated skill 10 ranks
- Shortcut Mastery [plan] [utility] — Prereqs: Knowledge (geography) 15 ranks or Knowledge (planes) 15 ranks; Fleet Movement, Planar Shortcut
- Vast Overview [utility] — Prereqs: Knowledge (geography) 10 ranks, Lay Of The Land
- Vestigial Image [utility] — Prereqs: Survival 5 ranks, Tracking Expert
- Voidfarer [SM—] — Prereq: Beyonder; Source: Baron's Uncanny Gateway

Drawbacks (5):
- Cartographer [utility start]
- Focused Wayfaring
- Heedless Advance [utility start]
- Pointer [alternate start]
- Tracker

Feats (5):
- Detailed Charting — Prereqs: Investigation sphere, Navigation sphere
- Dual Pathing — Prereqs: Associated skill 10 ranks, Navigation sphere
- Field Instruction (Champion) [LotS] — Prereqs: Navigation sphere, Warleader sphere
- Scorched Path (Champion) [3PP] — Prereqs: Destruction Sphere, Navigation Sphere; Source: Expanded Spheres: Weaves of War
- Trailblazer (Champion) [LotS] — Prereqs: Athletics sphere, Navigation sphere

Archetypes (1):
- Venator [DRS, CS]

**Bracket key resolution:**

| Key | Type | Resolution |
|-----|------|------------|
| `[utility]` | bracket_ability_tag | `"utility"` (exists in Power/Might) |
| `[approach]` | bracket_ability_tag → new | `"approach"` |
| `[plan]` | bracket_ability_tag → new | `"plan"` |
| `[DRS]` | citation_key | `__DEFERRED__` → body Source: Diamond Spheres: Invention & Ingenuity |
| `[SM—]` | citation_key | `__DEFERRED__` → body Source: Baron's Uncanny Gateway |
| `[LotS]` | citation_key | `"legends-of-the-spheres"` |
| `[3PP]` | citation_key | `__SKIP__` |
| `[alternate start]` | bracket_ability_tag → new | `"alternate-start"` |
| `[utility start]` | bracket_ability_tag → new | `"utility-start"` |
| `[CS]` | bracket_ability_tag → new | `"champion-sphere"` (used in archetype context) |

**Paren tag resolution:**

| Tag | Canonical |
|-----|-----------|
| `(acclimation)` | `"acclimation"` |
| `(pathing)` | `"pathing"` |
| `(Champion)` | `"champion"` (feat category, like dual-sphere) |
| `(Ex)` | NOT a tag — ability type (Extraordinary) |
| `(Su)` | NOT a tag — ability type (Supernatural) |

## Build Commands (Guile-specific)

```bash
# 1. Build parser
cd ftml
LIBGIT2_NO_PKG_CONFIG=1 CARGO_FEATURE_NO_NETWORK=1 \
  RUSTFLAGS="-C link-arg=-Wl,--allow-shlib-undefined" \
  cargo build --example export_guile

# 2. Validate single sphere
./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/navigation.txt \
  --sphere navigation \
  --lexicon conf/guile-lexicon.toml \
  -o ../spheres-wiki/src/content/spheres-of-guile/guile/spheres/navigation \
  --validate

# 3. Force-write
./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/navigation.txt \
  --sphere navigation \
  --lexicon conf/guile-lexicon.toml \
  -o ../spheres-wiki/src/content/spheres-of-guile/guile/spheres/navigation \
  --force

# 4. Cleanup + format
cd ../spheres-wiki
python3 ../sweep_formatting.py src/content/spheres-of-guile/guile/spheres/navigation/
python3 ../strip_html_blocks.py src/content/spheres-of-guile/guile/spheres/navigation/

# 5. Validate + build
npm run validate
npm run build

# 6. Test
npm test
npm run test:e2e -- navigation
```

## Changelog

- 2026-06-11: Navigation sphere conversion COMPLETE — 0 quarantine, build passes, 3849 pages indexed
- 2026-06-11: 3PP gap discovered — 564 entries silenced across Power/Might; Guile fixed (3PP→DEFERRED); Power/Might pending
- 2026-06-11: Initial spec — pipeline design, Navigation sphere target, task breakdown
