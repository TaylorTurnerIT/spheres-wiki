/**
 * Wikidot markup → Markdown conversion utilities.
 * Shared by all parsers (sphere, class, article, bestiary).
 */

// ─── Quote normalization ──────────────────────────────────────────────────────

/**
 * Normalize curly/smart quotes to ASCII equivalents.
 * The raw wiki files use Unicode smart quotes (U+2018/2019, U+201C/201D).
 */
export function normalizeQuotes(str) {
  return str.replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"');
}

// ─── Table conversion ─────────────────────────────────────────────────────────

/**
 * Convert Wikidot table lines to Markdown table format.
 *   ||~ header ||       → | header |
 *   || cell ||          → | cell |
 * Header cells are detected by the ~ marker; a separator row is inserted.
 * Applies markup conversions to each cell (links, footnotes, wikilinks).
 */
export function convertWikidotTable(tableLines) {
  const result = [];
  let separatorInserted = false;

  for (const line of tableLines) {
    const isHeader = line.includes("||~");
    const rawCells = line.split("||").filter((_, i) => i > 0);
    const cells = rawCells.map((cell) => {
      let c = cell.replace(/^~?\s*/, "").trimEnd();

      // 1. Combine [URL text][[footnote]]desc[[/footnote]] → <a> with data-tooltip
      c = c.replace(
        /\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]\s*\[\[footnote\]\]([\s\S]*?)\[\[\/footnote\]\]/g,
        (_, url, text, note) =>
          `<a href="${url}" data-tooltip="${note.trim().replace(/"/g, "&quot;")}" class="tt">${text}</a>`,
      );

      // 2. Standalone [URL text] (without footnote) → [text](URL)
      c = c.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "[$2]($1)");

      // 3. Standalone [[footnote]]desc[[/footnote]] → desc
      c = c.replace(/\[\[footnote\]\]([\s\S]*?)\[\[\/footnote\]\]/g, "$1");

      // 4. Wikilinks, italics, quotes
      c = c.replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, "$1");
      c = c.replace(/\/\/([^/]+)\/\//g, "*$1*");
      c = normalizeQuotes(c);
      return c;
    });
    if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();

    result.push("| " + cells.join(" | ") + " |");

    if (isHeader && !separatorInserted) {
      result.push("|" + cells.map(() => "---|").join(""));
      separatorInserted = true;
    } else if (!separatorInserted && result.length === 1) {
      // No header row found — insert separator after first data row so the
      // output is valid Markdown (first row becomes the implicit header).
      result.push("|" + cells.map(() => "---|").join(""));
      separatorInserted = true;
    }
  }

  return result;
}

// ─── Body cleaning ────────────────────────────────────────────────────────────

/**
 * Clean all Wikidot markup from body text, returning Markdown.
 *
 * Handles:
 *   - Wikidot structural tags: [[module]], [[tabview]], [[toc]], [[div]], [[=]]
 *   - Image tags: [[image ...]]
 *   - Superscript source lines: ^^...^^
 *   - Wikilinks: [[[page|display]]] → display
 *   - Italics: //text// → *text*
 *   - Bullets: * → -
 *   - Tables: ||...|| → Markdown tables
 *   - Smart quote normalization
 *   - Non-breaking space normalization
 *   - Source annotation stripping ([SA:...], [BTH], etc.)
 */
