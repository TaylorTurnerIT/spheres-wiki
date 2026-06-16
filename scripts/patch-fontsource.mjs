import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function patchDir(dir, replace, withStr) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".css")) continue;
    const path = join(dir, f);
    const content = readFileSync(path, "utf-8");
    const updated = content.replace(replace, withStr);
    if (updated !== content) {
      writeFileSync(path, updated);
      console.log(`patched: ${path}`);
    }
  }
}

// Cinzel: display font — use block to prevent flicker, size-adjust matches fallback serif
patchDir(
  "node_modules/@fontsource/cinzel",
  /font-display: [^;]+;( size-adjust: [^;]+;)*/g,
  "font-display: block; size-adjust: 92%;",
);

// Crimson Text: body font — use block to prevent flicker, size-adjust matches fallback serif
patchDir(
  "node_modules/@fontsource/crimson-text",
  /font-display: [^;]+;( size-adjust: [^;]+;)*/g,
  "font-display: block; size-adjust: 102%;",
);

console.log("fontsource patches applied");
