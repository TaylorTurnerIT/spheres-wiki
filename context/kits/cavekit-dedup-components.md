---
name: dedup-components
description: Extraction of four shared rendering components (progression table, trait catalog, class-feature block, archetype swapper) plus a tag-badge audit, so duplicated inline rendering patterns become a single reusable source of truth
metadata:
  type: project
  created: "2026-06-12"
  last_edited: "2026-06-12"
---

# Cavekit: Deduplication Components

## Scope

Covers the extraction of four shared rendering patterns that currently appear
inline and duplicated across the system class pages, plus an audit ensuring tag
display always reuses the existing tag-badge component. Each extracted component
must accept well-defined inputs, produce identical rendered output to the current
inline version, and preserve all current interaction behavior and visual fidelity.

This kit defines WHAT each component accepts, renders, and does. It does not
prescribe a component framework, file layout, or language. The acceptance
criteria are written to permit a blind reimplementation with no loss of
functionality or visual fidelity.

Related SPEC invariants: V49 (shared-pattern extraction), V50 (JS-injected CSS
must be global), V51 (tag rendering reuse), V52 (in-place DOM mutation).

## Requirements

### R1: ClassProgressionTable

**Description:** A server-rendered 20-level class progression table that displays
class level, base attack bonus, three saves, a special-features column, optional
caster columns, and any class-defined extra columns. No client interactivity of
its own; it is the target of later archetype mutation.

**Accepts:**
- A class record exposing: base-attack progression, three save progressions
  (fortitude, reflex, will), a caster tier, and a class-table object carrying
  extra column headers, a per-level special-text source map, and per-level extra
  cell data.
- A per-level feature index mapping each level (1–20) to an ordered list of
  features, where each feature exposes a display name and a stable anchor id.
- A precomputed array of rows, each row exposing its ordered cell strings and its
  level number.

**Renders / Computation:**
- A heading element with anchor id `class-table`, the visible text "Class Table"
  or equivalent class-table label.
- One row per class level 1 through 20, in ascending level order.
- Base attack bonus per row:
  - full progression = level
  - three-quarter progression = floor(level × 0.75)
  - half progression = floor(level × 0.5)
  - formatted as iterative attacks "+N/+N-5/+N-10/..." descending by 5 until the
    value would be 0 or below; a value of 0 renders as "+0".
- Each save per row:
  - good save = 2 + floor(level / 2)
  - poor save = floor(level / 3)
  - formatted as "+N".
- Special column per row:
  - comma-separated links to each feature at that level, each link pointing to the
    feature's in-page anchor and showing the feature name;
  - if no features at that level, falls back to the class-table special-source text
    for that level;
  - if neither exists, shows an em dash "—".
- Caster columns appear only when the class has casting (caster tier is high, mid,
  or low). When present, three columns appear: Caster Level, Magic Talents, Spell
  Pool.
  - Caster Level: high = level; mid = the mid caster-level value for that level; low
    = the low caster-level value for that level. The mid and low values follow the
    fixed published 20-entry tables (mid: 0,1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15;
    low: 0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10), indexed by (level − 1).
  - Magic Talents: raw value is high = level + 2; mid = floor(3 × level / 4) + 2;
    low = floor(level / 2) + 2. The displayed value is raw − 2. At level 1 the
    displayed cell carries a "(+2)" tooltip footnote.
  - Spell Pool: displayed as "N + CAM" with an explanatory tooltip.
- Extra columns: one column per entry in the class-table extra headers, with each
  row's cell taken from the class-table extra row data for that level.

**Visual fidelity (must match current output):**
- Outer wrapper: vertical margin of 2rem, horizontal overflow scrollable with
  touch momentum scrolling.
- Heading: display font, large font size, bold, active-color text, bottom border
  1px in the border color.
- Table frame: 8px rounded corners, 1px border in border color, clipped overflow.
- Table: full width, collapsed borders, small font size, surface background.
- Header row background: active color mixed 15% into surface.
- Header cells: display font, bold, left-aligned, 0.6rem/0.75rem padding, 2px
  bottom border in border color, active-color text, 0.85em size, 0.02em letter
  spacing. Header cells wrap (normal white-space, break long words) and the table
  wrapper has a slim custom scrollbar (SPEC V44).
- Body cells: 0.4rem/0.75rem padding, 1px bottom border in border color, 1px right
  border at 60% border color, non-wrapping by default.
