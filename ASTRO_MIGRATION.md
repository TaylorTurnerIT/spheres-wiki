# Astro 4.16.19 → 6.3.3 Migration Plan

**Scope**: Modernize spheres-wiki to Astro 6 latest, adopt new APIs where beneficial, eliminate all audit vulnerabilities.

---

## 1. Package Updates

### Required
| Package | Current | Target | Notes |
|---|---|---|---|
| `astro` | `^4.16.19` | `^6.3.3` | Core upgrade |
| `@astrojs/check` | `^0.9.9` | `^0.9.2` or latest | Language server fix for yaml vuln |
| `typescript` | `^5.9.3` | keep or latest | Verify compat |

### Audit
- Run `npm audit` post-upgrade — esbuild and vite vulns are bundled inside astro and will resolve with astro upgrade
- The yaml vuln in `yaml-language-server` is dev tooling only — confirm it resolves with `@astrojs/check` upgrade

---

## 2. Breaking Change Audit

### 2A. Content Collections API (HIGH IMPACT)

The most significant change in Astro 5. All `entry.render()` calls become a standalone `render()` function.

**Files affected** (11 files):
- `src/pages/guile/[sphere]/index.astro:132,137,143`
- `src/pages/guile/[sphere]/[talent].astro:64`
- `src/pages/guile/[sphere]/feats/[feat].astro:64`
- `src/pages/might/[sphere]/index.astro:132,137,143`
- `src/pages/might/[sphere]/[talent].astro:64`
- `src/pages/might/[sphere]/feats/[feat].astro:64`
- `src/pages/power/[sphere]/index.astro:132,137,143`
- `src/pages/power/[sphere]/[talent].astro:64`
- `src/pages/power/[sphere]/feats/[feat].astro:64`
- `src/pages/tags/[tag].astro:158`
- `src/lib/resolveEntries.ts:149`

**Change required**:
```ts
// Before (Astro 4)
const { Content } = await entry.render();

// After (Astro 5+)
import { render } from 'astro:content';
const { Content } = await render(entry);
```

**Audit checklist**:
- [ ] All `entry.render()` → `render(entry)` with new import
- [ ] Verify `CollectionEntry` type still works (type changes in Astro 5)
- [ ] Verify `getCollection` return shape unchanged — code uses `e.data as any` casts that may hide type drift
- [ ] Verify `entry.body` still accessible (used in `index.astro:121` and `tags/[tag].astro:158` for body-existence checks)
- [ ] Check `getEntry` signature if used anywhere (not found in audit but worth confirming)

### 2B. Content Layer API — Collection Definition (MEDIUM IMPACT)

`src/content/config.ts` uses the Astro 4 pattern: `defineCollection` + Zod schemas + `import.meta.glob` for dynamic collection discovery.

**Audit checklist**:
- [ ] Astro 5 still supports the old `defineCollection` + zod pattern — confirm no forced migration
- [ ] Dynamic collection registration via `import.meta.glob` for `_book.yaml` discovery: verify this pattern still resolves at build time in Astro 6
- [ ] `src/content/config.ts:84` — `import.meta.glob('**/_book.yaml')` for auto-discovery: test that collection IDs still resolve correctly
- [ ] The discriminated union Zod schema (`z.discriminatedUnion`) — verify Astro 5 ships compatible Zod version or brings its own

### 2C. ViewTransitions (LOW IMPACT)

`src/layouts/Base.astro` uses `ViewTransitions` component and listens for `astro:after-swap` and `astro:page-load` events.

- ViewTransitions moved from experimental to **stable** in Astro 5 — import path unchanged
- Event names `astro:after-swap` and `astro:page-load` are stable

**Audit checklist**:
- [ ] `src/layouts/Base.astro:2` — confirm `import { ViewTransitions } from 'astro:transitions'` still works
- [ ] `src/layouts/Base.astro:31` — `astro:after-swap` listener still fires
- [ ] `src/layouts/Base.astro:60` — `astro:page-load` listener still fires
- [ ] Tab state and active-tab detection in `src/components/TabNav.astro` survives page transitions after upgrade

### 2D. Vite YAML Plugin (LOW IMPACT)

`astro.config.mjs` includes a hand-rolled Vite plugin that transforms `.yaml`/`.yml` imports into ES modules.

- Vite plugin API is unchanged between Vite 5 (Astro 4) and Vite 6 (Astro 6) for this transform pattern
- Plugin is simple `transform` hook — no lifecycle changes expected

**Audit checklist**:
- [ ] Verify YAML imports still resolve after upgrade — test `import.meta.glob('**/_book.yaml')` in `resolveEntries.ts`
- [ ] Dev server hot reload for YAML edits — confirm plugin still handles HMR correctly in Vite 6

### 2E. TypeScript Config (LOW IMPACT)

`tsconfig.json` extends `astro/tsconfigs/strict`. This path is stable across versions.

**Audit checklist**:
- [ ] Confirm `astro/tsconfigs/strict` still valid after upgrade
- [ ] Run `@astrojs/check` post-upgrade — expect new strict errors from improved type inference
- [ ] `Astro.props` typing in layouts — Astro 6 has stricter component prop inference; verify `Base.astro` and `WikiPage.astro` props still type-check
- [ ] `Astro.url.pathname` access in `TabNav.astro:5` — still available

