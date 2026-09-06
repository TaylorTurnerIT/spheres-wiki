// src/lib/quickSearch.ts
// Unified quick-search client logic powering both header and hero search bars.
// Features categorized results, 32px icon/avatar alignment, relevance scoring,
// full keyboard navigation, and global '/' shortcut.

import {
  detectEntryType,
  groupSearchResults,
  type HeaderSearchItem,
  renderResultsPanel,
} from "@/lib/headerSearchClient";

const classImages = import.meta.glob<{ default: { src: string } }>(
  "../assets/class-images/*.png",
  { eager: true },
);
const classImageMap: Record<string, string> = Object.fromEntries(
  Object.entries(classImages).map(([p, mod]) => [
    p.split("/").pop()?.split(".")[0] ?? "",
    mod.default.src,
  ]),
);

let pagefind: any;
let browseManifest: any[] = [];
let browseManifestPromise: Promise<void> | null = null;
let searchSerial = 0;

async function getPagefind(): Promise<any> {
  if (pagefind) return pagefind;
  try {
    pagefind = await import(
      /* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`
    );
    await pagefind.options({ excerptLength: 20 });
    await pagefind.init();
    return pagefind;
  } catch {
    return null;
  }
}

async function loadBrowseManifest(): Promise<void> {
  if (browseManifest.length > 0) return;
  if (!browseManifestPromise) {
    browseManifestPromise = fetch(`${import.meta.env.BASE_URL}search/data.json`)
      .then((r) => r.json())
      .then((entries: any[]) => {
        browseManifest = entries;
      })
      .catch(() => {});
  }
  await browseManifestPromise;
}

// fallow-ignore-next-line complexity
function handleSearchKeydown(
  e: KeyboardEvent,
  input: HTMLInputElement,
  resultsDiv: HTMLElement,
  selectedIndex: number,
  updateSelection: (idx: number) => void,
  setExpanded: (expanded: boolean) => void,
): void {
  if (e.key === "Escape") {
    setExpanded(false);
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (resultsDiv.hidden) {
      setExpanded(true);
    } else {
      updateSelection(selectedIndex + 1);
    }
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!resultsDiv.hidden) {
      updateSelection(selectedIndex - 1);
    }
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const items = [
      ...resultsDiv.querySelectorAll<HTMLAnchorElement>(".search-panel-item"),
    ];
    if (selectedIndex >= 0 && items[selectedIndex]) {
      window.location.href = items[selectedIndex].href;
      return;
    }
    const q = input.value.trim();
    if (q.length >= 2) {
      window.location.href = `${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(q)}`;
    }
  }
}

function matchesManifestEntry(entry: any, qLower: string): boolean {
  return (
    (entry.title || "").toLowerCase().includes(qLower) ||
    (entry.sphere || "").toLowerCase().includes(qLower) ||
    (entry.subtitle || "").toLowerCase().includes(qLower) ||
    (entry.tags || "").toLowerCase().includes(qLower)
  );
}

function toManifestSearchItem(entry: any): HeaderSearchItem {
  const tagList = entry.tags
    ? entry.tags
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  return {
    url: entry.url,
    title: entry.title,
    type: entry.type,
    sphere: entry.sphere,
    system: entry.system,
    icon: entry.icon,
    talentCount: entry.talentCount,
    subtitle: entry.subtitle,
    tags: tagList,
    tier: entry.tier,
  };
}

// fallow-ignore-next-line complexity
function queryBrowseManifest(
  query: string,
  seenUrls: Set<string>,
): HeaderSearchItem[] {
  if (browseManifest.length === 0) return [];
  const qLower = query.toLowerCase();
  const items: HeaderSearchItem[] = [];

  for (const entry of browseManifest) {
    if (matchesManifestEntry(entry, qLower)) {
      items.push(toManifestSearchItem(entry));
      seenUrls.add(entry.url);
    }
  }
  return items;
}

// fallow-ignore-next-line complexity
function toPagefindSearchItem(r: any): HeaderSearchItem {
  const meta = r.meta || {};
  const type = detectEntryType(meta.type, r.url);
  const tags = meta.tags
    ? meta.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];
  return {
    url: r.url,
    title: meta.title || "Untitled",
    type,
    sphere: meta.sphere,
    system: meta.system,
    tier: meta.tier,
    tags,
    icon: meta.icon,
    talentCount: meta.talentCount ? parseInt(meta.talentCount, 10) : undefined,
    subtitle: meta.subtitle,
  };
}

// fallow-ignore-next-line complexity
async function queryPagefind(
  query: string,
  seenUrls: Set<string>,
  signal: AbortSignal,
  serial: number,
): Promise<{ items: HeaderSearchItem[]; total: number }> {
  const pf = await getPagefind();
  if (!pf || signal.aborted || serial !== searchSerial) {
    return { items: [], total: 0 };
  }
  try {
    const search = await pf.search(query);
    if (signal.aborted || serial !== searchSerial) {
      return { items: [], total: 0 };
    }
    const top = search.results.slice(0, 20);
    const rawData = await Promise.all(top.map((r: any) => r.data()));
    if (signal.aborted || serial !== searchSerial) {
      return { items: [], total: 0 };
    }
    const items: HeaderSearchItem[] = [];
    for (const r of rawData) {
      if (r.url.endsWith("#overview") || seenUrls.has(r.url)) continue;
      items.push(toPagefindSearchItem(r));
      seenUrls.add(r.url);
    }
    return { items, total: search.results.length };
  } catch {
    return { items: [], total: 0 };
  }
}

export interface QuickSearchOptions {
  input: HTMLInputElement;
  resultsDiv: HTMLElement;
  iconBtn?: HTMLButtonElement | null;
  signal: AbortSignal;
}

// fallow-ignore-next-line complexity
export function attachQuickSearch({
  input,
  resultsDiv,
  iconBtn,
  signal,
}: QuickSearchOptions): void {
  let selectedIndex = -1;
  let totalItems = 0;

  function setExpanded(expanded: boolean) {
    input.setAttribute("aria-expanded", String(expanded));
    if (resultsDiv) resultsDiv.hidden = !expanded;
    if (!expanded) {
      selectedIndex = -1;
    }
  }

  function updateSelection(idx: number) {
    const items = [
      ...resultsDiv.querySelectorAll<HTMLAnchorElement>(".search-panel-item"),
    ];
    totalItems = items.length;
    if (totalItems === 0) {
      selectedIndex = -1;
      return;
    }
    if (idx < 0) idx = 0;
    if (idx >= totalItems) idx = totalItems - 1;
    selectedIndex = idx;

    items.forEach((item, i) => {
      const isSelected = i === selectedIndex;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-selected", String(isSelected));
      if (isSelected) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  iconBtn?.addEventListener(
    "click",
    () => {
      const q = input.value.trim();
      window.location.href =
        q.length >= 2
          ? `${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(q)}`
          : `${import.meta.env.BASE_URL}search/`;
    },
    { signal },
  );

  input.addEventListener(
    "focus",
    () => {
      void getPagefind();
      void loadBrowseManifest();
      if (input.value.trim().length >= 2) {
        setExpanded(true);
      }
    },
    { signal },
  );

  input.addEventListener(
    "keydown",
    (e) => {
      handleSearchKeydown(
        e,
        input,
        resultsDiv,
        selectedIndex,
        updateSelection,
        setExpanded,
      );
    },
    { signal },
  );

  input.addEventListener(
    "input",
    async (e) => {
      const query = (e.target as HTMLInputElement).value.trim();
      const serial = ++searchSerial;
      if (query.length < 2) {
        setExpanded(false);
        return;
      }

      await Promise.all([getPagefind(), loadBrowseManifest()]);
      if (signal.aborted || serial !== searchSerial) return;

      const seenUrls = new Set<string>();
      const manifestItems = queryBrowseManifest(query, seenUrls);
      const { items: pfItems, total: totalPfMatches } = await queryPagefind(
        query,
        seenUrls,
        signal,
        serial,
      );
      if (signal.aborted || serial !== searchSerial) return;

      const searchItems = [...manifestItems, ...pfItems];
      const groups = groupSearchResults(searchItems, query);
      const totalCount = Math.max(searchItems.length, totalPfMatches);
      const { html, totalRendered } = renderResultsPanel(
        groups,
        classImageMap,
        query,
        totalCount,
      );

      resultsDiv.innerHTML = html;
      totalItems = totalRendered;
      selectedIndex = totalRendered > 0 ? 0 : -1;
      setExpanded(true);
    },
    { signal },
  );

  resultsDiv.addEventListener(
    "mousemove",
    (e) => {
      const item = (e.target as HTMLElement).closest(
        ".search-panel-item",
      ) as HTMLAnchorElement | null;
      if (!item) return;
      const idx = parseInt(item.dataset.idx || "-1", 10);
      if (idx >= 0 && idx !== selectedIndex) {
        updateSelection(idx);
      }
    },
    { signal },
  );

  document.addEventListener(
    "click",
    (e) => {
      if (
        !input.contains(e.target as Node) &&
        !resultsDiv.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    },
    { signal },
  );
}

function isEditableTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function focusActiveSearchInput(): void {
  const heroInput = document.getElementById(
    "hero-search-input",
  ) as HTMLInputElement | null;
  const headerInput = document.getElementById(
    "page-search",
  ) as HTMLInputElement | null;
  const headerAnchor = document.querySelector(
    ".header-search-anchor",
  ) as HTMLElement | null;

  const preferHero =
    heroInput && !headerAnchor?.classList.contains("is-scrolled-in");
  const targetInput = preferHero ? heroInput : headerInput;

  if (targetInput) {
    targetInput.focus();
    targetInput.select();
  }
}

export function attachGlobalSearchShortcut(signal: AbortSignal): void {
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target as HTMLElement | null)) return;
      e.preventDefault();
      focusActiveSearchInput();
    },
    { signal },
  );
}