- Even rows: background active color mixed 5% into transparent.
- Row hover: background active color mixed 12% into transparent.
- First column (level): bold, active-color text.
- Sixth column (Special): wrapping text, minimum width 200px, maximum width 400px.
- Feature links in the Special column carry the table-feature-link styling class.
- Tooltip spans carry the tooltip class: muted color, dotted underline, help
  cursor, and a CSS popup driven by a data-tooltip attribute.

**Acceptance Criteria:**
- [ ] All three system class pages render their progression table through this one
      component; no page contains an inline copy of the table markup or the BAB,
      save, caster-level, magic-talent, or spell-pool formulas.
- [ ] For a full-BAB level-20 class, the BAB cell reads "+20/+15/+10/+5".
- [ ] For a three-quarter-BAB level-11 class, the BAB cell reads "+8/+3".
- [ ] For a half-BAB level-1 class, the BAB cell reads "+0".
- [ ] A good save at level 10 reads "+7"; a poor save at level 10 reads "+3".
- [ ] A mid-caster level-13 row shows Caster Level 9; a low-caster level-13 row shows
      Caster Level 6.
- [ ] A high-caster level-5 row shows displayed Magic Talents 5 (raw 7 minus 2).
- [ ] The level-1 Magic Talents cell carries a "(+2)" tooltip footnote.
- [ ] The Special cell for a level with two features shows two comma-separated anchor
      links; a level with no features and no special-source text shows "—".
- [ ] Caster columns are absent when caster tier is none and present when high, mid,
      or low.
- [ ] Extra columns appear once per class-table extra header, populated from the
      class-table extra row data.
- [ ] Rendered DOM structure, class names, and computed styling for a given class
      are byte-for-byte equivalent to the prior inline version (verified by snapshot
      or visual diff).

**Dependencies:** Consumes the same class data model used by the class route
(cavekit-dedup-routes.md R6). Output is later mutated by R4 (ArchetypeSwapper).

### R2: TraitCatalogSection

**Description:** A collapsible catalog attached to a "container" class feature
(a feature flagged as a trait container, e.g. a ventures pool), listing many
related class traits behind a single toggle.

**Accepts:**
- A container feature exposing its name and stable id, flagged as a trait container.
- An ordered list of catalog entries, each exposing a trait record (id, name,
  optional prerequisites), the trait's rendered content, and its source book title.
- The tag map and book metadata map needed to render tag badges.
- The active system identifier and the owning class name, needed to build trait links.

**Renders:**
- A toggle button whose text is the container feature name followed by a chevron
  (▾), with `aria-expanded="false"` and `aria-controls` pointing at the catalog
  wrapper id `{featureId}-traits`.
- A catalog wrapper, collapsed by default, containing one entry per trait.
- Each entry: a link to `/{system}/classes/{className}/traits/{traitId}/`, a source
  badge, the trait's tag badges, and (if present) the trait prerequisites.

**Behavior:**
- Clicking the toggle: flips `aria-expanded`, toggles the collapsed class on the
  button, toggles the open class on the wrapper, and dispatches a bubbling custom
  event named `class-feature-collapse` whose detail carries the feature id and the
  new collapsed boolean.
- The catalog is hidden by default and animates open via the grid-rows technique
  (0fr to 1fr).

**Visual fidelity:**
- Toggle button: full width, no border, muted color, display font, uppercase,
  extra-small size, with leading and trailing pseudo-element rules forming
  horizontal lines that flank the text.
- Toggle hover: brand color text; flanking lines take brand color.
- Collapsed state: chevron rotated −90 degrees.
- Catalog wrapper: grid-rows transition 0fr to 1fr over 0.25s.
- Open catalog background: active color mixed 4% into surface.
- Entry: padding 0.75rem 1rem 0.75rem 0.75rem; 3px left border in active color;
  1px top border in active color mixed 15% into transparent.
- Trait link uses the talent-name class; source uses the talent-source class;
  prerequisites use the trait-catalog-requires class.

**Acceptance Criteria:**
- [ ] A container feature renders exactly one toggle button and one catalog wrapper;
      no inline copy of this markup exists on any page.
- [ ] The catalog wrapper id equals `{featureId}-traits` and the button's
      `aria-controls` references it.
- [ ] On initial render `aria-expanded` is "false" and the catalog is visually
      collapsed.
