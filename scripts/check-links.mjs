import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const mdFiles = getFilesRecursively(contentDir);
let links = new Set();
let count = 0;

for (const filePath of mdFiles) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(fileContent)) !== null) {
    links.add(match[2]);
    count++;
  }
}

console.log(`Found ${count} total links.`);
console.log('Unique link targets:');
const uniqueLinks = Array.from(links);
console.log(uniqueLinks.slice(0, 50));
