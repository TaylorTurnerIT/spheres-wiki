# PageSpeed Audit — Homepage

**Date**: 2026-06-14  
**URL**: https://taylorturnerit.github.io/spheres-wiki/  
**Tool**: Lighthouse 13.3.0, HeadlessChromium 146.0.7680.177  
**Form factor**: Desktop (emulated, custom throttling)  
**Remediation plan**: [context/kits/cavekit-pagespeed-overview.md](../context/kits/cavekit-pagespeed-overview.md)

---

## Scores

| Category | Score |
|---|---|
| Performance | 100 |
| Accessibility | 93 |
| Best Practices | 100 |
| SEO | 100 |

---

## Core Web Vitals

| Metric | Value | Weight |
|---|---|---|
| First Contentful Paint (FCP) | 0.4 s | 10% |
| Largest Contentful Paint (LCP) | 0.5 s | 25% |
| Total Blocking Time (TBT) | 0 ms | 30% |
| Cumulative Layout Shift (CLS) | 0.002 | 25% |
| Speed Index (SI) | 0.4 s | 10% |

LCP element: `<p class="intro-description">` (text node).  
LCP breakdown: TTFB 0 ms, element render delay 380 ms.

---

## Performance Insights

### 1. Inefficient cache lifetimes — est. savings 1,514 KiB

All `_astro/` assets served with **10-minute cache TTL** (GitHub Pages limitation). 80+ assets affected: images (webp), fonts (woff2), JS, CSS. On repeat visits users re-download everything.

Notable assets:
| Asset | Size |
|---|---|
| `drop-dead-studios.webp` | 141 KiB |
| `barons-uncanny-gateway.webp` | 102 KiB |
| `mana.png` | 87 KiB |
| `ultimate-spheres-of-power.webp` | 84 KiB |
| `spheres-of-might.webp` | 72 KiB |
| `spheres-of-guile.webp` | 56 KiB |
| `diamond-recreational-studios.webp` | 52 KiB |
| `Base.astro_ast….js` | 21 KiB |
| 4× Crimson Text woff2 | ~26 KiB each |

**Root cause**: GitHub Pages sets `Cache-Control: max-age=600`. No workaround available without moving off GitHub Pages.

---

### 2. Oversized images — est. savings 506 KiB

Images served at native dimensions far exceeding their display size. Use responsive images (`srcset`/`sizes`) or resize at build time.

| Image | Native size | Display size | Wasted |
|---|---|---|---|
| `drop-dead-studios.webp` | 1024×1024 | 32×32 | 140 KiB |
| `barons-uncanny-gateway.webp` | 900×1165 | 160×208 | 98.5 KiB |
| `ultimate-spheres-of-power.webp` | 612×792 | 160×208 | 79 KiB |
| `spheres-of-might.webp` | 612×792 | 160×208 | 66.7 KiB |
| `spheres-of-guile.webp` | 778×1004 | 161×208 | 53.8 KiB |
| `diamond-recreational-studios.webp` | 1024×1024 | 32×32 | 52.3 KiB |
| `diamond-spheres-hustle-and-bustle.webp` | 612×792 | 160×208 | 14.9 KiB |

Publisher logos (`drop-dead-studios`, `diamond-recreational-studios`) are 1024×1024 displayed at 32×32 — highest ratio offenders.

---

### 3. Render-blocking requests — est. savings 110 ms

`WikiPage.CrlwuBrZ.css` (10 KiB) blocks initial render for ~50 ms. Inlining critical CSS or deferring non-critical styles would move LCP earlier.

---

### 4. Forced reflow (unscored)

JavaScript in `Base.astro_ast….Dlx7btoI.js` queries layout geometry after DOM mutation, forcing synchronous reflow.

| Location | Reflow time |
|---|---|
| `Base.astro_ast….js:2:9741` | 13 ms |
| `[unattributed]` | 138 ms |
| `Base.astro_ast….js:51:5769` | 2 ms |
| `Base.astro_ast….js:172:54` | 11 ms |

The unattributed 138 ms dominates — likely browser internals or a non-sourcemapped third party.

---

### 5. Critical request chain — max latency 534 ms

