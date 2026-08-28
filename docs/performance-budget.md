# Static route performance budget

The build enforces HTML payload budgets with `bun run check-performance` after
Astro, Pagefind, route-link, and TOC generation. The check covers route classes
with the largest server-rendered payloads; JavaScript, fonts, and images remain
separate Lighthouse concerns.

| Route class | Budget |
| --- | ---: |
| Search | 2,500 KiB |
| Feat catalog | 3,000 KiB |
| Tag catalog and tag pages | 6,500 KiB |
| Casting-tradition builder | 1,500 KiB |
| Article pages | 400 KiB |
| Class pages and class subroutes | 650 KiB |
| Sphere pages | 1,250 KiB |

Baseline measured from the 2026-08-28 production build:

| Route | HTML |
| --- | ---: |
| `/tags/talent/` | 5,368.1 KiB |
| `/tags/basic/` | 3,568.5 KiB |
| `/feats/` | 2,629.5 KiB |
| `/search/` | 1,809.7 KiB |
| `/power/casting-traditions/` | 1,004.5 KiB |

Only the primary display fonts are preloaded in `Base.astro` (`Cinzel 700`
and `Crimson Text 400`). Other self-hosted weights remain available through
Fontsource CSS and load when used, avoiding five unconditional font fetches on
every route.

Lighthouse CI uses the production build and exercises desktop-independent
mobile settings across home, search, a sphere, a class, the archetype index,
the casting builder, and a large tag catalog. If a route class grows beyond its
budget, the build fails before deployment; interactive keyboard, reduced-motion,
and View Transition behavior are covered by the DOM/runtime tests and the
browser smoke gate when a browser is available.
