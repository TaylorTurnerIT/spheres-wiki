import fs from "node:fs";
import path from "node:path";

// fallow-ignore-next-line complexity
export function getMarkdownFilesRecursively(dir, { skipQuarantine = false } = {}) {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getMarkdownFilesRecursively(entryPath, { skipQuarantine }));
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    if (skipQuarantine && entry.name.startsWith("QUARANTINE-")) continue;
    results.push(entryPath);
  }

  return results;
}
