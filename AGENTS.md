# Project Context
@AGENTS.md
@SPEC.md
@DESIGN.md
@FALLOW_GUIDE.md

# AGENTS.md — Spheres Wiki

Orientation for AI agents and new contributors working in this repo. This file explains **how the project is laid out and how to work in it**. For **what the project must do** — goal, constraints, interface contracts, invariants, the task backlog, and the bug log — read [`SPEC.md`](./SPEC.md), which is the source of truth. When code and SPEC.md disagree, that is a bug to reconcile.

## What this is

A fast, static reference wiki for the **Spheres** tabletop RPG system (by Drop Dead Studios), replacing the legacy Wikidot site. It is **content-first**: nearly all game data lives as markdown + yaml under `src/content/`, and the site auto-discovers it — adding a book, sphere, or talent normally requires no code changes.

The four player-facing systems are **Power**, **Might**, **Guile**, and **Champions**. Pathfinder 1e base classes (`system: "pf1e"`) exist only as carriers for sphere archetypes and never appear on system index pages.

## Tech stack

- **Astro 6.x** static site generator + **TypeScript** (no server runtime)
- **Pagefind** for client-side search (index built at deploy)
- **TomSelect** for select/dropdown UI; vanilla CSS (`src/styles/global.css`), no framework
- Self-hosted fonts via `@fontsource/cinzel` + `@fontsource/crimson-text` — **no external CDN, no analytics** (see SPEC V11/V12)
- **Bun ≥ 1.1.0**
- Deployed to **GitHub Pages** at base path `/spheres-wiki/` (`astro.config.mjs`)

> Note: `README.md` still says "Astro 4.x" — stale; the real version is 6.x per `package.json`.

## Commands

```bash
bun install            # setup
bun run dev            # dev server → http://localhost:4321
bun run build          # validate.mjs → check-base → fallow-audit → astro build → pagefind index (output: dist/)
bun run preview        # serve the production build locally
bun run validate       # content validation only (scripts/validate.mjs)
bun run fallow         # run comprehensive codebase audit (dead code, health, duplication)
bun run fallow-audit   # run build-blocking complexity/dead-code audit
bun run test           # unit tests (Vitest)
bunx astro check       # type check
```

`just` wraps the common ones: `just run` (the default) = `test → validate → build → preview`; also `just test`, `just validate`, `just build`, `just preview`. When running code, 

CI (`.github/workflows/`): `test.yml` runs Vitest + content validation on push/PR; `deploy.yml` builds and publishes to GitHub Pages on push to `main`.

## Repository layout

```
src/
  pages/              file-based routes (see SPEC §I.pages for the full route map)
  layouts/
    Base.astro          html shell: meta/OG tags, fonts, global.css, footer
    WikiPage.astro      header + sidebar + tab nav + content slot; sets Pagefind indexing scope
  components/         Astro UI components (SVGSprite, RefCard, TabNav, Sidebar, SiteHeader/Footer,
                      BetaToast, ErrataNotice, Store*, Tag*, etc.)
  lib/                pure logic + data resolution (see "Key files" below)
  config/site.ts      SYSTEMS registry — single source of truth for system metadata (SPEC V5)
  content/            all game content, auto-discovered (see "Content model" below)
  content.config.ts   Zod entry schema + collection discovery
  styles/global.css   design tokens, layout, per-system theming via --clr-ns
  assets/covers/      book cover images (.webp)
scripts/              content ETL + validators (Wikidot parsing, tag/link/v2 checks)
tests/
  lib/                Vitest unit tests
public/               static passthrough (robots.txt, etc.)
docs/                 supporting docs
```

## Content model (read this before touching content)

Books are **auto-discovered**: a folder under `src/content/` is registered as a collection iff it has both a `_book.yaml` **and** at least one `.md` entry (`content.config.ts`). No manual registration anywhere.

```
src/content/<book-slug>/
  _book.yaml          # title, publisher, publishedDate, price?, buyUrl?, coverImage?
                    # system? is a legacy field (pre-T54/T55 migration); do NOT add to new books
  spheres/<id>.md
  feats/<id>.md
  classes/<id>.md
  class-features/<id>.md
  class-traits/<class>/<id>.md
  archetypes/<id>.md
  archetype-features/<class>/<id>.md
  articles/<id>.md
  tags/<id>.md
  ...                 # entry type is inferred from the path by lib/inferFromPath.ts
```

Entry types (discriminated union on `type` in `entrySchema`): `sphere`, `talent`, `feat`, `class`, `class-feature`, `class-trait`, `article`, `archetype`, `archetype-feature`, `tag`.

