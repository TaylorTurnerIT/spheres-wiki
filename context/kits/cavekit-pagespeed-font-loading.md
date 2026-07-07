---
created: "2026-06-14"
last_edited: "2026-06-14"
---

# Cavekit: PageSpeed — Font Loading

## Scope

Covers the two font-related performance regressions: an icon font fetched from a
third-party host that is never actually used, and a small cumulative layout shift
caused by the site's local web fonts swapping in after first paint. Resolving R1
removes ~126 KiB from the critical request path; resolving R2 eliminates the
layout-shift contribution from font loading.

This kit covers which fonts are fetched and how their loading affects layout. It
does not cover the visual styling of text or the choice of typefaces.

## Requirements

### R1: Unused icon font is not fetched
**Description:** A third-party icon font is being requested on the critical path
because the accessibility widget injects a stylesheet for it, even though the
widget's icon is hidden and the font is never displayed. The icon font must not
be fetched.

**Acceptance Criteria:**
- [ ] On a normal page load, no network request is made for the third-party icon
  font stylesheet or font file.
- [ ] The accessibility widget continues to initialize and function exactly as
  before in every respect other than the removed font request.
- [ ] No new visible icon, glyph, or broken-glyph placeholder appears as a result
  of the font no longer loading.
- [ ] The icon-font request no longer appears in the critical request chain
  reported by a performance audit.

**Dependencies:** None.

### R2: Local web fonts do not cause layout shift
**Description:** The site's local web fonts load after first paint and shift page
content (notably the header navigation) as they swap in, producing a small but
nonzero cumulative layout shift. Font loading must not move already-painted
content.

**Acceptance Criteria:**
- [ ] The cumulative layout shift attributable to web-font loading is zero in a
  performance audit (the previously reported font-driven shift is eliminated).
- [ ] Text rendered with the site's local fonts remains styled with those fonts on
  a warm (cached) load.
- [ ] No element's position changes between the fallback-font paint and the
  web-font paint, or the web font is not applied until it can be applied without
  shifting content.
- [ ] The chosen font-loading behavior is applied consistently to all local web
  fonts used by the site, not a subset.

**Dependencies:** None.

## Out of Scope

- The choice of typefaces or any change to text appearance beyond loading
  behavior.
- Self-hosting versus third-party hosting decisions for any font other than
  removing the unused icon-font request in R1.
- Render-blocking CSS unrelated to fonts — tracked as a documented non-goal in
  cavekit-pagespeed-overview.md.
- First-load FOUT tradeoffs are accepted as a consequence of R2 and are not
  themselves a defect to be remediated.

## Cross-References

- See also: cavekit-pagespeed-overview.md (master index, critical-path summary).
- Independent of cavekit-pagespeed-images.md and
  cavekit-pagespeed-accessibility.md; no ordering constraint between domains.

## Changelog

_(none yet)_
