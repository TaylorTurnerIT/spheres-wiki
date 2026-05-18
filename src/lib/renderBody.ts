import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export type BodySegment =
  | { type: 'markdown'; text: string }
  | { type: 'base-ability'; id: string };

// Matches a standalone paragraph that is only [SomeName] — the base ability marker.
// Case-insensitive so authors can write [Shapeshift] or [shapeshift].
const MARKER_RE = /^\[([A-Za-z][A-Za-z0-9-]*)\]\s*$/gm;

export function splitBodyOnMarkers(body: string | undefined): BodySegment[] {
  if (!body) return [];
  const segments: BodySegment[] = [];
  MARKER_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MARKER_RE.exec(body)) !== null) {
    const before = body.slice(lastIndex, match.index).trim();
    if (before) segments.push({ type: 'markdown', text: before });
    segments.push({ type: 'base-ability', id: match[1].toLowerCase() });
    lastIndex = match.index + match[0].length;
  }

  const after = body.slice(lastIndex).trim();
  if (after) segments.push({ type: 'markdown', text: after });

  return segments;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

export async function renderMarkdownFragment(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}