Frontmatter is intentionally minimal because `inferFromPath` fills in `type`/`sphere`/`system` from the file's location. **Do not add `system:` to entry frontmatter** — it is derived from the `{book}/{system}/` directory prefix (SPEC V26, C11). Example talent at `src/content/ultimate-spheres-of-power/power/spheres/alteration/talents/my-talent.md`:

```yaml
---
id: my-talent          # lowercase kebab-case, must equal the filename (SPEC V16)
name: My Talent
# system and sphere inferred from path — do not add them here
tier: basic
tags: ["transformation", "utility"]
---
Talent body in markdown. Internal links resolve via the remarkEntryLinks plugin.
```

> **Migration note**: Power entries under `ultimate-spheres-of-power/` still carry legacy `system: power` frontmatter (T54/T55 not done). That frontmatter is honoured as an explicit override but must not be added to new content.

**Class-family entry fields:**

| Entry type | Key fields beyond base |
|---|---|
| `class` | `hitDie`, `alignment`, `startingWealth`, `skillRanks`, `classSkills`, `babProgression`, `fortSaveProgression`, `refSaveProgression`, `willSaveProgression`, `classTable` (JSON), `casterTier` (high\|mid\|low\|none) |
| `class-feature` | `className`, `level` (number or number[]), `isTraitContainer?` |
| `class-trait` | `className`, `featureId`, `requires?`, `tags` (e.g. `["extraordinary"]`) |
| `archetype` | `className`, `spheres?` (string[] for cross-referencing) |
| `archetype-feature` | `archetypeId`, `level`, `replaces?`, `alters?`, `mutuallyExclusive?` (default true), `classOverrides?`, `isAlternateClassFeature?` |

`class-traits/` files are organized per-class (e.g. `class-traits/shifter/shifter-bestial-rage.md`) and use `featureId` to link to their parent feature. `archetype-features/` follow the same per-class convention.

Special cases:
- **`__built-in__/`** — house book holding cross-sphere / system tags (`type: tag`).
- **Errata / patches** — an entry with a `modifies` field overrides another; patches apply in `publishedDate` order and must not alter the original `sourceBook` (SPEC V21–V23).
- **PF1e classes** — `system: "pf1e"`; their archetypes carry the sphere system they grant; `"Spheres {Class}"` archetype sorts first (SPEC §I.content).

Adding content the supported way:
- **New book** → create the folder + `_book.yaml` + one `.md`. Nothing else (SPEC V2).
- **New sphere in an existing system** → add the content files; it appears site-wide automatically. The only code touch allowed is one `<symbol id="si-{name}">` in `SVGSprite.astro` for its icon (SPEC C6, V3, V19).
- **New game system** → genuinely cross-cutting; touch `site.ts`, CSS, nav, pages (SPEC C7).

## Key files

| File | Responsibility |
|------|----------------|
| `src/content.config.ts` | `entrySchema` (Zod) + auto-discovery of book collections |
| `src/lib/inferFromPath.ts` | derives `type`/`sphere`/`system` from a content file's path |
| `src/lib/resolveEntries.ts` | builds `ResolvedMaps`, applies errata patches, links entries |
| `src/lib/categorize.ts` | groups a sphere's talents/feats into display sections (+ "Other") |
| `src/lib/url.ts` | base-path-aware link helper — **use `url()` for every internal link** (SPEC C2) |
| `src/lib/remarkEntryLinks.ts` | remark plugin turning entry references into links during markdown build |
| `src/lib/types.ts` | entry + `ResolvedMaps` TypeScript types |
| `src/lib/tags.ts` | `buildOrderedTagIds()` — auto-injects system tags (talent, feat, sphere, class-trait, tiers) and sorts by tag priority |
| `src/lib/renderBody.ts` | Markdown rendering pipeline (unified) + `splitBodyOnMarkers()` for base-ability extraction |
| `src/config/site.ts` | `SYSTEMS` registry: label, color, route, subtitle, etc. (single source — SPEC V4/V5) |
| `src/components/SVGSprite.astro` | every sphere icon `<symbol>` (+ `si-fallback`) |
| `scripts/class-parser.mjs` | Parses Wikidot class source → class/feature/trait `.md` files |
| `scripts/generate-bestial-traits.mjs` | Parses Shifter Bestial Trait Wikidot source → trait `.md` files |

## Conventions & gotchas

