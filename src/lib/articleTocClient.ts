/**
 * Client-side TOC highlight logic. Imported as a side-effect by ArticlePage.astro
 * so it loads even when the ArticleTOC component is rendered inside <template> tags
 * (e.g. by TabbedContent.astro), where inline <script> blocks are inert.
 */
let activeObserver: IntersectionObserver | null = null;
let activeScrollHandler: (() => void) | null = null;

// ── DOM queries (extracted to bound cyclomatic complexity) ────────
const PRIORITY_CLASSES = [
  'talent-entry', 'base-ability-block', 'class-feature-block',
  'archetype-feature-block', 'article-section', 'wiki-note',
];

function hasPriorityClass(el: Element): boolean {
  return PRIORITY_CLASSES.some(cls => el.classList.contains(cls));
}

function safeQuerySelectorAll(selector: string): Element[] {
  try { return [...document.querySelectorAll(selector)]; }
  catch { return []; }
}

function findTargetElement(id: string): HTMLElement | null {
  const candidates = safeQuerySelectorAll(`[id="${CSS.escape(id)}"]`);
  if (candidates.length === 0) {
    try { return document.getElementById(id); }
    catch { return null; }
  }
  const prioritized = candidates.find(el => hasPriorityClass(el));
  if (prioritized) return prioritized as HTMLElement;
  return candidates[0] as HTMLElement;
}

interface HeadingEntry {
  cat: HTMLElement;
  heading: HTMLElement;
  subLinks: HTMLAnchorElement[];
}

function resolveHeadings(categories: HTMLElement[]): HeadingEntry[] {
  return categories
    .map(cat => ({
      cat,
      heading: findTargetElement(cat.dataset.tocSection!),
      subLinks: [...cat.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')],
    }))
    .filter((s): s is HeadingEntry => s.heading !== null);
}

// ── Section visibility helpers ────────────────────────────────────
function updateActiveSection(categories: HTMLElement[], active: HTMLElement | null) {
  for (const cat of categories) {
    cat.classList.toggle('is-active', cat === active);
  }
}

function isHeadingInViewportTop(el: HTMLElement): boolean {
  return el.getBoundingClientRect().top <= window.innerHeight * 0.25;
}

function findCurrentSection(headings: HeadingEntry[]): HTMLElement | null {
  if (headings.length === 0) return null;
  let current = headings[0].cat;
  for (const { cat, heading } of headings) {
    if (isHeadingInViewportTop(heading)) current = cat;
  }
  return current;
}

function isSubLinkInViewport(el: HTMLElement): boolean {
  return el.getBoundingClientRect().height > 0
      && el.getBoundingClientRect().top <= window.innerHeight * 0.15;
}

function findCurrentSubLink(headings: HeadingEntry[]): HTMLAnchorElement | null {
  let active: HTMLAnchorElement | null = null;
  for (const link of headings.flatMap(h => h.subLinks)) {
    const el = findTargetElement(link.dataset.tocItem!);
    if (el && isSubLinkInViewport(el)) active = link;
  }
  return active;
}

function updateSubLinkHighlight(allSubLinks: HTMLAnchorElement[], active: HTMLAnchorElement | null) {
  for (const link of allSubLinks) link.classList.toggle('is-current', link === active);
}

// ── Sidebar scroll ────────────────────────────────────────────────
// fallow-ignore-next-line complexity — two guards + two scroll directions
function scrollSidebarToActive(nav: HTMLElement) {
  const sidebar = nav.closest<HTMLElement>('.article-sidebar');
  const active = nav.querySelector<HTMLElement>('.is-active, .is-current');
  if (!sidebar || !active) return;
  const sb = sidebar.getBoundingClientRect();
  const el = active.getBoundingClientRect();
  const pad = 8;
  if (el.bottom > sb.bottom - pad) {
    sidebar.scrollBy({ top: el.bottom - sb.bottom + pad, behavior: 'auto' });
  } else if (el.top < sb.top + pad) {
    sidebar.scrollBy({ top: el.top - sb.top - pad, behavior: 'auto' });
  }
}

// ── Recalc handler ────────────────────────────────────────────────
function createRecalcHandler(
  nav: HTMLElement,
  categories: HTMLElement[],
  headings: HeadingEntry[],
  allSubLinks: HTMLAnchorElement[],
) {
  return () => {
    updateActiveSection(categories, findCurrentSection(headings));
    updateSubLinkHighlight(allSubLinks, findCurrentSubLink(headings));
    scrollSidebarToActive(nav);
  };
}

// ── Init / cleanup ────────────────────────────────────────────────
function initToc(nav: HTMLElement) {
  const categories = [...nav.querySelectorAll<HTMLElement>('[data-toc-section]')];
  if (categories.length === 0) return;
  const headings = resolveHeadings(categories);
  if (headings.length === 0) return;

  const allSubLinks = [...nav.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];
  const recalc = createRecalcHandler(nav, categories, headings, allSubLinks);

  activeObserver = new IntersectionObserver(recalc, {
    rootMargin: '-5% 0px -5% 0px',
    threshold: [0, 1],
  });
  for (const { heading } of headings) activeObserver.observe(heading);

  let rafPending = false;
  activeScrollHandler = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { recalc(); rafPending = false; });
  };
  window.addEventListener('scroll', activeScrollHandler, { passive: true });
  recalc();
}

function cleanup() {
  if (activeObserver) { activeObserver.disconnect(); activeObserver = null; }
  if (activeScrollHandler) {
    window.removeEventListener('scroll', activeScrollHandler);
    activeScrollHandler = null;
  }
}

(window as any).reinitArticleToc = () => {
  cleanup();
  const sidebar = document.getElementById('article-sidebar');
  const nav = sidebar?.querySelector<HTMLElement>('.article-toc');
  if (nav) initToc(nav);
};

document.addEventListener('article-toc:reinit', () => {
  (window as any).reinitArticleToc();
});

document.addEventListener('astro:page-load', () => {
  cleanup();
  const nav = document.querySelector<HTMLElement>('.article-toc');
  if (nav && !nav.closest('template')) initToc(nav);
});
