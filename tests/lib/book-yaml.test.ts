import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

const REQUIRED_FIELDS = ['title', 'publisher', 'system', 'publishedDate', 'price', 'buyUrl', 'coverImage'] as const;
const EPOCH_DATE = '1970-01-01';

const contentDir = path.resolve(__dirname, '../../src/content');

function getSourceBookDirs(): string[] {
  if (!fs.existsSync(contentDir)) return [];
  return fs.readdirSync(contentDir)
    .filter(name => fs.statSync(path.join(contentDir, name)).isDirectory())
    .sort();
}

const sourceBooks = getSourceBookDirs();

describe('_book.yaml validation', () => {
  it('found source book directories', () => {
    expect(sourceBooks.length).toBeGreaterThan(0);
  });

  for (const book of sourceBooks) {
    const bookPath = path.join(contentDir, book);
    const yamlPath = path.join(bookPath, '_book.yaml');

    describe(`${book}`, () => {
      it('has _book.yaml', () => {
        expect(fs.existsSync(yamlPath), `missing _book.yaml in ${book}`).toBe(true);
      });

      if (!fs.existsSync(yamlPath)) return;

      let data: Record<string, unknown> = {};

      it('parses as valid YAML', () => {
        const raw = fs.readFileSync(yamlPath, 'utf8');
        expect(() => { data = parseYaml(raw) ?? {}; }).not.toThrow();
      });

      for (const field of REQUIRED_FIELDS) {
        it(`has non-empty field: ${field}`, () => {
          const raw = fs.readFileSync(yamlPath, 'utf8');
          const parsed: Record<string, unknown> = parseYaml(raw) ?? {};
          const value = parsed[field];
          expect(value, `${book}/_book.yaml: field "${field}" is missing`).toBeDefined();
          expect(String(value ?? '').trim(), `${book}/_book.yaml: field "${field}" is empty`).not.toBe('');
        });
      }

      it('publishedDate is not epoch placeholder (1970-01-01)', () => {
        const raw = fs.readFileSync(yamlPath, 'utf8');
        const parsed: Record<string, unknown> = parseYaml(raw) ?? {};
        const date = String(parsed['publishedDate'] ?? '');
        expect(date, `${book}/_book.yaml: publishedDate is epoch placeholder`).not.toBe(EPOCH_DATE);
      });
    });
  }
});
