/**
 * Shared TOC scroll-spy engine.
 *
 * Both sidebar TOC presentations (`TableOfContents.astro` grouped rail and
 * `ArticleTOC.astro` nested article tree) speak the same DOM contract —
 * `[data-toc-section]` categories containing `[data-toc-item]` sub-links —
 * and previously each carried its own copy of this logic. This module is the
 * single implementation; presentation-specific behavior (accordion animation,
 * sidebar auto-scroll) is supplied via hooks.
 */

const PRIORITY_CLASSES = [
  "talent-entry",
  "entry-card-block",
  "base-ability-block",
  "class-feature-block",
  "archetype-feature-block",
  "article-section",
  "wiki-note",
  "section-heading-text",
  "page-title",
  "class-traits-section",
  "equipment-section",
];

function hasPriorityClass(el: Element): boolean {
  return PRIORITY_CLASSES.some((cls) => el.classList.contains(cls));
}

function safeQuerySelectorAll(selector: string): Element[] {
  try {
    return [...document.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

function findTargetElement(id: string): HTMLElement | null {
  const candidates = safeQuerySelectorAll(`[id="${CSS.escape(id)}"]`);
  if (candidates.length === 0) {
    try {
      return document.getElementById(id);
    } catch {
      return null;
    }
  }
  const prioritized = candidates.find((el) => hasPriorityClass(el));
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
    .map((cat) => ({
      cat,
      heading: findTargetElement(cat.dataset.tocSection!),
      subLinks: [...cat.querySelectorAll<HTMLAnchorElement>("[data-toc-item]")],
    }))
    .filter((s): s is HeadingEntry => s.heading !== null);
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
  return (
    el.getBoundingClientRect().height > 0 &&
    el.getBoundingClientRect().top <= window.innerHeight * 0.15
  );
}

function findCurrentSubLink(
  headings: HeadingEntry[],
): HTMLAnchorElement | null {
  let active: HTMLAnchorElement | null = null;
  for (const link of headings.flatMap((h) => h.subLinks)) {
    const el = findTargetElement(link.dataset.tocItem!);
    if (el && isSubLinkInViewport(el)) active = link;
  }
  return active;
}

export interface TocEngineOptions {
  nav: HTMLElement;
  /** Applies the active-section state. Default: toggle `is-active` on categories. */
  applyActive?: (categories: HTMLElement[], active: HTMLElement | null) => void;
  /** Called after every state application (active section + sub-link resolved). */
  onChange?: (
    active: HTMLElement | null,
    activeSub: HTMLAnchorElement | null,
  ) => void;
}

export interface TocEngine {
  recalc: () => void;
  stop: () => void;
}

function defaultApplyActive(
  categories: HTMLElement[],
  active: HTMLElement | null,
) {
  for (const cat of categories) {
    cat.classList.toggle("is-active", cat === active);
  }
}

export function createTocEngine(opts: TocEngineOptions): TocEngine | null {
  const { nav, applyActive = defaultApplyActive, onChange } = opts;
  const categories = [
    ...nav.querySelectorAll<HTMLElement>("[data-toc-section]"),
  ];
  if (categories.length === 0) return null;
  const headings = resolveHeadings(categories);
  if (headings.length === 0) return null;

  const allSubLinks = [
    ...nav.querySelectorAll<HTMLAnchorElement>("[data-toc-item]"),
  ];

  function recalc() {
    const active = findCurrentSection(headings);
    const activeSub = findCurrentSubLink(headings);
    applyActive(categories, active);
    for (const link of allSubLinks)
      link.classList.toggle("is-current", link === activeSub);
    onChange?.(active, activeSub);
  }

  const observer = new IntersectionObserver(recalc, {
    rootMargin: "-5% 0px -5% 0px",
    threshold: [0, 1],
  });
  for (const { heading } of headings) observer.observe(heading);

  let rafPending = false;
  const scrollHandler = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      recalc();
      rafPending = false;
    });
  };
  window.addEventListener("scroll", scrollHandler, { passive: true });
  recalc();

  return {
    recalc,
    stop() {
      observer.disconnect();
      window.removeEventListener("scroll", scrollHandler);
    },
  };
}