export function cleanBody(text) {
  const lines = text.split("\n");
  const result = [];
  const tableBuffer = [];

  for (const rawLineOrig of lines) {
    let rawLine = rawLineOrig;
    const trimmed = rawLine.trim();

    // Skip structural Wikidot tags
    if (
      /^\[\[(module|\/module|tabview|\/tabview|tab |\/tab|toc|\/toc|=|\/=)\b/i.test(
        trimmed,
      )
    )
      continue;
    if (/^\[\[\/?(module|tabview|tab|toc)\]\]/i.test(trimmed)) continue;

    // Skip div opening wrappers (processed at a higher level)
    if (/^\[\[div\b/i.test(trimmed)) continue;
    // Strip closing div tag from start of line, keep trailing text
    if (/^\[\[\/div\]\]/.test(trimmed)) {
      const rest = trimmed.replace(/^\[\[\/div\]\]/, "").trim();
      if (rest) {
        // Process through standard line cleaning below
        rawLine = rest;
        // Don't continue — fall through to the wikilink/italic/etc processing
      } else {
        continue;
      }
    }

    // Skip image tags
    if (/^\[\[image\b/i.test(trimmed)) continue;

    // Skip Wikidot include directives
    if (/^\[\[include\b/i.test(trimmed)) continue;

    // Skip full-line superscripts (source attribution lines: ^^...^^)
    if (/^\^\^.+\^\^$/.test(trimmed)) continue;

    // Collect Wikidot table lines; flush when table ends
    if (trimmed.startsWith("||")) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      if (result.length > 0 && result[result.length - 1].trim() !== "") {
        result.push("");
      }
      result.push(...convertWikidotTable(tableBuffer));
      tableBuffer.length = 0;
      result.push("");
    }

    let line = rawLine;

    // Strip Wikidot wikilinks: [[[display|url]]] or [[[page name]]]
    line = line.replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, "$1");

    // Convert Wikidot external links: [https://url.com Display Text]
    line = line.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "[$2]($1)");

    // Strip Wikidot footnote wrappers, keep the footnote text
    line = line.replace(/\[\[footnote\]\]([\s\S]*?)\[\[\/footnote\]\]/g, "$1");

    // Strip inline superscript refs: ^^ARG^^
    line = line.replace(/\^\^[^\^]+\^\^/g, "");

    // Strip inline body source citations
    line = line.replace(
      /\s*\[(?:SA:[A-Z:]+|BTH|Gravecaller[’']s HB|Errata[^\]]*|Catgirl HB[^\]]*)\]/g,
      "",
    );

    // Strip source annotations inside bold trait headers
    line = line.replace(/\*\*([^*]+?):\s*\[[^\]]+\]\*\*/g, "**$1:**");

    // Convert Wikidot italic //text// → *text*
    line = line.replace(/\/\/([^/]+)\/\//g, "*$1*");

    // Inline **Special:** → *Special:* (when not at line start)
    if (!/^\s*\*\*Special:/.test(line)) {
      line = line.replace(/\*\*Special:\*\*/g, "*Special:*");
    }

    // Convert bullet * at start of line → -
    line = line.replace(/^(\s*)\* /, "$1- ");

    // Normalize quotes
    line = normalizeQuotes(line);

    // Normalize non-breaking spaces
    line = line.replace(/[  ⁠]/g, " ");

    // Collapse horizontal rule variants
    if (/^-{4,}$/.test(trimmed)) {
      result.push("---");
      continue;
    }

    // Convert Wikidot headings to Markdown: ++++ → ####, +++ → ###
    const headingMatch = trimmed.match(/^(\+{3,})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const h = "#".repeat(level);
      result.push(`${h} ${normalizeQuotes(headingMatch[2])}`);
      continue;
    }

    // Insert blank line before bullet list
    if (/^\s*- /.test(line) && result.length > 0) {
      const prev = result[result.length - 1];
      if (prev.trim() !== "" && !/^\s*- /.test(prev) && !prev.startsWith("|")) {
        result.push("");
      }
    }

    result.push(line);
  }

  // Flush any remaining table buffer
  if (tableBuffer.length > 0) {
    if (result.length > 0 && result[result.length - 1].trim() !== "")
      result.push("");
    result.push(...convertWikidotTable(tableBuffer));
  }

  // Trim leading/trailing blank lines
  while (result.length && !result[0].trim()) result.shift();
  while (result.length && !result[result.length - 1].trim()) result.pop();

  return result.join("\n");
}
