import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { inferFromPath } from './inferFromPath';
import { fileURLToPath } from 'url';

let dbCache: Map<string, any> | null = null;
const bookYamlCache = new Map<string, { system?: string }>();

function getFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

export function getEntryUrl(type: string, id: string, base: string = '/'): string | null {
  if (!dbCache) {
    dbCache = new Map();
    // Assuming this file is compiled/run near the root or within src/lib
    // We'll resolve src/content defensively
    const contentDir = path.resolve(process.cwd(), 'src/content');
    if (fs.existsSync(contentDir)) {
      const allFiles = getFilesRecursively(contentDir);
      for (const filePath of allFiles) {
        const relPath = path.relative(contentDir, filePath);
        // relPath example: ultimate-spheres-of-power/talents/bleed.md
        const parts = relPath.split(path.sep);
        const bookSlug = parts[0];
        const entryPath = parts.slice(1).join('/'); // talents/bleed.md
        
        const inferred = inferFromPath(entryPath);
        
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        let frontmatter: any = {};
        if (match) {
          try {
            frontmatter = parseYaml(match[1]) || {};
          } catch {
            // ignore
          }
        }
        
        // determine system from _book.yaml if needed
        let system = frontmatter.system;
        if (!system) {
          if (!bookYamlCache.has(bookSlug)) {
            try {
              const bookYamlPath = path.join(contentDir, bookSlug, '_book.yaml');
              bookYamlCache.set(bookSlug, fs.existsSync(bookYamlPath)
                ? parseYaml(fs.readFileSync(bookYamlPath, 'utf8'))
                : {});
            } catch {
              bookYamlCache.set(bookSlug, {});
            }
          }
          system = bookYamlCache.get(bookSlug)?.system;
        }

        const entryType = frontmatter.type || inferred.type;
        const entryId = frontmatter.id || inferred.id;

        if (entryType && entryId) {
          const entry = {
            ...inferred,
            ...frontmatter,
            type: entryType,
            id: entryId,
            system,
          };
          dbCache.set(`${entryType}:${entryId}`, entry);
        }
      }
    }
  }

  const entry = dbCache.get(`${type}:${id}`);
  if (!entry) return null;

  // Build the URL based on the entry type and system
  const basePath = base.endsWith('/') ? base.slice(0, -1) : base;
  
  if (entry.type === 'talent') {
    return `${basePath}/${entry.system}/${entry.sphere}/${entry.id}/`;
  } else if (entry.type === 'feat') {
    return `${basePath}/${entry.system}/${entry.sphere}/feats/${entry.id}/`;
  } else if (entry.type === 'sphere') {
    return `${basePath}/${entry.system}/${entry.id}/`;
  } else if (entry.type === 'class') {
    return `${basePath}/${entry.system}/classes/${entry.id}/`;
  }

  return null;
}
