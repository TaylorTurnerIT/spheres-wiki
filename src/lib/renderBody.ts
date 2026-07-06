import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import remarkEntryLinks from "./remarkEntryLinks";

export type BodySegment =
  | { type: "markdown"; text: string }
  | { type: "base-ability"; id: string };

// Matches a standalone paragraph that is only [SomeName] — the base ability marker.
// Case-insensitive so authors can write [Shapeshift] or [shapeshift].
const MARKER_RE = /^\[([A-Za-z][A-Za-z0-9 -]*)\]\s*$/gm;

/**
 * Strips a trailing `*Source: Book*` line from a markdown body (V42).
 * Source attribution renders via metadata labels and sidebar callouts,
 * never inline in body text.
 */
export function stripBodySource(body: string): string {
  return body.replace(/\n\*Source:.+$/m, "").trimEnd();
}

export function splitBodyOnMarkers(body: string | undefined): BodySegment[] {
  if (!body) return [];
  const segments: BodySegment[] = [];
  MARKER_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MARKER_RE.exec(body)) !== null) {
    const before = body.slice(lastIndex, match.index).trim();
    if (before) segments.push({ type: "markdown", text: before });
    segments.push({
      type: "base-ability",
      id: match[1].toLowerCase().replace(/\s+/g, "-"),
    });
    lastIndex = match.index + match[0].length;
  }

  const after = body.slice(lastIndex).trim();
  if (after) segments.push({ type: "markdown", text: after });

  return segments;
}

const processor = (base: string) =>
  unified()
    .use(remarkParse)
    .use(remarkEntryLinks, { base })
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdownFragment(md: string): Promise<string> {
  const base = import.meta.env.BASE_URL;
  const file = await processor(base).process(md);
  return String(file);
}