- **Internal links** must go through `url()` — hardcoded `/...` paths break under the `/spheres-wiki/` base (SPEC C2). Every nav/sidebar link must resolve to a real route; no dead links (SPEC V1/V9).
- **Interactive JS** (search init, dropdowns, toasts) must (re)bind on the `astro:page-load` event, not `DOMContentLoaded` — View Transitions swap the DOM and otherwise drop listeners (SPEC V25; this was bug B1).
- **System theming** comes from the `--clr-ns` custom property set by a `data-system` attribute — never add per-system accent blocks to `global.css` (SPEC V4/V10).
- **Placeholders**: stub dates must be `1970-01-01` and stub strings conspicuously fake (`"PLACEHOLDER"`/`"TBD"`) — never plausible-but-wrong values (SPEC §P).
- **Privacy**: no external requests, analytics, or tracking; document any `localStorage` key (name, purpose, retention, deletion path) and keep `/privacy/` accurate (SPEC V11–V14).
- **IDs** are lowercase kebab-case and must equal the filename (SPEC C10/V16).
- **Source attribution**: Never write `*Source: Book*` into markdown bodies. Source is shown via `.talent-source` label on headings (from `sourceBook` + `bookMetaMap`) and `SourceBookCallout` in sidebar. Existing `*Source:*` lines are stripped by `stripBodySource()` at render time.
- **Class trait rendering**: Traits use the `.talent-header` pattern (top row: name + source; bottom row: `TagBadge` components via `buildOrderedTagIds()`). The `class-trait` tag is auto-injected — never hardcode a label span.
- **Prerequisites**: On trait entries, `requires` frontmatter renders as `**Prerequisites:** {req}` below the heading — never inline `(requires ...)`.
- **ACFs**: Alternate Class Features are `archetype-feature` entries with `isAlternateClassFeature: true`. They use `archetypeId: {class}-alternate-class-features` (virtual — no content file).

## Scripts & content pipeline

`scripts/` holds the Wikidot import/ETL and validators — not part of the runtime site:
- `validate.mjs` (runs in `npm run build`), plus `validate-tags.mjs`, `validate-v2.mjs`, `check-links.mjs`, `purge-dead-links.mjs`
- parsers/generators: `parse-wiki.mjs`, `class-parser.mjs`, `archetype-parser.mjs`, `generate-tags.mjs`, `generate-bestial-traits.mjs`, `catalog.mjs`, `migrate-to-nested.mjs`, `download_covers.py`
- See `scripts/PARSE-WIKI.md` for the parsing workflow.

## Might sphere migration (Wikidot → Markdown)

The Spheres of Might content is migrated from Wikidot source files via a Rust parser in the sibling `ftml/` crate. The workflow is documented in `ftml/examples/CLAUDE.md` and the project spec at SPEC.md §M.

### Adding a new sphere

1. Read raw source at `../spheresofpower-wikidot-archive/pages/<sphere>.txt`
2. Inventory headings (H1 `+`, H2 `++`, H4 `++++`), bracket citation keys `[Key]`, paren tags `(tag)`
3. Add new keys to `../ftml/conf/might-lexicon.toml` — never guess book slugs; use the legal page (`legal:start.txt`) or DriveThruRPG to verify
4. Add `*_section_defs()` + `*_sphere_entry()` to `../ftml/examples/export_might.rs` and wire in `main()`
5. Build: `LIBGIT2_NO_PKG_CONFIG=1 ... cargo build --example export_might`
6. Validate: `cargo run --example export_might -- <source> --sphere <id> --lexicon ... --validate`
7. Resolve quarantine: add missing lexicon entries OR acknowledge for manual creation
8. Force-write: `--force` generates `.md` files under `src/content/<book>/might/spheres/<sphere>/`
9. Create tag definitions: `src/content/spheres-of-might/might/tags/<tag>.md` (unless tag exists in Power)
10. Run `npm run build` — must pass with 0 errors

### Post-write cleanup

- Delete `QUARANTINE-<sphere>.md` from `src/content/spheres-of-might/` (blocks Astro build)
- Delete non-talent H4 entries (e.g. `unarmed-combatants.md`, `table-practitioner-unarmed-damage.md` from unarmed spheres; `note-shields-and-shield-bonuses.md` from Shield)
- Fix auto-generated `_book.yaml` titles — auto-generator drops colons from Apocrypha titles
- Fix duplicate IDs across spheres (e.g. `smash` → `smash-brute`) — rename file and update `id` frontmatter
- Run `python3 sweep_formatting.py` and `python3 strip_html_blocks.py` against output dir

### Content routing

The parser writes entries to `{book}/might/spheres/{sphere}/` based on the resolved citation key:
- `[Key] = "book-slug"` → `src/content/book-slug/might/...`
- `[Apoc]` with body `Source:` → specific apoc book folder
- `[3PP]` (`__DEFERRED__`, changed from `__SKIP__` 2026-06-11) → resolved via body source if available; quarantined otherwise
- No citation key → `spheres-of-might/might/...` (primary book)

