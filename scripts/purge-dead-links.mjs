import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, "../src/content");

const mdFiles = getMarkdownFilesRecursively(contentDir);

let filesModified = 0;

for (const filePath of mdFiles) {
  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;

  // 1. Wikidot syntax: [http://spheresofpower.wikidot.com/something text here] -> text here
  content = content.replace(
    /\[http:\/\/spheresofpower\.wikidot\.com\/[^\s\]]+ ([^\]]+)\]/g,
    "$1",
  );

  // 2. Markdown syntax: [text here](http://spheresofpower.wikidot.com/something) -> text here
  content = content.replace(
    /\[([^\]]+)\]\(http:\/\/spheresofpower\.wikidot\.com\/[^)]+\)/g,
    "$1",
  );

  // 3. HTML syntax: <a href="http://spheresofpower.wikidot.com/something" ...>text</a>
  // We can just remove the href attribute so it remains a tooltip anchor if it has data-tooltip
  content = content.replace(
    /href="http:\/\/spheresofpower\.wikidot\.com\/[^"]*"/g,
    'href="#"',
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    filesModified++;
    console.log(`Modified: ${filePath}`);
  }
}

console.log(`Purged dead links in ${filesModified} files.`);