### 2F. Routing & getStaticPaths (LOW IMPACT)

11 files use `getStaticPaths`. The API is stable across Astro 4–6.

**Audit checklist**:
- [ ] All 11 `getStaticPaths` files build without error
- [ ] Dual-sphere path generation in `[talent].astro` and `[feat].astro` (generates paths for both sphere names) — verify no deduplication behavior change
- [ ] `src/pages/tags/[tag].astro` — most complex route, generates paths for all tags across all systems; verify all paths still emit

### 2G. Build Output & Static Files

- [ ] Verify `dist/` structure unchanged (GitHub Pages deployment depends on `base: /spheres-wiki/`)
- [ ] `pagefind` post-build indexing — runs against `dist/` after `astro build`; verify it still finds pages correctly

---

## 3. Modernization Opportunities

These are new capabilities in Astro 5/6 worth adopting during the migration.

### 3A. Content Layer Loaders — Replace Custom YAML Plugin (HIGH VALUE)

Astro 5 introduces the Content Layer API with built-in `glob()` loader and support for custom loaders.

**Current pain**: Hand-rolled Vite plugin in `astro.config.mjs` + `import.meta.glob` in `resolveEntries.ts` for YAML loading. Two-layer system that's brittle.

**Opportunity**: Replace both with a Content Layer custom loader that reads `_book.yaml` files and registers book collections natively. Benefits:
- Type-safe at the collection level — no more `e.data as any` casts
- Better error messages when YAML is malformed
- Incremental builds — Astro only rebuilds changed collections
- Eliminates the Vite plugin entirely

**Scope**: `astro.config.mjs`, `src/content/config.ts`, `src/lib/resolveEntries.ts`

### 3B. `astro:assets` for Book Cover Images (MEDIUM VALUE)

Currently `BookCard.astro` and `SourceBookCallout.astro` use raw `<img>` tags with `loading="lazy"`. No optimization.

**Opportunity**: Migrate to `<Image>` from `astro:assets` for:
- Automatic WebP/AVIF conversion
- Correct `width`/`height` to prevent layout shift
- Built-in lazy loading

**Also**: Astro 6 adds `experimental.responsiveImages` — enable this to get automatic `srcset` generation for covers at different screen sizes.

**Scope**: `src/components/BookCard.astro:16`, `src/components/SourceBookCallout.astro:14`, `astro.config.mjs` (add experimental flag)

### 3C. `astro:env` for Site Config (LOW VALUE)

`src/config/site.ts` likely has hardcoded values. Astro 5 adds typed environment variable schemas via `astro:env`.

**Scope**: Evaluate if any site config values should come from env (e.g., site URL, base path). Low priority — these are already in `astro.config.mjs`.

### 3D. Pagefind Integration as Astro Integration (LOW VALUE)

Currently pagefind runs as a post-build script. An `@astrojs/pagefind` integration (community) or manual integration hook in `astro.config.mjs` would wire it into the build lifecycle cleanly.

**Scope**: `astro.config.mjs`, `package.json` scripts — evaluate if worth the churn.

### 3E. View Transition Naming for Smoother Cross-Page Animation (MEDIUM VALUE)

Now that ViewTransitions is stable, add named transition directives to key elements:
- Book cover images between `BookCard` list and detail pages
- Sphere title headings between sphere index and talent/feat detail pages

**Scope**: `src/components/BookCard.astro`, sphere page layouts, `transition:name` and `transition:animate` attributes

---

## 4. Execution Order

Do in this sequence to catch breakage early:

1. **Bump astro + check in package.json, run `npm install`**
2. **Run `astro check`** — enumerate all type errors before touching anything
3. **Fix `entry.render()` → `render(entry)`** across all 11 files (mechanical, do all at once)
4. **Run `astro build`** — first real validation
5. **Fix any remaining type errors** from stricter Astro 6 inference
6. **Run `astro dev`** — test UI manually: tab nav, page transitions, tag pages, dual-sphere pages
7. **Run pagefind** post-build and verify search index
8. **Adopt 3A** (Content Layer loaders) — biggest modernization, highest risk, do in isolation
9. **Adopt 3B** (astro:assets images) — mechanical, low risk
10. **Adopt 3E** (named view transitions) — additive, zero breakage risk
11. **Final `npm audit`** — confirm clean

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dynamic collection discovery breaks | Medium | High | Test `import.meta.glob` in config.ts early |
| `e.data as any` casts hide type regressions | Medium | Medium | Remove casts, fix real types during step 5 |
| Pagefind misses pages after build restructure | Low | High | Run pagefind and spot-check index after step 7 |
| ViewTransition events fire differently | Low | Medium | Manual smoke test tab nav and page loads |
| Zod version mismatch in discriminated union | Low | High | Check Astro 5 bundled Zod version vs current schema |
| GitHub Pages `base` path breaks | Low | High | Check all links and assets in built output before deploy |