### Quarantine

Quarantined entries are those the parser cannot route to a book:
- `[Apoc]`/`[DRS]`/`[SM—]`/`[3PP]` without body `Source:` line
- Unknown bracket tokens not in `citation_keys` or `bracket_ability_tags`
- Unknown paren tags not in `paren_tags`

## Guile sphere migration (Wikidot → Markdown)

The Spheres of Guile content uses the same pipeline as Might: Rust parser `../ftml/examples/export_guile.rs` + `../ftml/conf/guile-lexicon.toml`. Detailed spec at `context/kits/cavekit-guile-conversion.md`.

### Adding a new sphere

1. Read raw source at `../spheresofpower-wikidot-archive/pages/<sphere>.txt`
2. Inventory headings: `grep '^++ ' source.txt` (H2 sections), `grep '^++++ ' source.txt` (H4 entries), `grep '\[.*\]'` (bracket keys), `grep '\('` (paren tags)
3. Add new keys to `../ftml/conf/guile-lexicon.toml` — citation_keys, apoc_body_sources, paren_tags, bracket_ability_tags
4. Add `<sphere>_section_defs()` + `<sphere>_sphere_entry()` to `../ftml/examples/export_guile.rs` and wire in `main()`
5. Build: `LIBGIT2_NO_PKG_CONFIG=1 ... cargo build --example export_guile`
6. Validate: `cargo run --example export_guile -- <source> --sphere <id> --lexicon ... --validate`
7. Resolve quarantine: add missing lexicon entries OR (for no-body-source 3PP) search Library of Metzofitz
8. Force-write: `--force` generates `.md` files to temp; copy to `src/content/<book>/guile/spheres/<sphere>/`
9. Create tag definitions: `src/content/spheres-of-guile/guile/tags/<tag>.md` (unless tag exists in Power/Might)
10. Run `npm run validate` → `npm run build` — must pass with 0 errors

### Critical rules (universal — applies to Might and Power too)

**Section def heading matching:** `parse_heading_line()` strips parenthetical text like `(Ex)` from parsed heading names. Section def headings must match the stripped version. Use `"##4B0092|Acclimate ##"` not `"##4B0092|Acclimate (Ex)##"`.

**Sentinel H2 sections:** Sections like "Sphere Packages" or "Drawbacks" should be sentinel H2 entries whose H4 children are the actual entries. The section heading itself must not produce an entry. Use `exclude_base` guard in `convert_sphere()`.

**Body source extraction:** `extract_body_source_title()` now searches 10 lines after heading (not 1). Some entries have prereq/benefit text before the `^^Source:` line.

**Count-match rule:** `grep -c '^++++ ' source.txt` = total H4 count. Subtract sentinel H4 entries (descriptive headings under sentinel sections). Result must equal parser's `Parsed:` count minus 1 (sphere entry). Documented at `context/kits/cavekit-guile-conversion.md` §V.

**Body-diff rule:** Original sphere intro text (between end of Wikidot boilerplate and first H2) must match generated sphere body verbatim. Excludes Wikidot markup that the parser strips.

**Tags across systems:** Tags existing in Power or Might must NOT be redefined in Guile (V37/V38). Check before creating. If a tag needs a better definition, update the existing one instead.

**Quarantine files:** `QUARANTINE-*.md` files anywhere in `src/content/` block Astro builds. Delete after resolution.

**3PP entries:** Changed from `__SKIP__` to `__DEFERRED__` in all three lexicons (2026-06-11). Entries with body sources resolve; those without need Library of Metzofitz lookup.

### Post-write cleanup

- Verify sphere `.md` entry was copied (sometimes missed due to nested path from force-write)
- Delete `QUARANTINE-<sphere>.md` from `src/content/` (blocks Astro build)
- Delete non-talent H4 entries (sentinel headings that produced entries)
- Delete nested book directories under `spheres-of-guile/guile/spheres/` (parser path quirk)
- Check for duplicate tags across systems — use existing definitions where possible

Quarantined entries are NOT auto-generated. They must be manually created in the correct book folder, or acknowledged and skipped.

## Testing

- **Unit** (`tests/lib/`, Vitest): schema/resolution/categorize/tags/url/search/etc. Run with `bun run test`.

When adding a feature or fixing a bug, prefer adding/extending a test, and run `bun run validate` to catch content-contract violations before building.

---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- fallow:setup-hooks:end -->
