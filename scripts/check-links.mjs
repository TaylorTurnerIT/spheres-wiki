import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, "../src/content");

const mdFiles = getMarkdownFilesRecursively(contentDir);
const links = new Set();
let count = 0;

for (const filePath of mdFiles) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(fileContent)) !== null) {
    links.add(match[2]);
    count++;
  }
}

console.log(`Found ${count} total links.`);
console.log("Unique link targets:");
const uniqueLinks = Array.from(links);
console.log(uniqueLinks.slice(0, 50));
