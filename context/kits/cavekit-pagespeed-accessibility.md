---
created: "2026-06-14"
last_edited: "2026-06-14"
---

# Cavekit: PageSpeed — Accessibility

## Scope

Covers the four accessibility failures that hold the PageSpeed Accessibility
score at 93/100: an incorrect ARIA dialog role on the sidebar, non-distinguishable
repeated link text on the homepage, a low-contrast header tagline, and
undersized touch targets on the homepage class/sphere links. Resolving all four
is expected to raise the Accessibility score to 100.

This kit covers observable accessibility semantics and computed styles. It does
not cover visual redesign beyond what each fix strictly requires, nor any
accessibility concern not flagged by the audit.

## Requirements

### R1: Sidebar exposes dialog semantics only when acting as a modal
**Description:** The sidebar must only present modal-dialog ARIA semantics when it
is actually behaving as a modal overlay (the mobile state where it floats over
content and traps focus). In the desktop state, where the sidebar is a persistent
visible region rather than a modal, it must not claim to be a modal dialog.

**Acceptance Criteria:**
- [ ] In the desktop / always-visible state, the sidebar element does not carry a
  modal-dialog role nor a modal-active attribute.
- [ ] When the sidebar is opened as an overlay (mobile toggle state), the element
  carries the modal-dialog role and the modal-active attribute.
- [ ] When the sidebar is closed from the overlay state, the modal-dialog role and
  modal-active attribute are removed.
- [ ] The sidebar retains an accessible name describing it as site navigation in
  all states.
- [ ] The sidebar's hidden/visible state to assistive technology continues to
  match its visual state across the toggle.
- [ ] An automated accessibility audit reports no ARIA-role violation for the
  sidebar element.

**Dependencies:** None.

### R2: Repeated browse links are individually distinguishable
**Description:** The homepage renders the same visible "Browse All" link text
multiple times, once per system, with no programmatic way to tell the links
apart. Each such link must carry an accessible name that identifies which system
it browses, while the visible text may remain unchanged.

**Acceptance Criteria:**
- [ ] Each "Browse All" link on the homepage has an accessible name that includes
  the human-readable name of the system it targets, making each link's accessible
  name unique on the page.
- [ ] The visible link text and its destination are unchanged.
- [ ] The accessible name is derived from the system metadata already available to
  the rendering component, not hardcoded per instance.
- [ ] An automated accessibility audit reports no "links lack a discernible
  / unique name" violation for these links.

**Dependencies:** None.

### R3: Header tagline meets contrast minimum
**Description:** The site header tagline text fails WCAG AA contrast against the
header background. Its color must be adjusted so that the contrast ratio meets or
exceeds the AA threshold for its text size.

**Acceptance Criteria:**
- [ ] The computed contrast ratio between the tagline text color and its actual
  rendered background is at least 4.5:1.
- [ ] The tagline remains visually subordinate to the site title (it is not made
  to match the title's prominence).
- [ ] An automated accessibility / contrast audit reports no contrast violation
  for the tagline.

**Dependencies:** None.

### R4: Homepage class/sphere links meet touch-target size
**Description:** The class/sphere links on the homepage have an effective
interactive height below the accessibility minimum. Their interactive (hit) area
must be enlarged to meet at least the WCAG minimum touch-target size.

**Acceptance Criteria:**
- [ ] Each affected class/sphere link presents an interactive area at least 24px
  tall and 24px wide (the WCAG 2.5.8 minimum).
- [ ] Enlarging the hit area does not change the visual layout of the lists in a
  way that breaks their existing columnar arrangement.
- [ ] An automated accessibility audit reports no touch-target / tap-target
  violation for these links.

**Dependencies:** None.

## Out of Scope

- Any accessibility issue not listed above (the audit reports only these four at
  the time of writing).
- Visual redesign of the header, sidebar, or homepage lists beyond the minimal
  change each fix requires.
- Keyboard focus-management behavior of the sidebar beyond preserving its existing
  open/close behavior.
- Meeting the WCAG 2.5.5 enhanced (44px) target; R4 targets the 2.5.8 minimum
  only.

## Cross-References

- See also: cavekit-pagespeed-overview.md (master index, score targets).
- Independent of cavekit-pagespeed-images.md and
  cavekit-pagespeed-font-loading.md; no ordering constraint between domains.

## Changelog

_(none yet)_