- [ ] Clicking the toggle sets `aria-expanded` to "true", reveals the catalog, and
      emits one `class-feature-collapse` event carrying the feature id and
      `collapsed: false`.
- [ ] Each entry links to `/{system}/classes/{className}/traits/{traitId}/` using the
      system from the registry (cavekit-dedup-routes.md R1).
- [ ] Tags render through the shared tag-badge component (R5), not inline.
- [ ] Rendered markup, class names, and styling match the prior inline version.

**Dependencies:** R5 (TagBadge). Toggle rebinding is re-applied by R4 after DOM
mutation. Link generation depends on the system registry (cavekit-dedup-routes.md R1).

### R3: ClassFeatureBlock

**Description:** A single, server-rendered class-feature card with no dynamic
behavior of its own. Renders the feature heading, optional description content,
and any non-container traits attached directly to the feature (inline trait style).

**Accepts:**
- A feature record exposing id, name, level, and source book title.
- The feature's rendered content (may be absent).
- A list of non-container traits attached directly to the feature, each with its
  tag badges and prerequisites (container traits are handled by R2, not here).
- The tag map and book metadata map for tag-badge rendering.

**Renders (non-container feature):**
- An outer card with the class-feature class, id equal to the feature id, and a
  data-level attribute carrying the JSON-encoded feature level. The card itself has
  no border; it has top margin 2rem and relative positioning.
- A heading with the class-feature-heading class containing an outer span with the
  feature name, a separator span (the class-feature-sep, a "|"), and a level span
  (the class-feature-level showing the level label); plus, when a source book title
  exists, a trailing span with the talent-source class.
- When content exists, a description region with the entry-description class
  containing the rendered content.
- One inline trait block per directly-attached non-container trait.

**Inline trait block:**
- Uses the class-trait class: top margin 1rem, padding 0.75rem 1rem, 3px left
  border in active color, background active color mixed 3% into transparent,
  rounded 0/6px/6px/0 corners.
- Header follows the talent design pattern (SPEC V41): a talent-header with a
  talent-header-top (name + source) and a talent-header-bottom (tag badges).
- Trait name uses talent-name; source uses talent-source; prerequisites use
  trait-prerequisites and render on their own line (SPEC V43), never inline next to
  the name.

**Heading visual:**
- Display font, large size, bold, active-color text, 0.02em letter spacing, 0.4em
  bottom margin, 0.25em bottom padding, 1px bottom border in border color.
- Flex layout: space-between justification, center alignment, wrapping, 0.5rem gap.
- Level span: 0.75em size, weight 600, opacity 0.75, zero letter spacing.
- Separator span: muted color, full opacity, weight 400.

**Acceptance Criteria:**
- [ ] Every class-feature card on every class page renders through this component;
      no page contains inline class-feature card markup.
- [ ] The card's id equals the feature id and its data-level attribute equals the
      JSON-encoded feature level (this exact attribute is required by R4's
      chronological insertion and reset logic).
- [ ] The heading contains a name span, a "|" separator span, and a level span in
      that order; a source span appears only when a source book title exists.
- [ ] The description region appears only when content exists.
- [ ] Directly-attached non-container traits render as inline trait blocks following
      the talent-header pattern; prerequisites appear on their own line.
- [ ] Container traits are not rendered here (they go through R2).
- [ ] Tags render through the shared tag-badge component (R5).
- [ ] The card has no border and uses top margin 2rem with relative positioning.
- [ ] Rendered markup, class names, and styling match the prior inline version.

**Dependencies:** R5 (TagBadge). Cards produced here are the mutation targets for
R4 (which reads the id and data-level, and stores/reads original HTML).

### R4: ArchetypeSwapper

**Description:** A multi-select archetype selector plus the client-side hot-swap
engine that mutates the rendered class page in place when archetypes are selected.
Selections persist in the URL and restore on load. All DOM changes mutate existing
elements in place rather than replacing innerHTML on elements carrying
framework-scoped CSS class names (SPEC V52), so scoped styling continues to apply.

**Accepts:**
- A list of selectable archetypes for the class, each with id, title, and a short
  description.
- Embedded per-archetype-feature templates in the page: one template element per
  archetype feature, each carrying dataset attributes for feature id, name,
  archetype id, JSON level, JSON replaces array, JSON alters array, JSON
  mutually-exclusive boolean, and JSON class-overrides object; each template's inner
  rendered-content region holds the feature's rendered HTML.

