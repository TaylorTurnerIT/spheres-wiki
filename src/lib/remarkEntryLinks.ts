import { visit } from "unist-util-visit";
import { getEntryUrl, getEntryUrlByName } from "./entryDatabase.js";

interface Options {
  base?: string;
}

const ENTRY_TYPES =
  "talent|feat|sphere|class|ability|article|archetype|class-trait|tag";

function prefixInternalPath(value: string, base: string): string {
  if (!value.startsWith("/") || value.startsWith(base)) return value;
  const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${basePath}${value}`;
}

function resolveExplicitEntryLink(value: string, base: string): string | null {
  const match = value.match(new RegExp(`^@(?:(\\w+):)?(${ENTRY_TYPES}):(.+)$`));
  if (!match) return null;

  const [, system, rawType, rawId] = match;
  const type = rawType === "ability" ? "talent" : rawType;
  const [id, fragment] = rawId.split("#", 2);
  const resolved = getEntryUrl(type, id, base, system);
  return resolved && fragment ? `${resolved}#${fragment}` : resolved;
}

function replaceEntryAndInternalLinks(value: string, base: string): string {
  return value.replace(/href=(["'])([^"']*)\1/g, (_attribute, quote, href) => {
    if (href.startsWith("@")) {
      const resolved = resolveExplicitEntryLink(href, base);
      if (!resolved) {
        throw new Error(`[remarkEntryLinks] Unresolved entry link: ${href}`);
      }
      return `href=${quote}${resolved}${quote}`;
    }
    return `href=${quote}${prefixInternalPath(href, base)}${quote}`;
  });
}

// Injectable resolvers — pass stubs for unit tests to avoid filesystem scan
export interface EntryResolvers {
  resolveSphere: (name: string, base: string) => string | null;
  resolveTalent: (name: string, base: string) => string | null;
  resolveFeat: (name: string, base: string) => string | null;
}

const defaultResolvers: EntryResolvers = {
  resolveSphere: (name, base) => getEntryUrlByName("sphere", name, base),
  resolveTalent: (name, base) => getEntryUrlByName("talent", name, base),
  resolveFeat: (name, base) => getEntryUrlByName("feat", name, base),
};

export default function remarkEntryLinks(options: Options = {}) {
  const base = options.base || "/";

  return (tree: any) => {
    // Pass 1: resolve explicit @type:id links
    visit(tree, "link", (node: any) => {
      if (node.url?.startsWith("@")) {
        const original = node.url;
        const resolved = resolveExplicitEntryLink(original, base);
        if (resolved) {
          node.url = resolved;
        } else if (
          new RegExp(`^@(?:(\\w+):)?(${ENTRY_TYPES}):`).test(original)
        ) {
          throw new Error(
            `[remarkEntryLinks] Unresolved entry link: ${original}`,
          );
        }
      } else if (typeof node.url === "string") {
        const original = node.url;
        node.url = prefixInternalPath(original, base);
      }
    });

    // Raw HTML is parsed after remark plugins by rehype-raw, so explicit refs
    // inside imported HTML anchors need the same conversion here.
    visit(tree, "html", (node: any) => {
      if (typeof node.value === "string") {
        node.value = replaceEntryAndInternalLinks(node.value, base);
      }
    });

    // Pass 2: collect prerequisite paragraphs then mutate outside visit
    const prereqParagraphs: any[] = [];

    visit(tree, "paragraph", (paraNode: any) => {
      if (!paraNode.children || paraNode.children.length < 2) return;

      const firstChild = paraNode.children[0];
      const isPrereqStrong =
        firstChild.type === "strong" &&
        firstChild.children &&
        firstChild.children.length === 1 &&
        firstChild.children[0].type === "text" &&
        /^Prerequisites?:$/i.test(firstChild.children[0].value.trim());

      if (isPrereqStrong) {
        prereqParagraphs.push(paraNode);
      }
    });

    for (const paraNode of prereqParagraphs) {
      autoLinkPrerequisites(paraNode, base, defaultResolvers);
    }
  };
}

export function autoLinkPrerequisites(
  paraNode: any,
  base: string,
  resolvers: EntryResolvers = defaultResolvers,
) {
  // Walk children individually so non-text nodes (links, emphasis, code) are preserved
  const newChildren: any[] = [paraNode.children[0]]; // keep **Prerequisites:** strong node

  for (let i = 1; i < paraNode.children.length; i++) {
    const child = paraNode.children[i];
    if (child.type !== "text") {
      newChildren.push(child); // preserve existing links, emphasis, etc.
      continue;
    }
    const linked = parsePrerequisiteText(child.value, base, resolvers);
    if (linked) {
      newChildren.push(...linked);
    } else {
      newChildren.push(child);
    }
  }

  paraNode.children = newChildren;
}

interface TextSegment {
  start: number;
  end: number;
  type: "sphere" | "talent" | "text";
  url?: string;
  text: string;
}

// fallow-ignore-next-line complexity
export function parsePrerequisiteText(
  text: string,
  base: string,
  resolvers: EntryResolvers = defaultResolvers,
): any[] | null {
  const segments: TextSegment[] = [];
  const claimed = new Set<number>();

  const sphereRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([Ss]phere)/g;
  let match: RegExpExecArray | null;

  while ((match = sphereRegex.exec(text)) !== null) {
    const sphereName = match[1];
    const fullMatch = match[0];
    const start = match.index;
    const end = start + fullMatch.length;

    const sphereUrl = resolvers.resolveSphere(sphereName, base);
    if (!sphereUrl) continue;

    for (let i = start; i < end; i++) claimed.add(i);
    segments.push({
      start,
      end,
      type: "sphere",
      url: sphereUrl,
      text: fullMatch,
    });

    // Check for parenthetical talent refs immediately after the sphere
    const afterSphere = text.slice(end);
    const parenMatch = afterSphere.match(/^\s*\(([^)]+)\)/);
    if (parenMatch) {
      const innerText = parenMatch[1];
      // absolute offset of the first char inside the open paren
      const openParenOffset = end + parenMatch[0].indexOf("(") + 1;

      for (const {
        name,
        start: relStart,
        end: relEnd,
      } of parseTalentListWithOffsets(innerText)) {
        const talentUrl = resolvers.resolveTalent(name, base);
        if (!talentUrl) continue;

        const absStart = openParenOffset + relStart;
        const absEnd = openParenOffset + relEnd;

        for (let i = absStart; i < absEnd; i++) claimed.add(i);
        segments.push({
          start: absStart,
          end: absEnd,
          type: "talent",
          url: talentUrl,
          text: name,
        });
      }
    }
  }

  // Find bare talent/feat names in unclaimed text
  for (const range of buildUnclaimedRanges(text, claimed)) {
    findBareTalents(
      text.slice(range.start, range.end),
      range.start,
      segments,
      claimed,
      base,
      resolvers,
    );
  }

  if (segments.length === 0) return null;

  segments.sort((a, b) => a.start - b.start);
  return buildNodes(text, segments);
}

