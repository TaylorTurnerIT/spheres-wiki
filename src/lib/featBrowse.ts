import { getCanonicalFeatCategory, getFeatUrl } from "./featCategories";
import { buildOrderedTagIds } from "./tags";
import type { BookMeta, FeatEntry, SphereEntry, TagEntry } from "./types";

export type FeatBrowseEntry = {
  id: string;
  key: string;
  name: string;
  href: string;
  system: string;
  category: string;
  categoryLabel: string;
  sphere?: string;
  sourceBook: string;
  sourceBookTitle: string;
  tags: string[];
  prerequisites?: string;
  excerpt: string;
};

const PREREQ_LINE_RE = /^\*\*Prerequisites?:\*\*\s*([^\n]+)$/im;
const LABEL_LINE_RE = /^\*\*(?:Prerequisites?|Benefits?|Special|Normal|Note|Cost):\*\*\s*/i;

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const end = lastSpace > maxLen * 0.4 ? lastSpace : maxLen;
  return `${cut.slice(0, end).trimEnd()}…`;
}

/** Extracts the `**Prerequisites:** ...` line from a raw feat markdown body, if present. */
export function extractPrerequisites(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const match = body.match(PREREQ_LINE_RE);
  if (!match) return undefined;
  const cleaned = stripMarkdownInline(match[1]);
  return cleaned || undefined;
}

/**
 * Derives a short, table-row-safe excerpt from a raw feat markdown body.
 * Skips the Prerequisites line and any leading label (Benefit:, Special:, etc.),
 * then takes the first non-empty paragraph, stripped of markdown syntax.
 */
export function extractExcerpt(body: string | undefined, maxLen = 160): string {
  if (!body) return "";
  const withoutPrereq = body.replace(PREREQ_LINE_RE, "").trim();
  const paragraphs = withoutPrereq
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const paragraph of paragraphs) {
    const cleaned = stripMarkdownInline(paragraph.replace(LABEL_LINE_RE, ""));
    if (cleaned) return truncate(cleaned, maxLen);
  }
  return "";
}

/**
 * Builds one lightweight browse-row record for a feat — metadata only, never the
 * full rendered body. `rawBody` should be the entry's raw (unrendered) markdown
 * source (`collEntry.body`), used only to derive prerequisites/excerpt text.
 */
export function buildFeatBrowseEntry(
  feat: FeatEntry,
  opts: {
    tagMap: Map<string, TagEntry>;
    bookMetaMap: Map<string, BookMeta>;
    sphereMap: Map<string, SphereEntry>;
    rawBody?: string;
    resolveUrl?: (path: string) => string;
  },
): FeatBrowseEntry {
  const { tagMap, bookMetaMap, sphereMap, rawBody } = opts;
  const resolveUrl = opts.resolveUrl ?? ((path: string) => path);

  const category = getCanonicalFeatCategory(feat, tagMap);
  const sphere = feat.sphere ? sphereMap.get(`sphere:${feat.sphere}`) : undefined;
  const categoryLabel = sphere?.name ?? tagMap.get(category)?.label ?? "General";

  return {
    id: feat.id,
    key: `${feat.sourceBook}:${feat.id}`,
    name: feat.name,
    href: resolveUrl(getFeatUrl(feat, tagMap)),
    system: feat.system,
    category,
    categoryLabel,
    sphere: feat.sphere,
    sourceBook: feat.sourceBook,
    sourceBookTitle: bookMetaMap.get(feat.sourceBook)?.title ?? feat.sourceBook,
    tags: buildOrderedTagIds(feat, bookMetaMap, tagMap, {
      showHidden: !!(feat.dualSphere && feat.dualSphere !== "any"),
    }),
    prerequisites: extractPrerequisites(rawBody),
    excerpt: extractExcerpt(rawBody),
  };
}
