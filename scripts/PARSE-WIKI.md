# parse-wiki.mjs — Wikidot Sphere Parser

## Overview

`scripts/parse-wiki.mjs` converts raw Wikidot sphere pages into Markdown content files with YAML frontmatter. It is the primary ingestion tool for sphere content (talents, feats, drawbacks) sourced from the Spheres of Power/Might/Guile community wiki.

The parser handles:
- Wikidot markup (`[[div]]`, `[[tabview]]`, `||~ table ||`, `//italic//`, `[[[wikilinks]]]`, `^^superscripts^^`)
- Source routing — assigning each entry to the correct `src/content/<book-slug>/` directory based on bracket keys in headings or inline source attribution lines
- Tag extraction from parenthetical and bracket annotations in H4 headings
- Dual-sphere feat detection from prerequisites text
- Stub skipping for cross-reference entries
- Duplicate suppression within one parse run

The parser does **not** write to the filesystem in test/import contexts — it exports all its logic as named functions, and the CLI entry point (`isMain` guard) only runs when the script is executed directly.

---

## Quick Start

```sh
# Add raw wiki file to repo root
node scripts/parse-wiki.mjs <sphere> --dry-run    # preview (default)
node scripts/parse-wiki.mjs <sphere> --write       # write new files only
node scripts/parse-wiki.mjs <sphere> --validate    # compare against existing
node scripts/parse-wiki.mjs <sphere> --force       # overwrite all
```

Example:

```sh
node scripts/parse-wiki.mjs blood --dry-run
node scripts/parse-wiki.mjs alteration --write
node scripts/parse-wiki.mjs alteration --validate
```

---

## Input Format

The parser expects a Wikidot page source saved to a file at the repo root (e.g. `blood-raw.wiki`). The relevant markup:

### Structural wrappers (ignored/transparent)

```
[[tabview]]
[[tab Name]]
...
[[/tab]]
[[/tabview]]
```

These are skipped entirely. Only content inside `[[div]]..[[/div]]` blocks is treated as entry bodies.

### Section headings (drive tier/type context)

```
+ H1 Heading
++ H2 Heading — e.g. "Blood Sphere Talents", "Advanced Blood Talents", "Blood Sphere Feats"
+++ H3 Heading — e.g. "Body Talents", "Transformation Talents", "Drawbacks"
```

When a section heading is encountered outside a `[[div]]` block, `parseSectionContext` updates the current section context. All subsequent entries inherit that context until another heading changes it.

### Entry headings (H4, inside [[div]])

```
++++ Entry Name [SourceKey] (paren, tags)
```

- `[SourceKey]` — either a source routing key (`[BaP]`, `[DRS]`) or an ability-type tag (`[instill]`, `[mass]`)
- `(paren tags)` — comma-separated parenthetical markers: `(quicken, still)`, `(Combat)`, `(Dual Sphere)`, `(blood art)`
- Multiple `[brackets]` and multiple `(paren)` groups are all parsed

### Body source attribution line

```
^^**Source:** Spheres Apocrypha: Debilitating Talents 2^^
^^Source: [[[some-page|Some Book]]]^^
```

Full-line `^^...^^` content is stripped from the body. When the heading source key is mapped to `null` in `headingSourceMap`, this line is used to look up the book slug via `bodySourceMap`.

### Tables

```
||~ Column A ||~ Column B ||
|| value 1   || value 2   ||
```

Converted to standard Markdown tables with a separator row after the header.

### Other markup

| Wikidot | Markdown |
|---|---|
| `//italic//` | `*italic*` |
| `* bullet` | `- bullet` |
| `----` | `---` |
| `[[[page name]]]` | `page name` |
| `[[[Display\|url]]]` | `Display` |
| `^^inline ref^^` | (stripped) |
| `[[image ...]]` | (line skipped) |

---

## Pipeline Walkthrough

Given this raw entry block:

