import fs from "node:fs";
import path from "node:path";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const contentDir = path.resolve("src/content");
const files = getMarkdownFilesRecursively(contentDir);

let count = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  
  // Verify if it is a tag entry
  if (!content.includes("type: tag") && !file.includes("/tags/")) continue;
  
  // Matches "color: ..." lines (with optional quotes)
  const colorRegex = /^color:\s*.*$/m;
  
  if (colorRegex.test(content)) {
    // Remove the color line and clean up any double empty lines
    let newContent = content.replace(colorRegex, "");
    newContent = newContent.replace(/\n\n+/g, "\n");
    
    // Ensure frontmatter block spacing is kept neat
    newContent = newContent.replace(/---\n+type:/g, "---\ntype:");
    
    fs.writeFileSync(file, newContent, "utf8");
    count++;
  }
}

console.log(`Purged legacy color property from ${count} tag content files.`);
