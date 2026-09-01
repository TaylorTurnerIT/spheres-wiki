#!/usr/bin/env node
/** Fail early when Git LFS pointer stubs reach Astro's asset pipeline. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLfsPointerAssets } from "../src/lib/assetIntegrity.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(scriptDir, "../src/assets");

function findAssetFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findAssetFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const files = findAssetFiles(assetsDir);
const pointers = findLfsPointerAssets(
  files.map((filePath) => ({
    path: path.relative(process.cwd(), filePath),
    contents: fs.readFileSync(filePath, "utf8"),
  })),
);

if (pointers.length > 0) {
  console.error(
    `Asset integrity failed: ${pointers.length} Git LFS pointer file(s) found.`,
  );
  console.error("Run `git lfs pull` before building the site.");
  for (const pointer of pointers) console.error(`- ${pointer}`);
  process.exit(1);
}

console.log(`Asset integrity passed across ${files.length} files.`);