**Selector UI:**
- A multi-select dropdown with a remove-button affordance on chosen tags, closing
  after each select, placeholder "Select Archetypes...".
- Each option renders a title plus a description (first 150 characters of the
  archetype body text, or "Replaces: X" for alternate-class-feature archetypes).
- On change: writes `?archetypes=id1,id2` to the URL via history push, runs the
  update flow, and disables options that are incompatible with the current
  selection.
- On load: reads the `archetypes` query param and restores the selection (SPEC V47).
- On the view-transition before-swap event: tears down the selector instance so it
  can be cleanly re-initialized.

**Compatibility rule:** Two archetypes are incompatible if any of the following
holds AND at least one of the two is mutually exclusive:
1. both replace the same base feature; or
2. one replaces and one alters the same base feature; or
3. both alter the same base feature.
Incompatible options are disabled in the selector and shown at opacity 0.4 with a
not-allowed cursor and no pointer events.

**Update flow (each archetype selection change):**
1. Reset every class-feature card to its stored original HTML.
2. Reset every class-info override element (ids beginning class-val-).
3. Remove all dynamically-inserted archetype-feature cards.
4. Reset the progression table to its stored original HTML.
5. Reset the table-of-contents list to its stored original HTML.
6. Hide the warning banner.
7. Select the active archetype features (those whose archetype id is in the chosen
   set).
8. Build maps of replaced-by, altered-by, and overridden-by relationships.
9. Detect conflicts; if any exist, show the warning banner and abort the rest of
   the flow.
10. For each active archetype feature:
    a. Replacement (replaces is non-empty): take the primary replaced card as the
       target; change its id to the archetype feature id and add the
       archetype-variant card class; mutate the heading in place (update the first
       text node of the outer span to the archetype feature name, update the level
       span text to the displayed level, convert the existing source span into an
       archetype badge or append a new archetype badge); remove prior annotation and
       modification blocks; insert a "replaces" annotation paragraph before the
       description region reading "{archetypeName} Replaces: {replacedName}"; set the
       description region's inner HTML to the archetype feature HTML; hide any
       additional replaced cards (the second and later replaced ids).
    b. Alteration (alters is non-empty): for each altered base id, add the altered
       class to the base card and append a modification block containing an "alters"
       annotation paragraph reading "{archetypeName} Modifies" and a modification
       body holding the archetype feature HTML.
    c. Purely new (no replaces and no alters): create a new dynamic
       archetype-feature card (dynamic + archetype-variant classes) with a heading
       reading "{name} ({displayedLevel})" plus an archetype badge, inserted in
       level order among the existing base cards by data-level.
11. Apply class-property overrides: update the matching class-val elements with
    styled override text.
12. Update the progression table Special column by editing text nodes only: wrap a
    replaced feature name in the table-archetype-feature span with a tooltip; append
    a table-altered-badge span reading "({archetypeName} Altered)" after an altered
    feature name.
13. Update the table-of-contents list: for replaced items, update the link text and
    point its href at the new feature id; for altered items, append a toc-altered
    badge reading "(Altered)".
14. Rebind the trait-catalog toggle handlers (R2) after the DOM mutations.

**Selector visual fidelity:**
- Control: 8px rounded, border in border color, page background, body font,
  0.5rem/0.75rem padding. Multi control is a non-wrapping flex row with horizontal
  overflow scroll and no visible scrollbar.
- Selected tag: background active color mixed 12%, active-color text, 99px radius,
  display font, bold, 2px/6px/2px/10px padding.
- Dropdown: 8px rounded, border color, page background, shadow.
- Option hover: background active color mixed 8%.
- Disabled option: opacity 0.4, not-allowed cursor, no pointer events.

**Warning banner:** hidden by default; on conflict shows a 4px left border in
#ef4444, background rgba(239,68,68,0.1), #ef4444 text, padding 0.75rem 1rem, 4px
radius, small size, display font, content "⚠️ {conflictMessage}".

**Animations:** replaced and new features fade in (opacity 0 + 8px downward offset
to opacity 1 + 0, 0.4s ease); modification blocks slide down (opacity 0 + 4px
upward offset to opacity 1 + 0, 0.3s ease).

