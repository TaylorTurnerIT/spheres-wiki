/**
 * Client-side TOC highlight logic for ArticleTOC. Imported as a side-effect by
 * ArticlePage.astro so it loads even when the ArticleTOC component is rendered
 * inside <template> tags (e.g. by TabbedContent.astro), where inline <script>
 * blocks are inert. Scroll-spy machinery lives in the shared tocEngine module.
 */
import { createTocEngine, type TocEngine } from "./tocEngine";

let engine: TocEngine | null = null;

// ── Sidebar scroll ────────────────────────────────────────────────
// fallow-ignore-next-line complexity
function scrollSidebarToActive(nav: HTMLElement) {
  const sidebar = nav.closest<HTMLElement>(".article-sidebar");
  const active =
    nav.querySelector<HTMLElement>(".is-current") ??
    nav.querySelector<HTMLElement>(".is-active .toc-cat-link");
  if (!sidebar || !active) return;
  const sb = sidebar.getBoundingClientRect();
  const el = active.getBoundingClientRect();
  const pad = 8;
  if (el.bottom > sb.bottom - pad) {
    sidebar.scrollBy({ top: el.bottom - sb.bottom + pad, behavior: "smooth" });
  } else if (el.top < sb.top + pad) {
    sidebar.scrollBy({ top: el.top - sb.top - pad, behavior: "smooth" });
  }
}

function initToc(nav: HTMLElement) {
  let lastActiveKey = "";
  engine = createTocEngine({
    nav,
    onChange(active, activeSub) {
      const key = `${active?.dataset.tocSection ?? ""}|${activeSub?.dataset.tocItem ?? ""}`;
      if (key !== lastActiveKey) {
        lastActiveKey = key;
        scrollSidebarToActive(nav);
      }
    },
  });
}

function cleanup() {
  engine?.stop();
  engine = null;
}

(window as any).reinitArticleToc = () => {
  cleanup();
  const sidebar = document.getElementById("article-sidebar");
  const nav = sidebar?.querySelector<HTMLElement>(".article-toc");
  if (nav) initToc(nav);
};

document.addEventListener("article-toc:reinit", () => {
  (window as any).reinitArticleToc();
});

document.addEventListener("astro:before-swap", cleanup);

document.addEventListener("astro:page-load", () => {
  cleanup();
  const nav = document.querySelector<HTMLElement>(".article-toc");
  if (nav && !nav.closest("template")) initToc(nav);
});
