---
name: about-advanced-magic-conversion
description: Convert about-advanced-magic Wikidot article to spheres-wiki markdown format
metadata:
  type: project
  created: 2026-06-10
  last_edited: 2026-06-10
---

# Cavekit: Content Conversion

## Scope

Covers the conversion of the single legacy Wikidot archive page
`spheresofpower-wikidot-archive/pages/about-advanced-magic.txt` into one
spheres-wiki article content file at
`src/content/ultimate-spheres-of-power/articles/about-advanced-magic.md`.
This includes producing schema-valid frontmatter, converting Wikidot body
markup to clean markdown, and removing Wikidot-only artifacts.

## Requirements

### R1: Schema-Valid Frontmatter
**Description:** The output file begins with a YAML frontmatter block that
satisfies the `article` entry schema and SPEC V15/V16.
**Acceptance Criteria:**
- [ ] File contains a YAML frontmatter block delimited by `---` at the top.
- [ ] `id` equals `about-advanced-magic` (matches the filename per SPEC V16).
- [ ] `name` equals the string `"About Advanced Magic"`.
- [ ] `type` equals `article`.
- [ ] `system` equals `power` (legacy frontmatter accepted per SPEC V26).
- [ ] `tags` is an empty array (`[]`).
**Dependencies:** None.

### R2: Body Markup Conversion
**Description:** The Wikidot body markup is converted to clean markdown,
preserving all prose content and heading hierarchy.
**Acceptance Criteria:**
- [ ] Each `+ [[[Page Name]]]` line becomes an H2 heading (`## Page Name`)
      with the bracket/link syntax removed (no `[[[` or `]]]` remaining).
- [ ] The five advanced-magic section headings appear as H2 in source order:
      Advanced Talents, Incantations, Rituals, Spellcrafting, Wild Magic.
- [ ] The line `++ ##000000|Why so many systems?##` becomes the H3 heading
      `### Why so many systems?` with color code and `++`/`##` syntax stripped.
- [ ] The `----` line becomes a markdown horizontal rule (`---`) within the body.
- [ ] All seven prose paragraphs from the source are present verbatim in the
      body (intro, world-tone paragraph, one per section, and the closing
      "Why so many systems?" paragraph), with no text omitted or paraphrased.
**Dependencies:** R1.

### R3: Wikidot Artifact Removal
**Description:** Wikidot-specific directives that have no place in the
spheres-wiki format are removed.
**Acceptance Criteria:**
- [ ] The output contains no `title:` or `parent:` Wikidot header lines in the body.
- [ ] The output contains no `[[include sop-template]]` directive.
- [ ] The output contains no residual Wikidot triple-bracket link syntax (`[[[`/`]]]`)
      or color-code syntax (`##......|...##`).
**Dependencies:** R2.

## Out of Scope

- Creating linked target pages for Advanced Talents, Incantations, Rituals,
  Spellcrafting, or Wild Magic (those headings are plain text, not links).
- Converting any other archive page.
- Migrating `system: power` to a new frontmatter scheme (deferred to T54/T55).
- Adding navigation, sidebar, or wiki-note content not present in the source.
- Restructuring or rewriting the source prose for style.

## Cross-References

- See also: cavekit-overview.md
