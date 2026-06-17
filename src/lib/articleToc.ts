/** Invisible marker `remarkStripTocFlags` substitutes for `{.toc-exclude}`.
 *  Survives into Astro's `headings` array (unlike plain stripping, which
 *  runs before Astro collects headings) but renders as nothing on the page. */
export const EXCLUDE_SENTINEL = "​";

export interface TocNode {
  id: string;
  label: string;
  depth: number;
  children: TocNode[];
}

export interface RenderedHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * Turns Astro's flat `headings` array (from `render(entry)`) into a nested
 * tree. A heading becomes a child of the nearest still-open ancestor with a
 * strictly shallower depth; otherwise it starts a new root. This handles
 * non-monotonic depth jumps (h2 -> h5 directly, a later h2 sibling after a
 * deep h3 subtree, etc.) with no fixed level mapping.
 */
export function buildTocTree(headings: RenderedHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const h of headings) {
    if (h.text.includes(EXCLUDE_SENTINEL)) continue;

    // Normalize: H1+H2 → root (depth 2), H3+ → one child level (depth 3)
    const depth = h.depth <= 2 ? 2 : 3;

    const label = h.text.replaceAll(EXCLUDE_SENTINEL, "").trim();
    const node: TocNode = { id: h.slug, label, depth, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}
