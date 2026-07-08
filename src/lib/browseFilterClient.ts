/**
 * Shared browse-filter client for catalog pages (feats now; talent/archetype
 * browse later). Thin DOM adapter over the pure logic in `browseFilter.ts`:
 * owns TomSelect wiring, the debounced text search, the optional lazy
 * description-match mode, URL-state sync, and the dynamic browse heading —
 * against the generic DOM contract emitted by `BrowseControls.astro` +
 * `BrowseTable.astro`.
 *
 * SPEC compliance:
 *  - binds on `astro:page-load`, never `DOMContentLoaded` (V25)
 *  - filters by toggling the `hidden` attribute on server-rendered rows, so no
 *    JS-injected scoped class is needed (V50)
 *  - all dropdowns go through `createTomSelect()` (SPEC §5)
 *  - text input debounced at 220ms to match `/search/`
 *  - full state (q, system, category, tags, desc) lives in query params (§10)
 */
import {
  type BrowseRowData,
  type BrowseState,
  compareLetters,
  compareNames,
  parseBrowseParams,
  rowMatches,
  serializeBrowseParams,
} from "@/lib/browseFilter";
import { createTomSelect } from "@/lib/tomSelectInit";
import { url } from "@/lib/url";

const DEBOUNCE_MS = 220;
const activeSelects = new Set<Selectable>();
const activeContexts = new Set<Ctx>();

type Selectable = {
  destroy(): void;
  setValue(v: string | string[], silent?: boolean): void;
};

interface BrowseEls {
  search: HTMLInputElement;
  sort: HTMLSelectElement;
  desc: HTMLInputElement;
  system: HTMLSelectElement;
  category: HTMLSelectElement;
  tags: HTMLSelectElement;
  heading: HTMLElement;
  table: HTMLElement;
  empty: HTMLElement;
  emptyMsg: HTMLElement;
  reset: HTMLButtonElement;
}

interface Ctx {
  els: BrowseEls;
  noun: string;
  categoryLabels: Map<string, string>;
  instances: Record<string, Selectable | null>;
  descText: { value: Record<string, string> | null };
  debounce: ReturnType<typeof setTimeout> | null;
  destroyed: boolean;
}

function trackSelect(instance: Selectable | null): Selectable | null {
  if (!instance) return null;
  activeSelects.add(instance);
  return instance;
}

function destroyActiveSelects(): void {
  for (const instance of activeSelects) instance.destroy();
  activeSelects.clear();
}

function destroyActiveContexts(): void {
  for (const ctx of activeContexts) {
    ctx.destroyed = true;
    clearDebounce(ctx);
  }
  activeContexts.clear();
}

document.addEventListener("astro:before-swap", () => {
  destroyActiveContexts();
  destroyActiveSelects();
});

function coreReady(els: BrowseEls): boolean {
  return Boolean(els.search && els.table && els.heading);
}

/** Collect the browse DOM; returns null if the mandatory nodes are absent. */
function collectEls(): BrowseEls | null {
  const root = document.querySelector<HTMLElement>("[data-browse-root]");
  if (!root) return null;
  const p = root.dataset.browseRoot || "browse";
  const id = <T extends HTMLElement>(s: string) =>
    document.getElementById(`${p}-${s}`) as T;
  const empty = id<HTMLElement>("empty");
  const els: BrowseEls = {
    search: id<HTMLInputElement>("search"),
    sort: id<HTMLSelectElement>("sort"),
    desc: id<HTMLInputElement>("desc"),
    system: id<HTMLSelectElement>("system"),
    category: id<HTMLSelectElement>("category"),
    tags: id<HTMLSelectElement>("tags"),
    heading: id<HTMLElement>("heading"),
    table: id<HTMLElement>("table"),
    empty,
    emptyMsg: empty.querySelector(".browse-empty-msg") as HTMLElement,
    reset: id<HTMLButtonElement>("reset"),
  };
  return coreReady(els) ? els : null;
}

function ds(row: HTMLElement, key: string): string {
  return row.dataset[key] ?? "";
}

function readRowData(row: HTMLElement): BrowseRowData {
  return {
    name: ds(row, "name"),
    search: ds(row, "search"),
    system: ds(row, "system"),
    category: ds(row, "category"),
    tags: ds(row, "tags").split(" ").filter(Boolean),
    href: ds(row, "href"),
  };
}

function currentState(els: BrowseEls): BrowseState {
  return {
    q: els.search.value.trim(),
    system: els.system.value,
    category: els.category.value,
    tags: Array.from(els.tags.selectedOptions).map((o) => o.value),
    desc: els.desc.checked,
  };
}

/** Filter one letter group; returns how many rows remain visible. */
function applyGroup(
  group: HTMLElement,
  state: BrowseState,
  descText: Record<string, string> | null,
): number {
  let visible = 0;
  group.querySelectorAll<HTMLElement>(".browse-row").forEach((row) => {
    const ok = rowMatches(readRowData(row), state, descText);
    row.hidden = !ok;
    if (ok) visible += 1;
  });
  const header = group.querySelector<HTMLElement>("[data-letter-header]");
  if (header) header.hidden = visible === 0;
  group.hidden = visible === 0;
  return visible;
}

function updateHeading(ctx: Ctx, category: string): void {
  const label = ctx.categoryLabels.get(category);
  ctx.els.heading.textContent = category
    ? `Browse ${label ?? category} ${ctx.noun}`
    : `Browse All ${ctx.noun}`;
}

