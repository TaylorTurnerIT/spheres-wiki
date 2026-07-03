import { getCanonicalFeatCategory, getFeatUrl } from "./featCategories";
import { buildOrderedTagIds } from "./tags";
import { url } from "./url";
import type { BookMeta, FeatEntry, SphereEntry, TagEntry } from "./types";

export type FeatBrowseRow = {
  id: string;
  name: string;
  system: string;
  category: string;
  categoryLabel: string;
  sphere?: string;
  sphereLabel?: string;
  sourceBookTitle: string;
  tagIds: string[];
  prerequisites: string;
  excerpt: string;
  href: string;
};

const LABEL_LINE_RE =
  /^\*{0,2}Prerequisites?:\*{0,2}\s*(.+)$/im;

const LEADING_LABEL_RE = /^(?:Benefits?|Special|Note|Normal):\s*/i;

/** Strips inline Markdown formatting down to plain, readable text. */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Derives a short plain-text excerpt and prerequisites line from a feat's raw
 * markdown body — without a full remark/rehype render. Keeps the browse
 * manifest small: only short derived strings are embedded, never full bodies.
 */
export function deriveFeatSummary(body: string | undefined): {
  prerequisites: string;
  excerpt: string;
} {
  if (!body) return { prerequisites: "", excerpt: "" };

  const normalized = body.replace(/\r\n/g, "\n").trim();
  const prereqMatch = normalized.match(LABEL_LINE_RE);
  const prerequisites = prereqMatch
    ? truncate(stripMarkdownInline(prereqMatch[1]), 200)
    : "";

  const rest = prereqMatch
    ? normalized.slice(0, prereqMatch.index) +
      normalized.slice(prereqMatch.index! + prereqMatch[0].length)
    : normalized;

  const cleaned = stripMarkdownInline(rest).replace(LEADING_LABEL_RE, "");
  const excerpt = truncate(cleaned, 160);

  return { prerequisites, excerpt };
}

/** Category label for display: category tag label, sphere name, or a title-cased fallback. */
export function getFeatCategoryLabel(
  category: string,
  tagMap: Map<string, TagEntry>,
  sphereMap: Map<string, SphereEntry>,
): string {
  const tag = tagMap.get(category);
  if (tag?.featCategory) return tag.label;
  const sphere = sphereMap.get(`sphere:${category}`);
  if (sphere) return sphere.name;
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function buildFeatBrowseRow(
  feat: FeatEntry,
  ctx: {
    tagMap: Map<string, TagEntry>;
    bookMetaMap: Map<string, BookMeta>;
    sphereMap: Map<string, SphereEntry>;
    body: string | undefined;
  },
): FeatBrowseRow {
  const { tagMap, bookMetaMap, sphereMap, body } = ctx;
  const category = getCanonicalFeatCategory(feat, tagMap);
  const sphere = feat.sphere ? sphereMap.get(`sphere:${feat.sphere}`) : undefined;
  const { prerequisites, excerpt } = deriveFeatSummary(body);

  return {
    id: feat.id,
    name: feat.name,
    system: feat.system,
    category,
    categoryLabel: getFeatCategoryLabel(category, tagMap, sphereMap),
    sphere: feat.sphere,
    sphereLabel: sphere?.name,
    sourceBookTitle: bookMetaMap.get(feat.sourceBook)?.title ?? feat.sourceBook,
    tagIds: buildOrderedTagIds(feat, bookMetaMap, tagMap, {
      showHidden: !!(feat.dualSphere && feat.dualSphere !== "any"),
    }),
    prerequisites,
    excerpt,
    href: url(getFeatUrl(feat, tagMap)),
  };
}

export function buildFeatBrowseRows(
  feats: FeatEntry[],
  ctx: {
    tagMap: Map<string, TagEntry>;
    bookMetaMap: Map<string, BookMeta>;
    sphereMap: Map<string, SphereEntry>;
    bodies: Map<string, string | undefined>;
  },
): FeatBrowseRow[] {
  const { bodies, ...rest } = ctx;
  return feats
    .map((feat) =>
      buildFeatBrowseRow(feat, {
        ...rest,
        body: bodies.get(`${feat.sourceBook}:${feat.id}`),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
