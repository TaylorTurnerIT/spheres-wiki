#!/usr/bin/env node
/**
 * Generalized Wikidot sphere page parser.
 * Converts sphere wiki pages to markdown content files with proper frontmatter.
 *
 * Usage:
 *   node scripts/parse-wiki.mjs <sphere> [--dry-run|--write|--force|--validate]
 *
 *   --dry-run   Print what would be written (default)
 *   --write     Write new files, skip existing
 *   --force     Write all files, overwriting existing
 *   --validate  Compare parser output against existing files, show diffs
 *
 * Add new spheres by adding to SPHERE_CONFIGS below.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Sphere Configurations ────────────────────────────────────────────────────

const SPHERE_CONFIGS = {
  blood: {
    inputFile: 'blood-raw.wiki',
    sphere: 'blood',
    system: 'power',
    primaryBook: 'spheres-of-power-core',

    headingSourceMap: {
      'BaP':         'blood-and-portents',
      'CrimDan':     'crimson-dancers-handbook',
      "Jester's HB": 'jesters-handbook',
      'Apoc':        null,   // resolve from ^^Source:^^ body line
      'DbH':         'damnation-by-hunger',
    },

    bodySourceMap: {
      'Spheres Apocrypha: Debilitating Talents 2': 'spheres-apocrypha-debilitating-talents-2',
    },
  },

  alteration: {
    inputFile: 'alteration-raw.wiki',
    sphere: 'alteration',
    system: 'power',
    primaryBook: 'spheres-of-power-core',

    // Map bracket source keys in ++++ headings -> content book folder slugs.
    // null = resolve from ^^Source: ...^^ line in body.
    headingSourceMap: {
      'DRS':         'diamond-spheres-thaumic-potential',
      'Alienist HB': 'the-alienists-handbook',
      "Jester's HB": 'jesters-handbook',
      'Jester HB':   'jesters-handbook',
      'Origin':      'spheres-of-origin',
      'LG':          'arcforge-players-compendium',
      'RW HB':       'unknown-source',
      'EO3':         'unknown-source',
      'SM—':    'barons-uncanny-gateway',
      'Catgirl HB':  'unknown-source',
      '3PP':         null,
    },

    // Map ^^Source: Book Name^^ body lines -> content book folder slugs.
    bodySourceMap: {
      "Baron's Glorious Arena":                   'barons-glorious-arena',
      "Expanded Spheres: Baron's Lost Apocrypha":  'expanded-spheres-barons-lost-apocrypha',
      'Arcforge Players Compendium':              'arcforge-players-compendium',
    },
  },

  conjuration: {
    inputFile: 'conjuration.wiki',
    sphere: 'conjuration',
    system: 'power',
    primaryBook: 'spheres-of-power-core',

    headingSourceMap: {
      'DbH':              'damnation-by-hunger',
      'LotS':             'spheres-of-guile',
      'Apoc':             null,   // resolve from ^^Source:^^ body line
      'Alienist HB':      'the-alienists-handbook',
      "Jester's HB":      'jesters-handbook',
      'SM—':              'barons-uncanny-gateway',
      '3PP':              null,   // resolve from ^^Source:^^ body line
      'BaP':              'blood-and-portents',
      "Gravecaller's HB": 'gravecallers-handbook',
    },

    bodySourceMap: {
      'Spheres Apocrypha: Cohorts & Companions':  'spheres-apocrypha-cohorts-and-companions',
      "Expanded Spheres: Baron's Lost Apocrypha": 'expanded-spheres-barons-lost-apocrypha',
      'Card Casting 2: Counters and Control':     'unknown-source',
    },
  },
};

// ─── Bracket-style ability type tags (in headings as [tag], not source keys) ──

const BRACKET_TAGS = new Set([
  'instill', 'mass', 'utility', 'range', 'strike', 'body', 'transformation',
]);

// ─── Sphere name registry (for dual-sphere detection) ─────────────────────────

const KNOWN_SPHERES = new Set([
  'alteration', 'blood', 'conjuration', 'creation', 'dark', 'death',
  'destruction', 'divination', 'enhancement', 'fate', 'illusion', 'life',
  'light', 'mana', 'mind', 'nature', 'protection', 'telekinesis', 'time',
  'war', 'warp', 'weather',
]);

// ─── Section context determination ────────────────────────────────────────────

function parseSectionContext(headingText) {
  const lower = headingText.trim().toLowerCase();

  if (/\bfeats?\b/.test(lower)) {
    return { type: 'feat', tier: null, sectionTags: [] };
  }
  if (lower.includes('advanced') && lower.includes('talent')) {
    return { type: 'talent', tier: 'advanced', sectionTags: [] };
  }
  if (lower.includes('body talent')) {
    return { type: 'talent', tier: 'basic', sectionTags: ['body'] };
  }
  if (lower.includes('transformation talent')) {
    return { type: 'talent', tier: 'basic', sectionTags: ['transformation'] };
  }
  if (lower.includes('talent')) {
    return { type: 'talent', tier: 'basic', sectionTags: [] };
  }
  if (lower.includes('drawback')) {
    return { type: 'talent', tier: 'drawback', sectionTags: [] };
  }
  return null;
}

// ─── Quote normalization ──────────────────────────────────────────────────────

// Normalize curly/smart quotes to ASCII equivalents.
// The raw wiki files use Unicode smart quotes (U+2018/2019, U+201C/201D).
function normalizeQuotes(str) {
  return str
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"');
}

// ─── Wikidot markup cleanup ───────────────────────────────────────────────────

/**
 * Convert Wikidot table lines (||~ header || / || cell ||) to Markdown table.
 * Header cells are NOT bolded; the separator row signals the header.
 */