// Cursor-based split: handles comma, "or", and mixed "A, B or C" correctly.
// Returns offset positions within innerText so callers don't need to re-search.
function parseTalentListWithOffsets(
  innerText: string,
): { name: string; start: number; end: number }[] {
  const results: { name: string; start: number; end: number }[] = [];
  const separatorRe = /\s*,\s*|\s+or\s+/gi;

  let segStart = 0;
  let sep: RegExpExecArray | null;

  while ((sep = separatorRe.exec(innerText)) !== null) {
    const raw = innerText.slice(segStart, sep.index);
    const trimmed = raw.trim();
    if (trimmed) {
      const leading = raw.indexOf(trimmed);
      results.push({
        name: trimmed,
        start: segStart + leading,
        end: segStart + leading + trimmed.length,
      });
    }
    segStart = sep.index + sep[0].length;
  }

  const raw = innerText.slice(segStart);
  const trimmed = raw.trim();
  if (trimmed) {
    const leading = raw.indexOf(trimmed);
    results.push({
      name: trimmed,
      start: segStart + leading,
      end: segStart + leading + trimmed.length,
    });
  }

  return results;
}

function buildUnclaimedRanges(
  text: string,
  claimed: Set<number>,
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = -1;
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && !claimed.has(i)) {
      if (rangeStart === -1) rangeStart = i;
    } else if (rangeStart !== -1) {
      ranges.push({ start: rangeStart, end: i });
      rangeStart = -1;
    }
  }
  return ranges;
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "when",
  "if",
  "you",
  "this",
  "for",
  "with",
  "your",
  "each",
  "all",
  "any",
  "both",
]);

// fallow-ignore-next-line complexity
function findBareTalents(
  text: string,
  offset: number,
  segments: TextSegment[],
  claimed: Set<number>,
  base: string,
  resolvers: EntryResolvers,
) {
  const wordRegex =
    /\p{Lu}[\p{L}]*(?:[-'’][\p{L}]+)*(?:\s+\p{Lu}[\p{L}]*(?:[-'’][\p{L}]+)*)*(?:\s+\d+)?/gu;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    let name = match[0];
    let matchStart = match.index;

    // Strip leading stopword to recover talents like "Greater Blast" from "When Greater Blast..."
    const words = name.split(/\s+/);
    if (words.length > 1 && STOPWORDS.has(words[0].toLowerCase())) {
      const rest = words.slice(1).join(" ");
      matchStart += name.indexOf(rest, words[0].length);
      name = rest;
    }

    if (STOPWORDS.has(name.toLowerCase())) continue;

    const entryUrl =
      resolvers.resolveTalent(name, base) ?? resolvers.resolveFeat(name, base);
    if (!entryUrl) continue;

    const absStart = offset + matchStart;
    const absEnd = absStart + name.length;

    let alreadyClaimed = false;
    for (let i = absStart; i < absEnd; i++) {
      if (claimed.has(i)) {
        alreadyClaimed = true;
        break;
      }
    }
    if (alreadyClaimed) continue;

    for (let i = absStart; i < absEnd; i++) claimed.add(i);
    segments.push({
      start: absStart,
      end: absEnd,
      type: "talent",
      url: entryUrl,
      text: name,
    });
  }
}

function buildNodes(text: string, segments: TextSegment[]) {
  const nodes: any[] = [];
  let pos = 0;

  for (const seg of segments) {
    if (seg.start > pos) {
      nodes.push({ type: "text", value: text.slice(pos, seg.start) });
    }
    nodes.push({
      type: "link",
      url: seg.url,
      children: [{ type: "text", value: seg.text }],
    });
    pos = seg.end;
  }

  if (pos < text.length) {
    nodes.push({ type: "text", value: text.slice(pos) });
  }

  return nodes;
}
