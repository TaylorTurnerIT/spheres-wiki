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
  return str
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"');
}

// ─── Table conversion ─────────────────────────────────────────────────────────

/**
 * Convert Wikidot table lines to Markdown table format.
 *   ||~ header ||       → | header |
 *   || cell ||          → | cell |
 * Header cells are detected by the ~ marker; a separator row is inserted.
 */
export function convertWikidotTable(tableLines) {
  const result = [];
  let separatorInserted = false;

  for (const line of tableLines) {
    const isHeader = line.includes('||~');
    const rawCells = line.split('||').filter((_, i) => i > 0);
    const cells = rawCells.map(cell => cell.replace(/^~?\s*/, '').trimEnd());
    if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();

    result.push('| ' + cells.join(' | ') + ' |');

    if (isHeader && !separatorInserted) {
      result.push('|' + cells.map(() => '---|').join(''));
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
  const lines = text.split('\n');
  const result = [];
  const tableBuffer = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip structural Wikidot tags
    if (/^\[\[(module|\/module|tabview|\/tabview|tab |\/tab|toc|\/toc|=|\/=)\b/i.test(trimmed)) continue;
    if (/^\[\[\/?(module|tabview|tab|toc)\]\]/i.test(trimmed)) continue;

    // Skip div wrappers (processed at a higher level)
    if (/^\[\[div\b/i.test(trimmed) || /^\[\[\/div\]\]/i.test(trimmed)) continue;

    // Skip image tags
    if (/^\[\[image\b/i.test(trimmed)) continue;

    // Skip full-line superscripts (source attribution lines: ^^...^^)
    if (/^\^\^.+\^\^$/.test(trimmed)) continue;

    // Collect Wikidot table lines; flush when table ends
    if (trimmed.startsWith('||')) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      result.push(...convertWikidotTable(tableBuffer));
      tableBuffer.length = 0;
      result.push('');
    }

    let line = rawLine;

    // Strip Wikidot wikilinks: [[[display|url]]] or [[[page name]]]
    line = line.replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, '$1');

    // Strip inline superscript refs: ^^ARG^^
    line = line.replace(/\^\^[^\^]+\^\^/g, '');

    // Strip inline body source citations
    line = line.replace(/\s*\[(?:SA:[A-Z:]+|BTH|Gravecaller[’']s HB|Errata[^\]]*|Catgirl HB[^\]]*)\]/g, '');

    // Strip source annotations inside bold trait headers
    line = line.replace(/\*\*([^*]+?):\s*\[[^\]]+\]\*\*/g, '**$1:**');

    // Convert Wikidot italic //text// → *text*
    line = line.replace(/\/\/([^/]+)\/\//g, '*$1*');

    // Inline **Special:** → *Special:* (when not at line start)
    if (!/^\s*\*\*Special:/.test(line)) {
      line = line.replace(/\*\*Special:\*\*/g, '*Special:*');
    }

    // Convert bullet * at start of line → -
    line = line.replace(/^(\s*)\* /, '$1- ');

    // Normalize quotes
    line = normalizeQuotes(line);

    // Normalize non-breaking spaces
    line = line.replace(/[  ⁠]/g, ' ');

    // Collapse horizontal rule variants
    if (/^-{4,}$/.test(trimmed)) {
      result.push('---');
      continue;
    }

    // Insert blank line before bullet list
    if (/^\s*- /.test(line) && result.length > 0) {
      const prev = result[result.length - 1];
      if (prev.trim() !== '' && !/^\s*- /.test(prev) && !prev.startsWith('|')) {
        result.push('');
      }
    }

    result.push(line);
  }

  // Flush any remaining table buffer
  if (tableBuffer.length > 0) {
    if (result.length > 0 && result[result.length - 1].trim() !== '') result.push('');
    result.push(...convertWikidotTable(tableBuffer));
  }

  // Trim leading/trailing blank lines
  while (result.length && !result[0].trim()) result.shift();
  while (result.length && !result[result.length - 1].trim()) result.pop();

  return result.join('\n');
}