function apply(ctx: Ctx): void {
  if (ctx.destroyed) return;
  const state = currentState(ctx.els);
  let visible = 0;
  ctx.els.table
    .querySelectorAll<HTMLElement>(".browse-letter-group")
    .forEach((g) => {
      visible += applyGroup(g, state, ctx.descText.value);
    });
  updateHeading(ctx, state.category);
  ctx.els.empty.hidden = visible !== 0;
  ctx.els.emptyMsg.textContent = `No ${ctx.noun.toLowerCase()} match your search and filters.`;
  history.replaceState(null, "", queryFor(state));
}

function queryFor(state: BrowseState): string {
  const qs = serializeBrowseParams(state);
  return qs ? `?${qs}` : window.location.pathname;
}

function orderedGroups(els: BrowseEls, mode: string): HTMLElement[] {
  const groups = Array.from(
    els.table.querySelectorAll<HTMLElement>(".browse-letter-group"),
  );
  groups.sort((a, b) =>
    compareLetters(a.dataset.letter ?? "", b.dataset.letter ?? ""),
  );
  return mode === "desc" ? groups.reverse() : groups;
}

function rowsInOrder(group: HTMLElement, mode: string): HTMLElement[] {
  const rows = Array.from(group.querySelectorAll<HTMLElement>(".browse-row"));
  const direction = mode === "desc" ? "desc" : "asc";
  return rows.sort((a, b) =>
    compareNames(a.dataset.name ?? "", b.dataset.name ?? "", direction),
  );
}

function applySort(els: BrowseEls, mode: string): void {
  const table = els.table.querySelector("table");
  if (!table) return;
  for (const group of orderedGroups(els, mode)) {
    for (const row of rowsInOrder(group, mode)) group.appendChild(row);
    table.appendChild(group);
  }
}

async function fetchDescText(): Promise<Record<string, string>> {
  const res = await fetch(url("/feats/search-text.json"));
  return await res.json();
}

function shouldSkipDescLoad(ctx: Ctx): boolean {
  return ctx.destroyed || Boolean(ctx.descText.value);
}

async function fetchDescTextOrEmpty(): Promise<Record<string, string>> {
  try {
    return await fetchDescText();
  } catch {
    return {};
  }
}

async function loadDescText(ctx: Ctx): Promise<void> {
  if (shouldSkipDescLoad(ctx)) return;
  const descText = await fetchDescTextOrEmpty();
  if (ctx.destroyed) return;
  ctx.descText.value = descText;
}

function clearDebounce(ctx: Ctx): void {
  if (!ctx.debounce) return;
  clearTimeout(ctx.debounce);
  ctx.debounce = null;
}

function buildFilters(ctx: Ctx): void {
  const onChange = () => {
    clearDebounce(ctx);
    apply(ctx);
  };
  ctx.instances.system = trackSelect(
    createTomSelect(ctx.els.system, {
      maxItems: 1,
      plugins: ["clear_button"],
      placeholder: "Any system…",
      onChange,
    }),
  );
  ctx.instances.category = trackSelect(
    createTomSelect(ctx.els.category, {
      maxItems: 1,
      plugins: ["clear_button"],
      placeholder: "All categories…",
      onChange,
    }),
  );
  ctx.instances.tags = trackSelect(
    createTomSelect(ctx.els.tags, {
      plugins: ["remove_button"],
      placeholder: "Any tags…",
      onChange,
    }),
  );
  ctx.instances.sort = trackSelect(
    createTomSelect(ctx.els.sort, {
      maxItems: 1,
      onChange: () => {
        clearDebounce(ctx);
        applySort(ctx.els, ctx.els.sort.value);
        apply(ctx);
      },
    }),
  );
}

function clearSelections(ctx: Ctx): void {
  ctx.instances.system?.setValue("", true);
  ctx.instances.category?.setValue("", true);
  ctx.instances.tags?.setValue([], true);
}

function setIfPresent(inst: Selectable | null, value: string | string[]): void {
  if (value.length) inst?.setValue(value, true);
}

function restoreSelections(ctx: Ctx, state: BrowseState): void {
  setIfPresent(ctx.instances.system, state.system);
  setIfPresent(ctx.instances.category, state.category);
  setIfPresent(ctx.instances.tags, state.tags);
  ctx.els.desc.checked = state.desc;
  if (state.q) ctx.els.search.value = state.q;
}

function bindEvents(ctx: Ctx): void {
  ctx.els.search.addEventListener("input", () => {
    clearDebounce(ctx);
    ctx.debounce = setTimeout(() => apply(ctx), DEBOUNCE_MS);
  });
  ctx.els.desc.addEventListener("change", async () => {
    clearDebounce(ctx);
    if (ctx.els.desc.checked) await loadDescText(ctx);
    apply(ctx);
  });
  ctx.els.reset.addEventListener("click", () => {
    clearDebounce(ctx);
    ctx.els.search.value = "";
    ctx.els.desc.checked = false;
    clearSelections(ctx);
    apply(ctx);
  });
}

function initBrowseFilter(): void {
  const els = collectEls();
  if (!els) return;

  const categoryLabels = new Map<string, string>();
  for (const opt of Array.from(els.category.options)) {
    categoryLabels.set(opt.value, opt.text);
  }
  const ctx: Ctx = {
    els,
    noun: els.heading.dataset.browseNoun ?? "Entries",
    categoryLabels,
    instances: {},
    descText: { value: null },
    debounce: null,
    destroyed: false,
  };
  activeContexts.add(ctx);

  buildFilters(ctx);
  clearSelections(ctx);

  const state = parseBrowseParams(window.location.search);
  restoreSelections(ctx, state);
  bindEvents(ctx);

  const start = async () => {
    if (state.desc) await loadDescText(ctx);
    apply(ctx);
  };
  void start();
}

document.addEventListener("astro:page-load", initBrowseFilter);
