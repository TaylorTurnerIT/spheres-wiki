// Search page client: browse-all rendering, Pagefind queries, TomSelect
// filters, and URL param sync. Loaded by pages/search/index.astro.

import { SYSTEMS } from "@/config/site";
import { createTomSelect } from "@/lib/tomSelectInit";

const PAGE_SIZE = 40;
const MAX_RESULTS = 500;

function requireSearchElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing search element: #${id}`);
  return element as T;
}

// Keyed by the Pagefind filter label; derived from the SYSTEMS registry (V53).
// Champions gets a shortened display label for result cards.
const SYSTEM_MAP: Record<
  string,
  { label: string; key: string; cssKey: string }
> = Object.fromEntries(
  Object.entries(SYSTEMS).map(([id, sys]) => [
    sys.label,
    {
      label: id === "champions" ? "Champions" : sys.label,
      key: id,
      cssKey: sys.cssKey,
    },
  ]),
);

const TYPE_LABELS: Record<string, string> = {
  sphere: "Sphere",
  talent: "Talent",
  feat: "Feat",
  class: "Class",
  archetype: "Archetype",
  article: "Article",
  "class-trait": "Trait",
  drawback: "Drawback",
  boon: "Boon",
  tradition: "Tradition",
};

const TYPE_ORDER = [
  "sphere",
  "talent",
  "feat",
  "class",
  "archetype",
  "article",
  "class-trait",
  "drawback",
  "boon",
  "tradition",
];

let pagefind: any;
let browseManifest: any[] = [];
let allData: any[] = [];
let displayCount = PAGE_SIZE;
let activeSystem: string | null = null;
let activeType: string | null = null;
let activeSphere: string | null = null;
let activeTag: string | null = null;
let tsInstances: Record<string, any> = {};
let browseAll = false;
let tagTemplates: Record<string, string> = {};

let browseManifestPromise: Promise<void> | null = null;

async function loadBrowseManifest() {
  if (browseManifest.length > 0) return;
  if (!browseManifestPromise) {
    browseManifestPromise = fetch(`${import.meta.env.BASE_URL}search/data.json`)
      .then((r) => r.json())
      .then((entries: any[]) => {
        browseManifest = entries.map((e: any) => ({
          url: e.url,
          meta: {
            title: e.title,
            system: e.system,
            type: e.type,
            sphere: e.sphere ?? "",
            tags: e.tags ?? "",
          },
          excerpt: "",
        }));
      });
  }
  await browseManifestPromise;
}

