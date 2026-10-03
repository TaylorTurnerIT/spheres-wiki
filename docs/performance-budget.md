# Static route performance budget

The build enforces HTML payload budgets with `bun run check-performance` after
Astro, Pagefind, route-link, and TOC generation. The check covers route classes
with the largest server-rendered payloads. Shared sphere artwork also has
static image budgets; JavaScript, fonts, and complete page loading remain
Lighthouse concerns.

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

Lighthouse CI uses the production build served by Astro Preview at
`http://127.0.0.1:4321/spheres-wiki/`. The `/spheres-wiki/` prefix is the
deployment base configured in `astro.config.mjs`; Lighthouse must target that
served URL so CSS and JavaScript are returned with their real status and MIME
types. The CI job starts Preview before the browser smoke test and Lighthouse
run. There is no `dist/spheres-wiki` symlink or alternate static file server.

The casting-traditions route keeps inactive tab bodies in base-path-aware
static fragments and loads the Builder catalog as JSON. The initial document
retains the active Rules tab, the lightweight Builder controls, and anchor
markers; tab activation hydrates the selected fragment before restoring its
TOC and hash target.

The run exercises desktop-independent mobile settings across home, search, a
sphere, a class, the archetype index, the casting builder, and a large tag
catalog. If a route class grows beyond its budget, the build fails before
deployment. The `errors-in-console` assertion also fails when an asset is
missing or served with the wrong MIME type, while the CLS assertion catches
real layout instability. Interactive keyboard, reduced-motion, and View
Transition behavior are covered by the DOM/runtime tests and the browser smoke
gate when a browser is available.

To run the same check locally after `bun run build`, start Preview in one
terminal and run Lighthouse CI in another:

~~~bash
bun run preview -- --host 127.0.0.1
bunx lhci autorun
~~~

## Shared sphere artwork

`SphereIcon.astro` uses Astro-generated WebP images at up to 180 pixels wide
for badges displayed at up to 90 CSS pixels. Transforms resolve once per
build; original artwork is unchanged. Per-asset framing retains the original
inset or full-bleed appearance.

Raster icons use native `img` elements with explicit dimensions and
`loading="lazy"`. The page-heading icon loads eagerly. SVGSprite contains
only vectors. SphereIconTemplates supplies inert SSR templates; quick search
mounts the needed template when results appear. Merely declaring an unused
icon no longer fetches it.

The post-build check samples home, all four system indexes, and one route
from each HTML-budget class. On each sample, it validates native image
loading and dimensions, then measures all unique optimized raster URLs from
active images and the complete template inventory against files in `dist`:

- At most 80 available image URLs.
- At most 700,000 encoded image bytes in total.
- At most 20,000 bytes for any individual sphere image.

The inventory budget covers available artwork, not simultaneous requests.
Missing, empty, external, or out-of-build paths fail the check, as do live
SVG raster images, missing dimensions and eager images outside the page
heading. Native lazy loading decides which nearby images to fetch; browser
cold-load measurements verify that unmounted templates make no requests.
Lighthouse governs complete page loads, including hero art, covers and fonts.
