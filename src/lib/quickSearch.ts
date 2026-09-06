// Quick search logic: Pagefind query execution, dropdown rendering,
// keyboard navigation, and global search shortcut. Shared between
// the header search bar and the homepage hero search bar.

let pagefind: any;
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
  } catch (e) {
    console.error("Failed to load pagefind", e);
    return null;
  }
}

function formatResultTitle(meta: Record<string, any>): string {
  const title = meta.title || "Untitled";
  const { sphere, system, type } = meta;
  let display = title;
  if (sphere && type !== "sphere") display += ` — ${sphere}`;
  if (system) display += ` — ${system}`;
  return display;
}

function renderBadge(tag: string): string {
  const label = tag.toLowerCase() === "base" ? "Base Ability" : tag;
  return `<span class="search-badge">${label}</span>`;
}

function renderResultItem(r: any): string {
  const title = formatResultTitle(r.meta);
  const tags: string[] = r.meta.tags
    ? r.meta.tags.split(",").map((t: string) => t.trim())
    : [];
  const tierBadge = r.meta.tier
    ? `<span class="search-badge">${r.meta.tier}</span>`
    : "";
  const tagBadges = tags.map(renderBadge).join("");

  return `
    <a href="${r.url}" class="search-result-item" role="option" data-system="${r.meta.system || ""}">
      <div class="search-result-title">${title}</div>
      <div class="search-result-meta">${tierBadge}${tagBadges}</div>
      <div class="search-result-excerpt">${r.excerpt}</div>
    </a>
  `;
}

function renderResultsDropdown(
  results: any[],
  totalCount: number,
  q: string,
): string {
  const itemsHtml = results.map(renderResultItem).join("");
  const seeAllHtml =
    totalCount > 8
      ? `<a href="${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(q)}" class="search-see-all">See all ${totalCount} results →</a>`
      : "";
  return itemsHtml + seeAllHtml;
}

async function executeSearch(
  query: string,
  serial: number,
  signal: AbortSignal,
): Promise<{ results: any[]; totalCount: number } | null> {
  const pf = await getPagefind();
  if (signal.aborted || serial !== searchSerial || !pf) return null;
  const search = await pf.search(query);
  if (signal.aborted || serial !== searchSerial) return null;
  if (search.results.length === 0) return { results: [], totalCount: 0 };

  const totalCount = search.results.length;
  const rawResults = await Promise.all(
    search.results.slice(0, 8).map((r: any) => r.data()),
  );
  if (signal.aborted || serial !== searchSerial) return null;
  return { results: rawResults, totalCount };
}

function handleInputKey(
  e: KeyboardEvent,
  input: HTMLInputElement,
  resultsDiv: HTMLElement,
  setExpanded: (open: boolean) => void,
) {
  if (e.key === "Escape") {
    setExpanded(false);
    return;
  }
  if (e.key === "Enter") {
    const q = input.value.trim();
    if (q.length >= 2) {
      window.location.href = `${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(q)}`;
    }
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    resultsDiv.querySelector<HTMLAnchorElement>(".search-result-item")?.focus();
  }
}

function handleDropdownNav(
  e: KeyboardEvent,
  input: HTMLInputElement,
  resultsDiv: HTMLElement,
  setExpanded: (open: boolean) => void,
) {
  if (e.key === "Escape") {
    setExpanded(false);
    input.focus();
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const items = [
    ...resultsDiv.querySelectorAll<HTMLAnchorElement>(
      ".search-result-item, .search-see-all",
    ),
  ];
  if (!items.length) return;
  e.preventDefault();

  const idx = items.indexOf(document.activeElement as HTMLAnchorElement);
  if (e.key === "ArrowDown") {
    (items[idx + 1] ?? items[0]).focus();
  } else if (idx <= 0) {
    input.focus();
  } else {
    items[idx - 1].focus();
  }
}

export interface QuickSearchOptions {
  input: HTMLInputElement;
  resultsDiv: HTMLElement;
  iconBtn?: HTMLButtonElement | null;
  signal: AbortSignal;
}

export function attachQuickSearch({
  input,
  resultsDiv,
  iconBtn,
  signal,
}: QuickSearchOptions): void {
  function setExpanded(expanded: boolean) {
    input.setAttribute("aria-expanded", String(expanded));
    if (resultsDiv) resultsDiv.hidden = !expanded;
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

  input.addEventListener("focus", () => getPagefind(), { signal });
  input.addEventListener(
    "keydown",
    (e) => handleInputKey(e, input, resultsDiv, setExpanded),
    { signal },
  );

  input.addEventListener(
    "input",
    async (e) => {
      const query = (e.target as HTMLInputElement).value;
      const serial = ++searchSerial;
      if (query.length < 2) {
        setExpanded(false);
        return;
      }

      const outcome = await executeSearch(query, serial, signal);
      if (!outcome) return;

      if (outcome.totalCount === 0) {
        resultsDiv.innerHTML =
          '<div class="search-no-results">No results found</div>';
        resultsDiv.hidden = false;
        input.setAttribute("aria-expanded", "true");
        return;
      }

      resultsDiv.innerHTML = renderResultsDropdown(
        outcome.results,
        outcome.totalCount,
        input.value.trim(),
      );
      setExpanded(true);
    },
    { signal },
  );

  resultsDiv.addEventListener(
    "keydown",
    (e) => handleDropdownNav(e, input, resultsDiv, setExpanded),
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