async function loadPagefind() {
  if (pagefind) return;
  pagefind = await import(
    /* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`
  );
  await pagefind.options({ excerptLength: 30 });
  await pagefind.init();
}

// fallow-ignore-next-line complexity
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get("q") ?? "",
    system: p.get("system") ?? "",
    type: p.get("type") ?? "",
    sphere: p.get("sphere") ?? "",
    tag: p.get("tag") ?? "",
  };
}

// fallow-ignore-next-line complexity
function pushParams(
  q: string,
  system: string,
  type: string,
  sphere: string,
  tag: string,
) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (system) p.set("system", system);
  if (type) p.set("type", type);
  if (sphere) p.set("sphere", sphere);
  if (tag) p.set("tag", tag);
  const qs = p.toString();
  history.replaceState(
    history.state,
    "",
    qs ? `?${qs}` : window.location.pathname,
  );
}

function systemKeyToMeta(key: string): string {
  return Object.entries(SYSTEM_MAP).find(([, v]) => v.key === key)?.[0] ?? key;
}

function parseTags(raw: string): string[] {
  return raw
    ? raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
}

function filtered() {
  // fallow-ignore-next-line complexity
  return allData.filter((r) => {
    if (
      activeSystem &&
      systemKeyToMeta(activeSystem) !== (r.meta?.system ?? "")
    )
      return false;
    if (activeType && (r.meta?.type ?? "") !== activeType) return false;
    if (activeSphere && (r.meta?.sphere ?? "") !== activeSphere) return false;
    if (activeTag && !parseTags(r.meta?.tags ?? "").includes(activeTag))
      return false;
    return true;
  });
}

// fallow-ignore-next-line complexity
function renderResults() {
  const results = filtered();
  const resultsEl = requireSearchElement<HTMLElement>("sp-results");
  const statusEl = requireSearchElement<HTMLElement>("sp-status");
  const loadMoreEl = requireSearchElement<HTMLButtonElement>("sp-load-more");

  const total = allData.length;
  const filteredTotal = results.length;
  const showing = results.slice(0, displayCount);
  const hasMore = results.length > displayCount;

  statusEl.className = "sp-status";
  statusEl.hidden = false;
  statusEl.textContent =
    filteredTotal === 0
      ? "No results found."
      : filteredTotal === total
        ? `${total} result${total === 1 ? "" : "s"}`
        : `${filteredTotal} of ${total} result${total === 1 ? "" : "s"}`;

  const input = document.getElementById("sp-input");
  input?.setAttribute("aria-expanded", String(showing.length > 0));

  if (filteredTotal === 0) {
    resultsEl.innerHTML = `<div class="sp-empty">No results for this query.</div>`;
    loadMoreEl.hidden = true;
    return;
  }

  resultsEl.innerHTML = showing
    // fallow-ignore-next-line complexity
    .map((r) => {
      const title = r.meta?.title ?? "Untitled";
      const system = r.meta?.system ?? "";
      const type = r.meta?.type ?? "";
      const sphere = r.meta?.sphere ?? "";
      const sysEntry = SYSTEM_MAP[system];
      const typeLabel = TYPE_LABELS[type] ?? type;
      const tier = r.meta?.tier ?? "";

      // Per-card system color — cascades to .talent-name (--clr-active) and tier tags (--clr-ns)
      const cssColor = sysEntry
        ? `var(--clr-${sysEntry.cssKey})`
        : "var(--clr-brand)";

      // Source label: keep sphere names in the tag row so they can share system color.
      let sourceLabel = "";
      if (type === "sphere") {
        sourceLabel = sysEntry?.label ?? "";
      } else if (sphere) {
        sourceLabel = typeLabel;
      } else {
        sourceLabel = sysEntry ? `${sysEntry.label} · ${typeLabel}` : typeLabel;
      }

      // Build tag list with real tag IDs for both pagefind and browse-all results.
      // browse-all: buildOrderedTagIds already includes type + tier tags.
      // pagefind:   r.meta.tags has raw frontmatter tags only; inject type + tier by ID.
      let tags = parseTags(r.meta?.tags ?? "");
      if (type && type !== "sphere" && !tags.includes(type))
        tags = [type, ...tags];
      if (tier && !tags.includes(tier)) tags = [tier, ...tags];

      const tagHtml = tags
        .map((t) => {
          const templateHtml = tagTemplates[t];
          if (templateHtml) return templateHtml;
          // Fallback for tags without a pre-rendered template
          const displayMap: Record<string, string> = {
            extraordinary: "Extraordinary",
            supernatural: "Supernatural",
            "spell-like": "Spell-Like",
            base: "Base Ability",
          };
          const display = displayMap[t.toLowerCase()] || t;
          return `<span class="tag-wrapper"><span class="talent-tag" data-tag="${t}">${display}</span></span>`;
        })
        .join("");
      const sphereTagHtml =
        sphere && type !== "sphere"
          ? `<span class="tag-wrapper"><span class="talent-tag" data-tag="sphere-name" style="--tag-clr: var(--clr-ns)">${sphere}</span></span>`
          : "";
      const headerTagHtml = `${sphereTagHtml}${tagHtml}`;

      return `<a href="${r.url}" class="sp-result accent-card" role="option" style="--clr-active: ${cssColor}; --clr-ns: ${cssColor}">
      <div class="talent-header">
        <div class="talent-header-top">
          <span class="talent-name">${title}</span>
          ${sourceLabel ? `<span class="talent-source">${sourceLabel}</span>` : ""}
        </div>
        ${headerTagHtml ? `<div class="talent-header-bottom">${headerTagHtml}</div>` : ""}
      </div>
      ${r.excerpt ? `<div class="sp-result-excerpt">${r.excerpt}</div>` : ""}
    </a>`;
    })
    .join("");

  loadMoreEl.hidden = !hasMore;
}

// fallow-ignore-next-line complexity
function makeOnChange(key: string) {
  // fallow-ignore-next-line complexity
  return (val: string) => {
    const input = document.getElementById("sp-input") as HTMLInputElement;
    if (key === "system") activeSystem = val || null;
    if (key === "type") activeType = val || null;
    if (key === "sphere") activeSphere = val || null;
    if (key === "tag") activeTag = val || null;
    displayCount = PAGE_SIZE;
    const query = input.value.trim();
    pushParams(
      query,
      activeSystem ?? "",
      activeType ?? "",
      activeSphere ?? "",
      activeTag ?? "",
    );

    if (query.length >= 2) {
      // Re-filter existing search results — no need to re-fetch
      renderResults();
    } else {
      // No query — browse-all with current filters (or all pages if none)
      void search(null, activeSearchSignal ?? undefined);
    }
  };
}

function initTomSelects(
  staticSpheres: string[],
  staticTags: { value: string; text: string }[],
) {
  Object.values(tsInstances).forEach((ts) => {
    try {
      ts.destroy();
    } catch {}
  });
  tsInstances = {};

  const makeTs = (
    id: string,
    key: string,
    placeholder: string,
    opts: { value: string; text: string }[],
  ) => {
    const ts = createTomSelect(id, {
      maxItems: 1,
      plugins: ["clear_button"],
      placeholder,
      create: false,
      options: opts,
      onChange: makeOnChange(key),
    });
    if (ts) tsInstances[key] = ts;
  };

  const systemOpts = Object.values(SYSTEM_MAP).map((e) => ({
    value: e.key,
    text: e.label,
  }));
  const typeOpts = TYPE_ORDER.filter((t) => t in TYPE_LABELS).map((t) => ({
    value: t,
    text: TYPE_LABELS[t],
  }));
  const sphereOpts = staticSpheres.map((s) => ({ value: s, text: s }));

  makeTs("sp-system-select", "system", "Any system…", systemOpts);
  makeTs("sp-type-select", "type", "Any type…", typeOpts);
  makeTs("sp-sphere-select", "sphere", "Any sphere…", sphereOpts);
  makeTs("sp-tag-select", "tag", "Any tag…", staticTags);

  // Swap the server-rendered stand-in wrappers for the real TomSelect
  // controls in the same tick — same geometry, no layout shift (V-CLS).
  for (const id of [
    "sp-system-select",
    "sp-type-select",
    "sp-sphere-select",
    "sp-tag-select",
  ]) {
    document.getElementById(`${id}-placeholder`)?.remove();
  }
}

let searchSerial = 0;
let activeSearchSignal: AbortSignal | null = null;

// fallow-ignore-next-line complexity
async function search(query: string | null, signal?: AbortSignal) {
  const requestSerial = ++searchSerial;
  if (signal?.aborted) return;
  const statusEl = requireSearchElement<HTMLElement>("sp-status");
  const resultsEl = requireSearchElement<HTMLElement>("sp-results");
  browseAll = query === null;

  statusEl.hidden = false;
  statusEl.className = "sp-status loading";
  statusEl.textContent = browseAll ? "Loading" : "Searching";
  if (!browseAll) {
    resultsEl.innerHTML = "";
    requireSearchElement<HTMLElement>("sp-load-more").hidden = true;
  }

  if (browseAll) {
    // Keep the server-rendered first cards visible while the manifest
    // loads; clearing here would paint a collapsed page and shift the
    // footer when the full list renders (measured CLS 0.12).
    try {
      await loadBrowseManifest();
    } catch {
      return;
    }
    if (signal?.aborted || requestSerial !== searchSerial) return;
    allData = browseManifest;
    displayCount = PAGE_SIZE;
    renderResults();
    return;
  }

  await loadPagefind();
  if (signal?.aborted || requestSerial !== searchSerial) return;
  const result = await pagefind.search(query);
  if (signal?.aborted || requestSerial !== searchSerial) return;
  const top = result.results.slice(0, MAX_RESULTS);
  const data = await Promise.all(top.map((r: any) => r.data()));
  if (signal?.aborted || requestSerial !== searchSerial) return;
  // Filter out the `#overview` sub-results which duplicate the main page result
  allData = data.filter((r: any) => !r.url.endsWith("#overview"));
  displayCount = PAGE_SIZE;

  renderResults();
}

let cleanupSearchPage = () => {};

document.addEventListener("astro:before-swap", () => {
  cleanupSearchPage();
  cleanupSearchPage = () => {};
});

// fallow-ignore-next-line complexity
document.addEventListener("astro:page-load", () => {
  cleanupSearchPage();
  const input = document.getElementById("sp-input") as HTMLInputElement;
  if (!input) {
    activeSearchSignal = null;
    return;
  }

  const controller = new AbortController();
  const { signal } = controller;
  activeSearchSignal = signal;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let fastFollowTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: IntersectionObserver | null = null;

  // Reset state on each navigation
  activeSystem = null;
  activeType = null;
  activeSphere = null;
  activeTag = null;
  allData = [];
  browseAll = false;

  // Read static build-time data
  const dataEl = document.getElementById("sp-data") as HTMLElement;
  const staticSpheres: string[] = JSON.parse(dataEl?.dataset.spheres ?? "[]");
  const staticTags: { value: string; text: string }[] = JSON.parse(
    dataEl?.dataset.tags ?? "[]",
  );

  tagTemplates = {};
  document.querySelectorAll("[data-tag-template]").forEach((el) => {
    const key = el.getAttribute("data-tag-template");
    if (key) {
      tagTemplates[key] = el.innerHTML;
    }
  });

  initTomSelects(staticSpheres, staticTags);

  // Restore from URL params
  const { q, system, type, sphere, tag } = getParams();
  if (system) {
    activeSystem = system;
    tsInstances.system?.setValue(system, true);
  }
  if (type) {
    activeType = type;
    tsInstances.type?.setValue(type, true);
  }
  if (sphere) {
    activeSphere = sphere;
    tsInstances.sphere?.setValue(sphere, true);
  }
  if (tag) {
    activeTag = tag;
    tsInstances.tag?.setValue(tag, true);
  }

  if (q) {
    input.value = q;
    void search(q, signal);
  } else {
    // Defer the browse-all render past the load window: the six
    // server-rendered cards hold the page stable, and rendering the full
    // list during load dominated TBT (measured 549ms vs 300 budget).
    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
        : setTimeout(cb, 200);
    idle(() => {
      if (!signal.aborted) void search(null, signal);
    });
  }

  input.addEventListener(
    "input",
    // fallow-ignore-next-line complexity
    () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const val = input.value.trim();
      pushParams(
        val,
        activeSystem ?? "",
        activeType ?? "",
        activeSphere ?? "",
        activeTag ?? "",
      );
      if (val.length < 2) {
        if (debounceTimer) clearTimeout(debounceTimer);
        void search(null, signal); // browse-all with current filters (or all pages)
        return;
      }
      debounceTimer = setTimeout(() => void search(val, signal), 220);
    },
    { signal },
  );

  input.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        (
          document.querySelector(".sp-result") as HTMLAnchorElement | null
        )?.focus();
      }
    },
    { signal },
  );

  requireSearchElement<HTMLElement>("sp-results").addEventListener(
    "keydown",
    // fallow-ignore-next-line complexity
    (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [
        ...document.querySelectorAll<HTMLAnchorElement>(".sp-result"),
      ];
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        (items[idx + 1] ?? items[0]).focus();
      } else {
        e.preventDefault();
        if (idx <= 0) input.focus();
        else items[idx - 1].focus();
      }
    },
    { signal },
  );

  const loadMoreEl = document.getElementById("sp-load-more");
  if (loadMoreEl) {
    observer = new IntersectionObserver(
      (entries) => {
        if (signal.aborted) return;
        if (entries[0].isIntersecting && !loadMoreEl.hidden) {
          displayCount += PAGE_SIZE;
          renderResults();

          // Fast-follow check in case one chunk isn't enough to push sentinel off-screen
          fastFollowTimer = setTimeout(() => {
            if (signal.aborted) return;
            if (
              !loadMoreEl.hidden &&
              loadMoreEl.getBoundingClientRect().top < window.innerHeight + 800
            ) {
              displayCount += PAGE_SIZE;
              renderResults();
            }
          }, 50);
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(loadMoreEl);
  }

  cleanupSearchPage = () => {
    searchSerial += 1;
    controller.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (fastFollowTimer) clearTimeout(fastFollowTimer);
    observer?.disconnect();
    Object.values(tsInstances).forEach((ts) => {
      try {
        ts.destroy();
      } catch {}
    });
    tsInstances = {};
    if (activeSearchSignal === signal) activeSearchSignal = null;
  };
});
