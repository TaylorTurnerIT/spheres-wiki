#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, '../src/content');

function getFilesRecursively(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

if (!fs.existsSync(contentDir)) {
  console.log('Content directory does not exist.');
  process.exit(0);
}

const mdFiles = getFilesRecursively(contentDir);
let hasError = false;

for (const filePath of mdFiles) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    console.error(`Error: No frontmatter found in ${filePath}`);
    hasError = true;
    continue;
  }

  try {
    const yamlStr = match[1];
    const frontmatter = parseYaml(yamlStr);
    const fileSlug = path.basename(filePath, '.md');

    if (frontmatter && frontmatter.id && frontmatter.id !== fileSlug) {
      console.error(`V2 Violation: ${filePath} has frontmatter ID "${frontmatter.id}" but filename is "${fileSlug}.md"`);
      hasError = true;
    }
  } catch (e) {
    console.error(`Error parsing YAML in ${filePath}: ${e.message}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nConsistency check FAILED.');
  process.exit(1);
} else {
  console.log(`\nSuccessfully validated ${mdFiles.length} files. All files are V2 consistent.`);
  process.exit(0);
}