```
HTML (109 ms, 12.75 KiB)
└── ClientRouter.js (292 ms, 5.35 KiB)
    └── index.js (394 ms, 1.74 KiB)
├── WikiPage.css (131 ms, 9.97 KiB)
│   ├── cinzel woff2 (274 ms, 15.49 KiB)
│   └── 4× crimson woff2 (~272 ms each, ~26 KiB each)
├── page.js (298 ms, 0.71 KiB)
└── Base.astro.js (125 ms, 21.34 KiB)
    └── Material Icons CSS (458 ms, 1.06 KiB)
        └── Material Icons woff2 (534 ms, 126.40 KiB) ← critical path end
```

Material Icons font is the longest chain tail at 534 ms total.

---

### 6. Font display — est. savings 10 ms

Google Fonts Material Icons woff2 (`fonts.gstatic.com`) lacks `font-display: swap` or `optional`. Text using this font is invisible until the font loads.

---

### 7. Layout shift culprits — CLS 0.002

`<nav class="header-nav" aria-label="Site navigation">` shifts by 0.002 when web fonts load. Caused by all 5 local fonts (4× Crimson Text, 1× Cinzel) loading after layout.

---

### 8. DOM size — 824 elements

| Statistic | Value | Element |
|---|---|---|
| Total elements | 824 | — |
| Max depth | 13 | `div.sphere-col > a.power > svg.si > use` |
| Most children | 68 | `body > svg > defs` (SVG icon sprite) |

---

### 9. Third-party impact

| Origin | Transfer size | Main thread time |
|---|---|---|
| `fonts.gstatic.com` (Material Icons woff2) | 126 KiB | 0 ms |
| `fonts.googleapis.com` (CSS) | 1 KiB | 0 ms |
| **Total** | **127 KiB** | **0 ms** |

No main-thread blocking, but 126 KiB of font data on the critical path.

---

## Accessibility Issues (score: 93)

### Failing audits

**1. Low contrast text**  
Elements: `.tagline` span, `.site-header-wrap`.  
Fix: increase foreground/background contrast ratio to meet WCAG AA (4.5:1 for normal text).

**2. Touch targets too small**  
Multiple `.power` class anchor links on the homepage fall below minimum touch target size/spacing. Affected class pages: Armorist, Elementalist, Eliciter, Fey Adept, Hedgewitch, Incanter, Mageknight, Shifter, Soul Weaver, Symbiat, Thaumaturge, Wraith (several duplicated in the audit due to repeated DOM nodes).

**3. ARIA role on incompatible element**  
`<aside class="sidebar" role="dialog">` — `dialog` role is not valid on `aside`. Change to a `<div>` or remove the role and handle modal semantics differently.

**4. Identical link text, different destinations**  
Four "BROWSE ALL →" links point to different URLs (`/power/`, `/might/`, `/guile/`, `/champions/`). Screen reader users can't distinguish them. Add distinguishing accessible names (e.g., `aria-label="Browse all Power spheres"`).

### Manual checks (10 items — pass assumed)

- Interactive controls keyboard focusable
- Interactive elements indicate purpose and state
- Logical tab order
- Visual order follows DOM order
- Focus not accidentally trapped
- Focus directed to new content
- HTML5 landmark elements used
- Offscreen content hidden from assistive tech
- Custom controls have labels
- Custom controls have ARIA roles

---

## Best Practices (score: 100)

All automated checks pass. Informational notes:
- No CSP header (XSS mitigation) — static site, low risk
- No HSTS header — GitHub Pages handles HTTPS
- No COOP header — no cross-origin resources requiring isolation
- No XFO/Trusted Types — noted, low priority for read-only wiki

---

## SEO (score: 100)

All automated checks pass. Manual check: validate structured data markup if added in future.

---

## Priority Fix List

| Priority | Issue | Est. impact |
|---|---|---|
| High | Publisher logos served 1024×1024, displayed 32×32 | −193 KiB download |
| High | Store card images 2–6× oversized for display dims | −313 KiB download |
| Medium | ARIA `role="dialog"` on `<aside>` (accessibility violation) | Fixes screenreader breakage |
| Medium | "BROWSE ALL →" links indistinguishable by label | Accessibility |
| Medium | Low contrast on `.tagline` / `.site-header-wrap` | Accessibility |
| Low | `font-display: swap/optional` on Material Icons | −10 ms FCP |
| Low | Render-blocking `WikiPage.css` | −110 ms theoretical |
| Info | Cache TTL 10 min on all assets | No fix (GitHub Pages) |