```
[[div style="..."]]
++++ Puppet's Curse [BaP]
^^**Source:** Blood and Portents^^
You curse a creature within //close range//.

* The creature takes damage.
* It may attempt a Will save.
[[/div]]
```

**Step 1 — Section detection.** Before this div, `++ Blood Sphere Talents` was seen. `parseSectionContext` set `{ type: 'talent', tier: 'basic', sectionTags: [] }`.

**Step 2 — Div buffering.** Lines between `[[div]]` and `[[/div]]` are collected.

**Step 3 — Heading parse.** `parseHeading("++++ Puppet's Curse [BaP]", ctx, config)` runs:
- Curly apostrophe normalized: `Puppet's Curse`
- `[BaP]` matched in `headingSourceMap` → `sourceKey = 'BaP'`
- `name = "Puppet's Curse"`, `tags = []`, `type = 'talent'`, `tier = 'basic'`

**Step 4 — Body extraction.** The `^^Source:^^` line is pulled out (sets `bodySource`), the rest becomes the body text.

**Step 5 — Body cleaning.** `cleanBody` runs on the remaining lines:
- `//close range//` → `*close range*`
- `* The creature...` → `- The creature...`
- Blank line inserted before bullet list
- Smart quotes normalized

**Step 6 — Source resolution.** `resolveSourceBook('BaP', bodySource, config)` looks up `'BaP'` in `headingSourceMap` → `'blood-and-portents'`.

**Step 7 — Deduplication.** `kebab("Puppet's Curse")` → `'puppets-curse'`. If already seen, skip.

**Step 8 — Result.** Entry object:

```js
{
  name: "Puppet's Curse",
  tags: [],
  type: 'talent',
  tier: 'basic',
  bookSlug: 'blood-and-portents',
  body: 'You curse a creature within *close range*.\n\n- The creature takes damage.\n- It may attempt a Will save.',
  dualSphere: null,
}
```

**Step 9 — Rendering.** `renderTalent` produces the `.md` file with YAML frontmatter and body.

---

## Configuration Reference

### SPHERE_CONFIGS

Each key is a sphere name (used as the CLI argument). Fields:

| Field | Type | Description |
|---|---|---|
| `inputFile` | string | Filename of the raw wiki source in the repo root (e.g. `blood-raw.wiki`) |
| `sphere` | string | Sphere identifier, written into the frontmatter `sphere:` field |
| `system` | string | `'power'`, `'might'`, `'guile'`, or `'champions'` |
| `primaryBook` | string | Default book slug when no source key is present (e.g. `'spheres-of-power-core'`) |
| `headingSourceMap` | object | Maps `[BracketKey]` strings in headings to book slugs. A value of `null` means: resolve from the body source line instead |
| `bodySourceMap` | object | Maps substrings of `^^Source: Book Name^^` body lines to book slugs. Used when `headingSourceMap` value is `null` |

Example:

```js
blood: {
  inputFile: 'blood-raw.wiki',
  sphere: 'blood',
  system: 'power',
  primaryBook: 'spheres-of-power-core',
  headingSourceMap: {
    'BaP':         'blood-and-portents',
    'CrimDan':     'crimson-dancers-handbook',
    "Jester's HB": 'jesters-handbook',
    'Apoc':        null,   // resolve from ^^Source:^^ body line
    'DbH':         'damnation-by-hunger',
  },
  bodySourceMap: {
    'Spheres Apocrypha: Debilitating Talents 2': 'spheres-apocrypha-debilitating-talents-2',
  },
},
```

### BRACKET_TAGS

A `Set` of lowercase strings that appear as `[tag]` in entry headings and are **ability-type tags**, not source routing keys. When a bracket item matches a value in this set, it is added to the entry's `tags` array rather than used as a source key.

Current values: `instill`, `mass`, `utility`, `range`, `strike`, `body`, `transformation`

