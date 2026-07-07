/**
 * Shared TomSelect initialization primitive.
 *
 * TomSelect is the site's single select/dropdown idiom (SPEC §5, AGENTS.md
 * shared-idiom table). Every dropdown — the `/search/` filter row, the
 * `ArchetypeSwapper` multi-select, and the upcoming feats-browse filters — must
 * construct its instances through this helper rather than calling
 * `new TomSelect(...)` directly. The idiom guard (`scripts/check-idioms.mjs`)
 * fails the build on any bare `new TomSelect(` outside this file.
 *
 * What it centralizes:
 *  - the `import TomSelect` + `tom-select` CSS import (one home, not per page)
 *  - safe re-init: if the target element already carries a live TomSelect
 *    instance, it is destroyed before a new one is constructed. This makes the
 *    helper idempotent when a page re-runs its init on View Transitions.
 *  - a minimal shared default (`create: false`, matching both existing call
 *    sites and TomSelect's own default) with per-call-site overrides on top.
 *
 * It is entry-type-agnostic: nothing search- or archetype-specific is baked in.
 * All behavior (single vs multi select, plugins, placeholder, render callbacks,
 * onChange) is supplied by the caller's `settings`.
 *
 * SPEC V25 split of responsibility: this helper is init-only and browser-only
 * (it touches `window`/`document` and must never be imported from `.astro`
 * frontmatter). Consumers own the lifecycle hooks — they call `createTomSelect`
 * from an `astro:page-load` listener (never `DOMContentLoaded`) and may destroy
 * instances on `astro:before-swap`. The per-element safe re-init here is a
 * belt-and-suspenders guard against stale instances, not a substitute for the
 * consumer's own `astro:page-load` binding.
 *
 * @example single-select filter dropdown (search / feats browse)
 *   const ts = createTomSelect('sp-system-select', {
 *     maxItems: 1,
 *     plugins: ['clear_button'],
 *     placeholder: 'Any system…',
 *     options: systemOpts,
 *     onChange: handleSystemChange,
 *   });
 *
 * @example multi-select (ArchetypeSwapper)
 *   const ts = createTomSelect(selectEl, {
 *     plugins: ['remove_button'],
 *     placeholder: 'Select Archetypes...',
 *     onChange: handleArchetypeChange,
 *   });
 */
import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.css";

/** TomSelect settings passthrough. Loose by design — see the class's own typings. */
export type TomSelectSettings = Record<string, unknown>;

/** Tear down any live TomSelect instance already bound to `el` (safe re-init). */
function destroyExisting(el: HTMLElement): void {
  const existing = (el as unknown as { tomselect?: TomSelect }).tomselect;
  if (!existing) return;
  try {
    existing.destroy();
  } catch {
    /* instance already torn down — ignore */
  }
}

/**
 * Construct a TomSelect instance on `target`, destroying any pre-existing
 * instance bound to the same element first (safe re-init).
 *
 * @param target element or the `id` of the `<select>`/`<input>` to enhance
 * @param settings per-call-site TomSelect settings (merged over shared defaults)
 * @returns the new TomSelect instance, or `null` if the target element is absent
 */
export function createTomSelect(
  target: HTMLElement | string,
  settings: TomSelectSettings = {},
): TomSelect | null {
  const el =
    typeof target === "string" ? document.getElementById(target) : target;
  if (!el) return null;

  destroyExisting(el);

  // `create: false` is both existing call sites' behavior and TomSelect's own
  // default, so it is a no-op override the caller can still opt out of.
  // biome-ignore lint/suspicious/noExplicitAny: TomSelect settings/target are loosely typed at call sites.
  return new TomSelect(el as any, { create: false, ...settings } as any);
}
