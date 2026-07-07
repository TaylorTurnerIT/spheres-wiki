---
created: "2026-06-14"
last_edited: "2026-06-14"
---

# Cavekit: PageSpeed — Images

## Scope

Covers the two image-payload regressions surfaced by PageSpeed Insights on the
Astro static wiki: oversized publisher logos in the sidebar and oversized store
card cover images. Both stem from `<Image>` components that constrain display
size in CSS only, so the image optimizer is never told to emit a smaller variant
and the original full-resolution file is shipped. The combined potential payload
reduction across an affected page load is approximately 506 KiB.

This kit covers only the intrinsic-size mismatch between what is fetched and what
is displayed. It does not cover image format, lazy-loading policy, or CDN
caching.

## Requirements

### R1: Publisher logos served at display resolution
**Description:** The two publisher logos rendered in the sidebar must be fetched
at a resolution appropriate to their rendered display size rather than at their
native source resolution. The logos display at a small fixed square but the
source files are large square images, so each currently ships far more pixel data
than any display device can use.

**Acceptance Criteria:**
- [ ] Both publisher logo images render at the same visible position, size, and
  fit as before the change (no visible regression at any breakpoint).
- [ ] The optimizer-emitted file for each publisher logo has an intrinsic width no
  greater than twice the largest CSS display width used for that logo (i.e. it
  accounts for high-DPI displays but not the full native source size).
- [ ] Each published logo image file is materially smaller than its native source
  file; the two logos together account for the bulk of the ~193 KiB saving
  attributed to this issue.
- [ ] The rendered logo elements carry an intrinsic width and height such that no
  layout shift is introduced by their loading.
- [ ] Each logo retains its existing descriptive alt text.

**Dependencies:** None.

### R2: Store card cover images served at display resolution
**Description:** Book/store cover images rendered by the store card must be
fetched at a resolution appropriate to their rendered display size. The card
constrains the cover to a small bounded width via CSS and a fixed aspect ratio,
but every cover is currently served at its native resolution.

**Acceptance Criteria:**
- [ ] Every store card cover renders at the same visible size, aspect ratio, and
  position as before the change, in every context where the store card appears
  (homepage grid and carousel).
- [ ] The optimizer-emitted file for each cover has an intrinsic width no greater
  than twice the largest CSS-bounded display width the card uses across all its
  display contexts.
- [ ] Each published cover image file is materially smaller than its native source
  file; collectively the covers account for the bulk of the ~313 KiB saving
  attributed to this issue.
- [ ] The covers preserve their fixed display aspect ratio with no cropping or
  distortion versus the prior rendering.
- [ ] Each cover retains its existing alt text (the book title) and its existing
  lazy-loading behavior.

**Dependencies:** None.

## Out of Scope

- Image format selection or conversion (sources are already optimized webp).
- Lazy-loading or eager-loading policy beyond preserving existing behavior.
- Cache TTL on delivered image assets — controlled by the static host and tracked
  in cavekit-pagespeed-overview.md as a documented non-goal.
- Any image not rendered by the sidebar (publisher logos) or the store card (book
  covers).

## Cross-References

- See also: cavekit-pagespeed-overview.md (master index, shared non-goals).
- Independent of cavekit-pagespeed-accessibility.md and
  cavekit-pagespeed-font-loading.md; no ordering constraint between domains.

## Changelog

_(none yet)_
