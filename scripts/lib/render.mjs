/**
 * Rendering utilities and CLI write/validate harness.
 * Shared by all parsers (sphere, class, article, bestiary).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Slug generation ──────────────────────────────────────────────────────────

/**
 * Convert a display name to a kebab-case slug.
 * Strips apostrophes/quotes and non-alphanumeric characters.
 */
export function kebab(name) {
  return name
    .toLowerCase()
    .replace(/[‘’''`]/g, '')       // strip apostrophes/quotes
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanum
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Frontmatter helpers ──────────────────────────────────────────────────────

/**
 * Format a string array as a YAML-friendly JSON array string.
 * e.g. ["foo", "bar"] → '[foo, bar]'
 * Returns '[]' for empty arrays.
 */
export function fmArray(arr) {
  return arr.length ? `[${arr.map(t => `"${t}"`).join(', ')}]` : '[]';
}

// ─── Diff display ─────────────────────────────────────────────────────────────

/**
 * Show a compact diff between existing and generated content.
 * Prints at most 20 differing lines for debugging.
 */
export function showDiff(existing, generated) {
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

// ─── Entry writing ────────────────────────────────────────────────────────────

/**
 * Write parsed entries to disk.
 *
 * @param {Array}  entries     - Parsed entries, each with { name, bookSlug, type, body, ... }
 * @param {string} contentRoot - Path to src/content/
 * @param {Function} renderFn  - (entry) => string (full .md content including frontmatter)
 * @param {string} mode        - '--dry-run' | '--write' | '--force' | '--validate'
 * @returns {{ newCount, skipCount, diffCount, okCount, missCount }}
 */
export function writeEntries(entries, contentRoot, renderFn, mode) {
  let newCount = 0, skipCount = 0, diffCount = 0, okCount = 0, missCount = 0;

  for (const entry of entries) {
    const id = kebab(entry.name);
    const subdir = entry.subdir ?? (entry.type === 'feat' ? 'feats' : 'talents');
    const outDir = join(contentRoot, entry.bookSlug, subdir);
    const filename = `${id}.md`;
    const filepath = join(outDir, filename);
    const content = renderFn(entry);
    const label = `${entry.bookSlug}/${subdir}/${filename}`;

    if (mode === '--dry-run') {
      console.log(`WOULD WRITE  ${label}`);
      console.log(content);
      console.log('---');
      continue;
    }

    if (mode === '--validate') {
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

    if (existsSync(filepath) && mode !== '--force') {
      skipCount++;
      continue;
    }

    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(filepath, content, 'utf-8');
    console.log(`WROTE  ${label}`);
    newCount++;
  }

  return { newCount, skipCount, diffCount, okCount, missCount };
}