**Distinction from source keys:** Source keys are publisher abbreviations (`BaP`, `DRS`, `CrimDan`) that route the entry to a specific book folder. Ability-type tags describe what kind of ability the entry is. If the same `[X]` appears across many entries and corresponds to a publisher, it's a source key — add it to `headingSourceMap`. If it describes an ability's mechanical category and entries with it still come from the primary book, it's an ability tag — add it to `BRACKET_TAGS`.

### PAREN_TAG_MAP

Maps lowercase parenthetical content (from `(paren)` in headings) to frontmatter tag values. Comma-separated groups like `(quicken, still)` are split and each part is looked up individually.

| Heading paren | Frontmatter tag |
|---|---|
| `body` | `body` |
| `transformation` | `transformation` |
| `utility` | `utility` |
| `instill` | `instill` |
| `mass` | `mass` |
| `range` | `range` |
| `strike` | `strike` |
| `quicken` | `quicken` |
| `still` | `still` |
| `blood art` | `blood-art` |

Special parens `(Dual Sphere)` and `(Combat)` are handled separately: they set `type = 'feat'` and add `dual-sphere` or `combat` to tags.

### KNOWN_SPHERES

A `Set` of lowercase sphere names used by `extractDualSphere` to identify valid sphere names in prerequisites text. When parsing `**Prerequisites:** Alteration sphere, Death sphere.` for an alteration entry, only names present in `KNOWN_SPHERES` (and not equal to the primary sphere) are returned as the `dualSphere`.

Current values: `alteration`, `blood`, `conjuration`, `creation`, `dark`, `death`, `destruction`, `divination`, `enhancement`, `fate`, `illusion`, `life`, `light`, `mana`, `mind`, `nature`, `protection`, `telekinesis`, `time`, `war`, `warp`, `weather`.

---

## Adding a New Sphere

### 1. Obtain raw wiki source

Copy the page source from the Wikidot sphere page (use the "Edit" view to get raw markup), then save it to the repo root:

```sh
# e.g. for the Enhancement sphere:
# Save as enhancement-raw.wiki in the repo root
```

### 2. Survey source keys

```sh
grep '^++++ ' enhancement-raw.wiki | grep '\[' | sed 's/.*\[/[/' | sort -u
```

This shows all `[BracketKeys]` used in headings. Identify which are publisher abbreviations vs. ability-type tags.

### 3. Survey paren tags

```sh
grep '^++++ ' enhancement-raw.wiki | grep '(' | sed 's/.*(\([^)]*\)).*/(\1)/' | sort -u
```

Check for new `(paren)` values not already in `PAREN_TAG_MAP`.

### 4. Map source keys to book directories

Check `ls src/content/` for existing book slugs. For new books, create a minimal `_book.yaml`:

```yaml
# src/content/<new-book-slug>/_book.yaml
title: "Book Title"
publishedDate: "1970-01-01"
```

Use `publishedDate: "1970-01-01"` as a placeholder stub until the real date is known.

### 5. Add config to SPHERE_CONFIGS

```js
enhancement: {
  inputFile: 'enhancement-raw.wiki',
  sphere: 'enhancement',
  system: 'power',
  primaryBook: 'spheres-of-power-core',
  headingSourceMap: {
    'SA:SotM': 'spheres-apocrypha-sidhe-of-the-moon',
    '3PP': null,
  },
  bodySourceMap: {
    'Some Apocrypha Title': 'some-apocrypha-slug',
  },
},
```

### 6. Add new paren tags to PAREN_TAG_MAP

Only add tags that should appear in frontmatter. Structural parens like `(Combat)` and `(Dual Sphere)` are already handled.

### 7. Add new bracket ability tags to BRACKET_TAGS

Only if they are NOT source routing keys (see the distinction above).

### 8. Run --dry-run and verify

```sh
node scripts/parse-wiki.mjs enhancement --dry-run 2>&1 | head -100
```