**Globally-scoped JS-injected classes (SPEC V50):** the following classes are
applied by client-side script to DOM that lacks framework scope attributes and must
therefore be declared with global scope so the styles apply:
- archetype badge: 0.65em, display font, background active color mixed 15%,
  active-color text, 0.15rem/0.5rem padding, 4px radius, 1px border in active color
  mixed 35%, uppercase, 0.05em letter spacing, bold.
- archetype annotation: display font, extra-small size, 0.02em letter spacing,
  margin 0.15em top / 0.65rem bottom, line-height 1.3.
- replaces annotation variant: active-color text. alters annotation variant:
  brand-color text.
- modification block: top margin 1.5rem, top padding 1rem, 1px top border in border
  color, slide-down animation. modification body: medium size.
- table archetype feature: background active color mixed 15%, active-color text,
  0.1rem/0.35rem padding, 4px radius, bold, 0.9em, 1px bottom border in active color.
- table altered badge: 0.75em, brand-color text, background brand color mixed 10%,
  0/3px padding, 3px radius, bold.
- toc archetype text: active-color text, bold, 0.95em, background active color mixed
  12%, 1px/4px padding, 4px radius.
- toc altered badge: 0.7em, brand-color text, italic, opacity 0.85.

**Acceptance Criteria:**
- [ ] Exactly one selector component drives archetype selection on all class pages;
      no page reimplements the selector or the swap engine inline.
- [ ] Selecting one or more archetypes writes `?archetypes=id1,id2` to the URL; a
      page loaded with that param restores the same selection.
- [ ] Selecting an archetype that replaces a base feature changes that base card's
      id to the archetype feature id, adds the archetype-variant class, shows a
      "{archetypeName} Replaces: {replacedName}" annotation, and replaces the
      description content with the archetype feature content.
- [ ] Selecting an archetype that alters a base feature leaves the base card present,
      adds the altered class, and appends a modification block with a
      "{archetypeName} Modifies" annotation.
- [ ] Selecting a purely-new archetype feature inserts a new card in correct level
      order among existing cards, with an archetype badge in its heading.
- [ ] Selecting two incompatible archetypes (per the compatibility rule) shows the
      warning banner and applies no mutations.
- [ ] Incompatible options are disabled and styled at opacity 0.4 with a not-allowed
      cursor.
- [ ] Deselecting all archetypes restores every card, the table, and the table of
      contents to their stored original HTML.
- [ ] The Special column and table of contents update to mark replaced and altered
      features as described, editing text nodes in place.
- [ ] Heading and description mutations preserve the original elements (no innerHTML
      replacement of framework-scoped elements); scoped styles still apply after
      mutation (SPEC V52).
- [ ] All JS-injected classes are declared with global scope and visibly apply
      (SPEC V50).
- [ ] The trait-catalog toggle (R2) still works after a swap (handlers are rebound).
- [ ] The selector instance is torn down on the view-transition before-swap event.

**Dependencies:** R1 (table is its mutation target), R2 (toggle rebinding), R3
(card ids and data-level), R5 (tag badges in embedded content), system registry
(cavekit-dedup-routes.md R1 for link generation).

### R5: TagBadge Audit

**Description:** Ensure every page and component renders tags exclusively through
the existing shared tag-badge component; no page or component reimplements tag
display logic inline (SPEC V51, V40).

**Acceptance Criteria:**
- [ ] No page or component contains inline tag-display markup or styling; every tag
      render path resolves to the single shared tag-badge component.
- [ ] Class-trait tags are auto-injected (SPEC V40) and rendered via the shared
      component (no hardcoded label spans).
- [ ] R2 and R3 render their tags through the shared component.
- [ ] A repository search finds zero inline reimplementations of tag display logic.

**Dependencies:** Consumed by R2 and R3.

## Out of Scope

- Route unification and the system registry wiring (cavekit-dedup-routes.md).
- Any change to URL structure, page layout, or visual design beyond preserving the
  current appearance.
- Any change to the underlying content data model, schema, or the published BAB,
  save, caster-level, magic-talent, or spell-pool tables.
- New archetype features, new traits, or new class content.
- The tag-badge component's own internal design (only its reuse is in scope here).

## Cross-References

- See also: cavekit-dedup-routes.md (system registry, class data model, link/route generation)
- See also: cavekit-dedup-overview.md (campaign index, dependency graph, SPEC task/invariant map)
