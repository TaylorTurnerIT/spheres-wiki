/**
 * Convert `[label](href)` markdown links in plain text to HTML anchors —
 * the shared policy for rendering tag descriptions (TagBadge tooltip data,
 * tags index rows). stripLinks=true drops the anchor and keeps the label,
 * for contexts that must not emit links.
 */
export function mdLinksToHtml(
  text: string,
  opts: { stripLinks?: boolean } = {},
): string {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    opts.stripLinks
      ? "$1"
      : '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}