Check that:
- Source keys route to the correct `bookSlug`
- Tags look correct
- Names are clean (no leftover brackets or parens)

### 9. Run --write

```sh
node scripts/parse-wiki.mjs enhancement --write
```

### 10. Create the sphere entry .md

Create `src/pages/<system>/spheres/<sphere>.md` (or the equivalent path for the system) with `sectionDefinitions`. See the Alteration or Blood sphere entries for examples.

### 11. Run the build to verify

```sh
npm run build
```

---

## Identifying Source Keys vs. Ability Tags

Bracket items `[X]` in headings can be either:

**Source keys** — Publisher abbreviations that route the entry to a specific book folder. Examples: `[BaP]` (Blood and Portents), `[CrimDan]` (Crimson Dancer's Handbook), `[DRS]` (Diamond Ring Spheres). These go in `headingSourceMap`.

**Ability-type tags** — Mechanical categories that appear in frontmatter `tags`. Examples: `[instill]`, `[mass]`, `[strike]`, `[range]`. These go in `BRACKET_TAGS`.

**Rule of thumb:** If the same `[X]` appears on entries that otherwise come from the primary book (no separate book attribution), and it describes a mechanical category, it is an ability tag. If it maps to a different publisher/product that has its own `src/content/` directory, it is a source key.

When an unknown `[X]` is encountered at runtime, the parser emits a `[WARN] Unknown source` message and assigns `unknown-source`. Use `--dry-run` output to identify and classify all bracket keys before running `--write`.

---

## Validation and Diff Classification

After running `--write`, run `--validate` to compare parser output against committed files:

```sh
node scripts/parse-wiki.mjs alteration --validate
```

Diff categories encountered during alteration sphere validation:

| Category | Description | Fixable in parser? |
|---|---|---|
| NAME-QUOTE | Smart apostrophe in entry name | Fixed — `normalizeQuotes` applied to all names |
| SPECIAL-ITALIC | Inline `**Special:**` in bullet → `*Special:*` | Fixed — context-aware detection |
| STUB-SKIP | "See General Feats" cross-reference entries | Fixed — skipped automatically |
| CONTENT-TYPO | Typos corrected in manually-converted file | No — accept diff |
| EXAMPLE-REMOVED | Example sentences removed from existing file | No — accept diff |
| PARENTHETICAL-REMOVED | Clarifying parentheticals stripped | No — accept diff |
| TEXT-REORDERED | Description moved relative to Prerequisites | No — accept diff |
| FOOTNOTE | `¹` superscript character + footnote paragraph | Partially — not yet implemented |
| BOLD-TO-BULLET | `**Term**. desc` → `- Term. desc` conversion | Not generalizable |

When a diff is classified as "accept diff", the existing file in the repo is the authoritative version and differs intentionally from the raw wiki source. Do not re-run `--write` or `--force` on already-converted spheres.

---

## Known Limitations

- **Nested `[[div]]` blocks** — Not supported. The outer div wins; inner divs are buffered as body text.
- **`+++++ H5` headings** — Ignored. These are typically author notes or sub-sections within an entry. This is correct behavior.
- **Description before Prerequisites** — Some manually-converted files moved the entry description after the Prerequisites line. The parser preserves the original order. Accept as diff.
- **Footnote characters** — `¹`, `²` superscript characters and their corresponding footnote paragraphs are not detected or linked.
- **`bodySourceMap` substring matching** — Matching is substring-based. If two book titles share a common substring, the first match in iteration order wins. Keep `bodySourceMap` keys specific enough to avoid ambiguity.

---

## Running Tests

```sh
node --test scripts/parse-wiki.test.mjs
```

Tests use Node.js built-in `node:test` and `node:assert/strict`. No external dependencies. The test file imports from `./parse-wiki.mjs` using named exports and does not touch the filesystem.

Two `[WARN] Unknown source` lines appear in test output — these are expected and come from `resolveSourceBook` tests that exercise the warning path. They are not test failures.