function convertWikidotTable(tableLines) {
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

/**
 * Clean all Wikidot markup from a body text string, returning Markdown.
 */
function cleanBody(text) {
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
      // Add blank line before table if previous content is non-blank
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

    // Strip inline ^^ref^^ superscripts (e.g. ^^ARG^^)
    line = line.replace(/\^\^[^\^]+\^\^/g, '');

    // Strip inline body source citations: [SA:EAO], [BTH], [Gravecaller's HB],
    // [Errata'd in ...], [Catgirl HB addendum], etc.
    // Handles straight AND curly apostrophes in source names.
    line = line.replace(/\s*\[(?:SA:[A-Z:]+|BTH|Gravecaller[’']s HB|Errata[^\]]*|Catgirl HB[^\]]*)\]/g, '');

    // Strip source annotations inside bold trait headers:
    // e.g. **Name: [Catgirl HB addendum]** -> **Name:**
    line = line.replace(/\*\*([^*]+?):\s*\[[^\]]+\]\*\*/g, '**$1:**');

    // Convert Wikidot italic //text// -> *text*
    line = line.replace(/\/\/([^/]+)\/\//g, '*$1*');

    // Inline **Special:** within a bullet/sentence (not at line start) -> *Special:*
    if (!/^\s*\*\*Special:/.test(line)) {
      line = line.replace(/\*\*Special:\*\*/g, '*Special:*');
    }

    // Convert bullet * at start of line -> -
    line = line.replace(/^(\s*)\* /, '$1- ');

    // Normalize smart/curly quotes to straight quotes
    line = normalizeQuotes(line);

    // Normalize non-breaking spaces (U+00A0, U+202F, U+2060) to regular space
    line = line.replace(/[  ⁠]/g, ' ');

    // Collapse horizontal rule variants (---- or longer) to ---
    if (/^-{4,}$/.test(trimmed)) {
      result.push('---');
      continue;
    }

    // Insert blank line before a bullet list when previous line is non-empty non-bullet
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

// ─── Heading parsing ──────────────────────────────────────────────────────────

// Tags that appear as (parenthetical) in headings
const PAREN_TAG_MAP = {
  'body':           'body',
  'transformation': 'transformation',
  'utility':        'utility',
  'instill':        'instill',
  'mass':           'mass',
  'range':          'range',
  'strike':         'strike',
  'quicken':        'quicken',
  'still':          'still',
  'blood art':      'blood-art',
  'form':           'form',
  'type':           'type',
  'companion':      'companion',
};

/**
 * Parse a ++++ heading line. Returns { name, tags, sourceKey, type, tier }.
 * sectionCtx provides defaults for type/tier/sectionTags.
 */
function parseHeading(headingLine, sectionCtx, config) {
  let head = headingLine.replace(/^\++\s+/, '').trim();

  // Strip Wikidot color markup: ##rrggbb|text## or ##colorname|text## → text
  head = head.replace(/##[^|#]+\|([^#]+)##/g, '$1');

  const tags = [...(sectionCtx.sectionTags ?? [])];
  let sourceKey = null;
  let type = sectionCtx.type;
  let tier = sectionCtx.tier;

  // Extract all [bracket] items
  for (const m of head.matchAll(/\[([^\]]+)\]/g)) {
    const content = m[1].trim();
    const lower = content.toLowerCase().replace(/[\s-]+/g, ' ');

    if (lower === 'dual sphere') {
      if (!tags.includes('dual-sphere')) tags.push('dual-sphere');
      type = 'feat';
    } else if (lower === 'combat') {
      if (!tags.includes('combat')) tags.push('combat');
      type = 'feat';
    } else if (BRACKET_TAGS.has(lower)) {
      // Ability-type tag like [instill], [mass], [utility] — not a source key
      if (!tags.includes(lower)) tags.push(lower);
    } else if (Object.prototype.hasOwnProperty.call(config.headingSourceMap, content)) {
      sourceKey = content;
    } else {
      // Unknown bracket — treat as source key; may resolve to unknown-source
      sourceKey = content;
    }
  }
  head = head.replace(/\s*\[[^\]]+\]/g, '').trim();

  // Extract parenthetical markers: (body), (quicken, still), (Dual Sphere), (Combat), etc.
  // Each () block may contain comma-separated values.
  for (const m of head.matchAll(/\(([^)]+)\)/g)) {
    for (const part of m[1].split(',')) {
      const lower = part.trim().toLowerCase().replace(/[\s-]+/g, ' ');

      if (lower === 'dual sphere') {
        if (!tags.includes('dual-sphere')) tags.push('dual-sphere');
        type = 'feat';
      } else if (lower === 'combat') {
        if (!tags.includes('combat')) tags.push('combat');
        type = 'feat';
      } else if (PAREN_TAG_MAP[lower]) {
        const tag = PAREN_TAG_MAP[lower];
        if (!tags.includes(tag)) tags.push(tag);
      }
    }
  }
  head = head.replace(/\s*\([^)]+\)/g, '').trim();

  const name = normalizeQuotes(head.replace(/\s+/g, ' ').trim());
  return { name, tags, sourceKey, type, tier };
}

// ─── Source resolution ────────────────────────────────────────────────────────

function resolveSourceBook(sourceKey, bodySource, config) {
  if (!sourceKey) return config.primaryBook;

  const mapped = config.headingSourceMap[sourceKey];
  if (mapped !== undefined && mapped !== null) return mapped;

  // [3PP] or unknown: resolve from body ^^Source: Book Name^^ line.
  // Normalize smart quotes before comparing (raw wiki uses curly apostrophes).
  if (bodySource) {
    const normalizedSource = normalizeQuotes(bodySource);
    for (const [pattern, slug] of Object.entries(config.bodySourceMap)) {
      if (normalizedSource.includes(normalizeQuotes(pattern))) return slug;
    }
  }

  console.warn(`  [WARN] Unknown source: [${sourceKey}]${bodySource ? ` / "${bodySource}"` : ''} -> unknown-source`);
  return 'unknown-source';
}

// ─── Dual-sphere extraction ───────────────────────────────────────────────────

function extractDualSphere(bodyText, primarySphere) {
  const prereqMatch = bodyText.match(/\*\*Prerequisite(?:s)?:\*\*([^\n]+)/i);
  if (!prereqMatch) return null;

  const prereqText = prereqMatch[1];
  for (const match of prereqText.matchAll(/\b(\w+)\s+[Ss]phere\b/g)) {
    const sphere = match[1].toLowerCase();
    if (sphere !== primarySphere && KNOWN_SPHERES.has(sphere)) return sphere;
  }
  return null;
}

// ─── Wiki file parser ─────────────────────────────────────────────────────────

function parseWikiFile(text, config) {
  const entries = [];
  const seenIds = new Set();
  let sectionCtx = { type: 'talent', tier: 'basic', sectionTags: [] };

  const lines = text.split('\n');
  let inDiv = false;
  const divBuffer = [];
  let baseMode = null; // { name, bodyLines, subSections } — active while inside a base ability section

  // Flush collected base ability text into a tier:base entry.
  const flushBase = () => {
    if (!baseMode) return;
    const { name, bodyLines, subSections } = baseMode;
    baseMode = null;
    if (!name) return;
    const id = kebab(name);
    if (seenIds.has(id)) return;
    seenIds.add(id);
    const cleanedProse = cleanBody(bodyLines.join('\n'));
    let body;
    if (subSections.length > 0) {
      const subParts = subSections
        .map(s => `#### ${s.name}\n\n${s.body}`)
        .join('\n\n---\n\n');
      body = `${cleanedProse}\n\n---\n\n${subParts}\n\n---`;
    } else {
      body = cleanedProse;
    }
    if (body) {
      entries.push({ name, tags: [], type: 'talent', tier: 'base', bookSlug: config.primaryBook, body, dualSphere: null });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\[\[div\b/i.test(trimmed)) {
      inDiv = true;
      divBuffer.length = 0;
      continue;
    }

    if (/^\[\[\/div\]\]/i.test(trimmed)) {
      if (inDiv && divBuffer.length > 0) {
        const divText = divBuffer.join('\n');
        if (/^\+{4}\s/m.test(divText)) {
          if (baseMode) {
            // Inside a base ability section: embed div as sub-section rather than a separate entry
            const parsed = parseEntryBlock(divText, { type: 'talent', tier: 'basic', sectionTags: [] }, config);
            if (parsed) baseMode.subSections.push({ name: parsed.name, body: parsed.body });
          } else {
            const parsed = parseEntryBlock(divText, { ...sectionCtx }, config);
            if (parsed) {
              const id = kebab(parsed.name);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                entries.push(parsed);
              }
            }
          }
        } else if (baseMode) {
          // Div without a ++++ heading inside a base ability section: include as body prose
          baseMode.bodyLines.push(...divBuffer);
        }
      }
      inDiv = false;
      divBuffer.length = 0;
      continue;
    }

    if (inDiv) {
      divBuffer.push(line);
      continue;
    }

    // Outside divs: detect section headings (H1, H2, H3 — but NOT H4 ++++)
    const headingMatch = trimmed.match(/^(\+{1,3})(?!\+)\s+(.+)/);
    if (headingMatch) {
      const ctx = parseSectionContext(headingMatch[2]);
      if (ctx) {
        flushBase();
        sectionCtx = ctx;
      } else if (headingMatch[1] === '++') {
        if (baseMode) {
          // Consecutive null-context H2 while base ability is active → extend current base ability.
          // Add as a prose sub-heading rather than flushing and starting a new base entry.
          const sectionName = normalizeQuotes(headingMatch[2].replace(/\s*\[[^\]]+\]/g, '').trim());
          baseMode.bodyLines.push(`### ${sectionName}`);
        } else {
          // H2 with no section context → base ability (e.g. "Blood Control", "Shapeshift")
          flushBase();
          const baseName = normalizeQuotes(headingMatch[2].replace(/\s*\[[^\]]+\]/g, '').trim());
          baseMode = { name: baseName, bodyLines: [], subSections: [] };
        }
      }
      // H1/H3 with no context: informational section — no state change
      continue;
    }

    // Collect prose for the current base ability (converting H4+ headings to markdown)
    if (baseMode) {
      const subHeadingMatch = trimmed.match(/^(\+{4,})\s+(.+)$/);
      if (subHeadingMatch) {
        const hashes = '#'.repeat(subHeadingMatch[1].length);
        baseMode.bodyLines.push(`${hashes} ${normalizeQuotes(subHeadingMatch[2])}`);
      } else {
        baseMode.bodyLines.push(line);
      }
    }
  }

  flushBase();
  return entries;
}

function parseEntryBlock(divContent, sectionCtx, config) {
  const lines = divContent.split('\n');
  const headingIdx = lines.findIndex(l => /^\+{4}\s/.test(l.trim()));
  if (headingIdx === -1) return null;

  const headingLine = lines[headingIdx].trim();
  const { name, tags, sourceKey, type, tier } = parseHeading(headingLine, sectionCtx, config);
  if (!name) return null;

  const bodyLines = lines.slice(headingIdx + 1);

  // Extract and remove ^^Source: ...^^ line from body
  let bodySource = null;
  const cleanedLines = bodyLines.filter(l => {
    const t = l.trim();
    if (/^\^\^.+\^\^$/.test(t)) {
      const m = t.match(/\^\^\*?\*?Source:\*?\*?\s*(.+?)\*?\*?\^\^/i);
      if (m) {
        bodySource = m[1]
          .replace(/\[\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\]/g, '$1')
          .replace(/\[https?[^\s\]]+\s+([^\]]+)\]/g, '$1')
          .trim();
      }
      return false;
    }
    return true;
  });

  const body = cleanBody(cleanedLines.join('\n'));

  // Skip cross-reference stubs (e.g. "See General Feats" / "See [[[page]]]")
  if (/^See\s+(\[\[\[|General\b)/i.test(body.trimStart())) return null;

  const bookSlug = resolveSourceBook(sourceKey, bodySource, config);

  let dualSphere = null;
  if (tags.includes('dual-sphere')) {
    dualSphere = extractDualSphere(body, config.sphere);
  }

  return { name, tags, type, tier, bookSlug, body, dualSphere };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderTalent(entry, config) {
  const id = kebab(entry.name);
  const tags = fmArray(entry.tags);
  const lines = [
    '---',
    `id: ${id}`,
    `name: "${entry.name}"`,
    `system: ${config.system}`,
    `type: talent`,
    `sphere: ${config.sphere}`,
    `tier: ${entry.tier}`,
    `tags: ${tags}`,
    '---',
  ];
  return `${lines.join('\n')}\n\n${entry.body}\n`;
}

function renderFeat(entry, config) {
  const id = kebab(entry.name);
  const tags = fmArray(entry.tags);
  const lines = [
    '---',
    `id: ${id}`,
    `name: "${entry.name}"`,
    `type: feat`,
    `system: ${config.system}`,
    `sphere: ${config.sphere}`,
  ];
  if (entry.dualSphere) lines.push(`dualSphere: ${entry.dualSphere}`);
  lines.push(`tags: ${tags}`, '---');
  return `${lines.join('\n')}\n\n${entry.body}\n`;
}

function renderEntry(entry, config) {
  return entry.type === 'feat' ? renderFeat(entry, config) : renderTalent(entry, config);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kebab(name) {
  return name
    .toLowerCase()
    .replace(/[‘’''`]/g, '')  // strip apostrophes/quotes
    .replace(/[^a-z0-9\s-]/g, '')       // strip non-alphanum
    .trim()
    .replace(/\s+/g, '-');
}

function fmArray(arr) {
  return arr.length ? `[${arr.map(t => `"${t}"`).join(', ')}]` : '[]';
}

function showDiff(existing, generated) {
  const eLines = existing.split('\n');
  const gLines = generated.split('\n');
  const maxLen = Math.max(eLines.length, gLines.length);
  let shown = 0;
  for (let i = 0; i < maxLen && shown < 20; i++) {
    const e = eLines[i] ?? '(none)';
    const g = gLines[i] ?? '(none)';
    if (e !== g) {
      console.log(`  line ${i + 1}:`);
      console.log(`    EXISTING:  ${JSON.stringify(e)}`);
      console.log(`    GENERATED: ${JSON.stringify(g)}`);
      shown++;
    }
  }
  if (shown === 0) console.log('  (whitespace difference only)');
  console.log('');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  normalizeQuotes,
  kebab,
  convertWikidotTable,
  cleanBody,
  parseSectionContext,
  parseHeading,
  resolveSourceBook,
  extractDualSphere,
  parseWikiFile,
  parseEntryBlock,
  SPHERE_CONFIGS,
  BRACKET_TAGS,
  PAREN_TAG_MAP,
  KNOWN_SPHERES,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const isMain = !!process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1]).replace(/\\/g, '/');

if (isMain) {

const args = process.argv.slice(2);
const sphereName = args.find(a => !a.startsWith('-')) ?? null;
const MODE = args.find(a => a.startsWith('--')) ?? '--dry-run';

if (!sphereName || !SPHERE_CONFIGS[sphereName]) {
  console.error('Usage: node scripts/parse-wiki.mjs <sphere> [--dry-run|--write|--force|--validate]');
  console.error(`Available spheres: ${Object.keys(SPHERE_CONFIGS).join(', ')}`);
  process.exit(1);
}

const config = SPHERE_CONFIGS[sphereName];
const inputPath = join(ROOT, config.inputFile);

if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${config.inputFile}`);
  process.exit(1);
}

const rawText = readFileSync(inputPath, 'utf-8');
const entries = parseWikiFile(rawText, config);

const talents = entries.filter(e => e.type === 'talent');
const feats = entries.filter(e => e.type === 'feat');
const other = entries.filter(e => e.type !== 'talent' && e.type !== 'feat');

console.log(`Parsed ${entries.length} entries from ${config.inputFile}`);
console.log(`  ${talents.length} talents, ${feats.length} feats${other.length ? `, ${other.length} other` : ''}\n`);

let newCount = 0, skipCount = 0, diffCount = 0, okCount = 0, missCount = 0;

for (const entry of entries) {
  const id = kebab(entry.name);
  const subdir = entry.type === 'feat' ? 'feats' : 'talents';
  const outDir = join(ROOT, 'src/content', entry.bookSlug, subdir);
  const filename = `${id}.md`;
  const filepath = join(outDir, filename);
  const content = renderEntry(entry, config);
  const label = `${entry.bookSlug}/${subdir}/${filename}`;

  if (MODE === '--dry-run') {
    console.log(`WOULD WRITE  ${label}`);
    console.log(content);
    console.log('---');
    continue;
  }

  if (MODE === '--validate') {
    if (existsSync(filepath)) {
      const existing = readFileSync(filepath, 'utf-8');
      if (existing.trim() !== content.trim()) {
        console.log(`DIFF  ${label}`);
        showDiff(existing, content);
        diffCount++;
      } else {
        console.log(`OK    ${label}`);
        okCount++;
      }
    } else {
      console.log(`MISS  ${label}`);
      missCount++;
    }
    continue;
  }

  if (existsSync(filepath) && MODE !== '--force') {
    skipCount++;
    continue;
  }

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(filepath, content, 'utf-8');
  console.log(`WROTE  ${label}`);
  newCount++;
}

if (MODE === '--validate') {
  console.log(`\n${okCount} OK, ${diffCount} diff(s), ${missCount} missing.`);
} else if (MODE !== '--dry-run') {
  console.log(`\nWrote ${newCount} new file(s), skipped ${skipCount} existing.`);
}

} // end if (isMain)
