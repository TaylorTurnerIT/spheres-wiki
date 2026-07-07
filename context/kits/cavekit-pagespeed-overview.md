---
created: "2026-06-14"
last_edited: "2026-06-14"
---

# Cavekit Overview: PageSpeed Remediation

This campaign remediates the regressions surfaced by a PageSpeed Insights audit of
the Astro static wiki. The findings fall into three independent domains: oversized
image payloads, accessibility failures, and font-loading cost. Each domain is
self-contained — its requirements can be implemented and validated in any order
relative to the others — so the work parallelizes cleanly.

The campaign's targeted outcomes are: ~506 KiB less image payload per affected
page load, the Accessibility score raised from 93 to 100, ~126 KiB removed from
the critical request path, and the font-driven cumulative layout shift eliminated.

## Domain Index

| Domain | File | Requirements | Status | Description |
|--------|------|-------------|--------|-------------|
| Images | cavekit-pagespeed-images.md | R1, R2 | Not started | Serve sidebar publisher logos and store card covers at display resolution instead of native resolution (~506 KiB saved). |
| Accessibility | cavekit-pagespeed-accessibility.md | R1, R2, R3, R4 | Not started | Fix sidebar dialog role, disambiguate repeated browse links, raise tagline contrast, enlarge touch targets (score 93 → 100). |
| Font Loading | cavekit-pagespeed-font-loading.md | R1, R2 | Not started | Stop fetching the unused icon font (~126 KiB off critical path) and eliminate font-driven layout shift. |

## Cross-Reference Map

Each domain kit cross-references this overview. The three domains are mutually
independent and do not reference one another except to assert that independence.

| Kit | References |
|-----|-----------|
| cavekit-pagespeed-images | overview |
| cavekit-pagespeed-accessibility | overview |
| cavekit-pagespeed-font-loading | overview |

## Dependency Graph

All three domains are independent. There are no inter-domain dependencies and no
intra-domain ordering constraints; every requirement can be tackled on its own.

```
cavekit-pagespeed-overview          (index, no requirements)

cavekit-pagespeed-images            (independent)
   R1 Publisher logos at display resolution
   R2 Store card covers at display resolution

cavekit-pagespeed-accessibility     (independent)
   R1 Sidebar dialog role only when modal
   R2 Distinguishable browse links
   R3 Tagline contrast
   R4 Touch-target sizing

cavekit-pagespeed-font-loading      (independent)
   R1 Drop unused icon font
   R2 No font-driven layout shift
```

- No circular dependencies.
- No cross-domain dependencies.
- No required ordering between any two requirements.

## Coverage Summary

- Kits: 3 (plus this overview).
- Requirements: 8 (images 2, accessibility 4, font loading 2).
- Acceptance criteria: 34 (images 10, accessibility 16, font loading 8).
- Targeted impact: ~506 KiB image payload saved, ~126 KiB removed from the
  critical path, Accessibility score 93 → 100, font-driven CLS eliminated.

## Documented Non-Goals (campaign-wide)

These were investigated and deliberately excluded from all three kits:

- **Asset cache TTL.** The static host sets a short `max-age`; there is no
  workaround without changing hosting. Out of scope.
- **Render-blocking page CSS.** A bundling artifact with an estimated saving under
  ~110 KiB at high refactor cost and risk. Out of scope.

## Validation Checklist (campaign-wide)

- [ ] Every acceptance criterion in all three kits is testable by an automated
  agent (network/audit assertions, computed-style checks, DOM-attribute checks).
- [ ] No circular dependencies (see graph above).
- [ ] Cross-references are present and consistent (each kit references this
  overview; domains assert mutual independence).
- [ ] Out-of-scope sections are explicit in all three kits, and shared non-goals
  are recorded here.
- [ ] After the campaign: a PageSpeed audit shows the image-payload savings
  realized, Accessibility at 100, the icon font absent from the critical path, and
  zero font-driven CLS.
