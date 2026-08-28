#!/usr/bin/env node
/** Enforce measured HTML budgets for the route classes with the largest payloads. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEMS } from "../src/config/site.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "../dist");
const PLAYER_SYSTEMS = new Set(Object.keys(SYSTEMS));
const budgets = [
  {
    label: "search",
    max: 2_500_000,
    matches: (file) => file === "search/index.html",
  },
  {
    label: "feat catalog",
    max: 3_000_000,
    matches: (file) => file === "feats/index.html",
  },
  {
    label: "tag catalog",
    max: 6_500_000,
    matches: (file) => file.startsWith("tags/"),
  },
  {
    label: "casting builder",
    max: 1_500_000,
    matches: (file) => file === "power/casting-traditions/index.html",
  },
  {
    label: "article",
    max: 400_000,
    matches: (file) =>
      file.startsWith("articles/") ||
      (file.split("/").length > 2 &&
        PLAYER_SYSTEMS.has(file.split("/")[0]) &&
        file.split("/")[1] === "articles"),
  },
  {
    label: "class",
    max: 650_000,
    matches: (file) =>
      file.split("/").length > 2 &&
      PLAYER_SYSTEMS.has(file.split("/")[0]) &&
      file.split("/")[1] === "classes",
  },
  {
    label: "sphere",
    max: 1_250_000,
    matches: (file) => {
      const parts = file.split("/");
      return (
        parts.length === 3 &&
        PLAYER_SYSTEMS.has(parts[0]) &&
        parts[2] === "index.html"
      );
    },
  },
];

function collectHtmlFiles(dir, relative = "") {
  const files = [];
  for (const entry of fs.readdirSync(path.join(dir, relative), {
    withFileTypes: true,
  })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(dir, child));
    else if (entry.name.endsWith(".html"))
      files.push(child.replaceAll(path.sep, "/"));
  }
  return files;
}

if (!fs.existsSync(distDir)) {
  throw new Error(
    "dist/ is missing; run astro build before the performance check",
  );
}

const files = collectHtmlFiles(distDir);
const failures = [];
let checked = 0;
for (const budget of budgets) {
  for (const file of files.filter(budget.matches)) {
    checked += 1;
    const bytes = fs.statSync(path.join(distDir, file)).size;
    console.log(
      `${budget.label}: ${(bytes / 1024).toFixed(1)} KiB / ${(budget.max / 1024).toFixed(1)} KiB — ${file}`,
    );
    if (bytes > budget.max)
      failures.push(`${file} is ${bytes} bytes; budget is ${budget.max}`);
  }
}

if (checked === 0) throw new Error("No budgeted HTML routes were found");
if (failures.length > 0) {
  throw new Error(`Performance budgets exceeded:\n${failures.join("\n")}`);
}
console.log(`Performance budgets passed across ${checked} HTML routes.`);
