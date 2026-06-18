---
name: traditions-source-map
description: Source label to book slug map for Casting Traditions conversion.
metadata:
  type: reference
  created: 2026-06-17
  last_edited: 2026-06-17
---

# Cavekit: Casting Traditions Source Map

Use this map when converting structured casting tradition entries from the legacy article tabs.
Directory placement carries source attribution, so converted files should be written under:

```text
src/content/<book-slug>/power/casting-traditions/...
```

Do not add `sourceBook:` or `system:` frontmatter to converted entries.

## Resolved Direct Labels

Bracket labels that map to a single book slug unconditionally.

| Source label | Book slug |
|---|---|
| (no label) | `ultimate-spheres-of-power` |
| `S&P` | `ultimate-spheres-of-power` |
| `SUE` | `ultimate-engineering` |
| `CrimDan` | `crimson-dancers-handbook` |
| `LG` | `arcforge-players-compendium` |
| `Arcforge Addendum` | `arcforge-players-compendium` |
| `Cata. HB` | `cataclysm-handbook` |
| `Jester's HB` | `jesters-handbook` |
| `EO3` | `expanded-options-3` |
| `EO2` | `expanded-options-2` |
| `Gravecaller's HB` | `gravecallers-handbook` |
| `Alienist HB` | `alienists-handbook` |
| `Archmagi's HB` | `archmagis-handbook` |
| `DbH` | `diabolists-handbook` |
| `BaP` | `blood-and-portents` |

## Resolved Body-Source Labels

These labels (`Apoc`, `3PP`, `SM—`, `DRS`) are publisher/category markers, not book slugs.
Each entry with one of these labels must have a `<div class="source-tag">Source: …</div>` line
in the article — use that title to look up the slug below. If no body source exists → skip entry.

| Body source title | Book slug |
|---|---|
| `Baron's Uncanny Gateway` | `barons-uncanny-gateway` |
| `Baron's Otherworldly Citadel` | `barons-otherworldly-citadel` |
| `Baron's Glorious Arena` | `barons-glorious-arena` |
| `Baron's Hallowed Archive` | `barons-hallowed-archive` |
| `Baron's Secluded Library` | `barons-secluded-library` |
| `Expanded Spheres: Baron's Lost Apocrypha` | `expanded-spheres-barons-lost-apocrypha` |
| `Arcforge Players Compendium` | `arcforge-players-compendium` |
| `Spheres Apocrypha: Cohorts and Companions` | `spheres-apocrypha-cohorts-and-companions` |
| `Spheres Apocrypha: Cohorts & Companions` | `spheres-apocrypha-cohorts-and-companions` |
| `Spheres Apocrypha: Cognition Talents` | `spheres-apocrypha-cognition-talents` |

## Known Entry Resolutions

Specific entries where source label + body source is confirmed.

| Entry | Label | Resolved book |
|---|---|---|
| Analytical Casting | `SM—` | `barons-uncanny-gateway` |
| Dreamlost Casting | `SM—` | `barons-otherworldly-citadel` |
| Madness Mantra, Variant | `SM—` | `barons-otherworldly-citadel` |
| Bonded Casting | `3PP` | `barons-glorious-arena` |
| Dedicated Wright | `3PP` | `barons-glorious-arena` |
| Benefactor | `3PP` | `expanded-spheres-barons-lost-apocrypha` |
| Ramp Up | `3PP` | `card-casting-2-counters-and-control` |
| Spell Tokens | `3PP` | `card-casting-2-counters-and-control` |
| Technical Caster | `3PP` | `barons-glorious-arena` |
| Unreliable Training | `3PP` | `barons-glorious-arena` |
| Spell Stand-In | `Apoc` | `spheres-apocrypha-cohorts-and-companions` |
| Confluent Casting (boon) | `SM—` | `barons-otherworldly-citadel` |

## Previously Missing Books (stubs now created)

`_book.yaml` stubs exist; entries can now be placed under these slugs.

| Body source title | Book slug | Notes |
|---|---|---|
| `Spheres Apocrypha: Casting Traditions` | `spheres-apocrypha-casting-traditions` | Verified: DDS, DTRPG 286411, 2019-08-20, $0.99 |
| `Spheres Apocrypha: Casting Traditions 2` | `spheres-apocrypha-casting-traditions-2` | Verified: DDS, DTRPG 286903, 2019-09-26, $0.99 |
| `Expanded Spheres: Cardcaster's Gamble` | `expanded-spheres-cardcasters-gamble` | Verified: Studio M—, DTRPG 408995, 2022-09-04, $3.00 |

Entries: Charged Spells, Expensive Locus, Madness Mantra (Casting Traditions);
Anemic, Innate Curse (Casting Traditions 2); Card Casting, Spell Gamble (Cardcaster's Gamble).

## Resolved Labels (previously unknown — user confirmed)

| Label | Book slug | Product |
|---|---|---|
| `WM` | `wild-magic` | Wild Magic (DTRPG 239904). `wild-surge.md` moved from USoP to correct location. |
| `SB:DE` | `spheres-bestiary-desert-encounters` | Spheres Bestiary: Desert Encounters (DTRPG 330751). Verified: Drop Dead Studios, 2020-10-01, $4.99. |
| `PGtS` | `players-guide-to-skybourne` | The Player's Guide to Skybourne (DTRPG 173399). Verified: Drop Dead Studios, 2016-02-19, $9.99. |
| `Mana HB` | `initiates-handbook` | The Initiate's Handbook (DTRPG 300841). Verified: Drop Dead Studios, 2020-01-17, $4.99. |

All four added to `power-lexicon.toml` citation_keys. `_book.yaml` metadata is verified for these labels.
