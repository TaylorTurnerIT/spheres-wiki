#!/usr/bin/env node
// Post-build route and anchor audit. Every internal anchor must use the
// configured GitHub Pages base path and resolve to generated output.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const BASE_PATH = "/spheres-wiki/";
const ORIGIN = "https://spheres-wiki.local";

function findHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findHtmlFiles(fullPath));
    else if (entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

function pageUrl(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, "/");
  const route =
    relative === "index.html"
      ? "/"
      : relative.endsWith("/index.html")
        ? `/${relative.slice(0, -"index.html".length)}`
        : `/${relative}`;
  return `${BASE_PATH.slice(0, -1)}${route}`;
}

function isExternal(href) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

function targetCandidates(pathname) {
  let relative = decodeURIComponent(pathname.slice(BASE_PATH.length));
  if (!relative) relative = "index.html";
  if (relative.endsWith("/"))
    return [path.join(distDir, relative, "index.html")];
  return [
    path.join(distDir, relative),
    path.join(distDir, relative, "index.html"),
    path.join(distDir, `${relative}.html`),
  ];
}

function findTarget(pathname) {
  if (!pathname.startsWith(BASE_PATH)) {
    return { error: "missing /spheres-wiki/ base path" };
  }

  const candidates = targetCandidates(pathname);
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  return filePath ? { filePath } : { error: "no generated target" };
}

function isSkippableHref(href) {
  return !href || href === "#" || isExternal(href);
}

function parseInternalUrl(href, sourceUrl) {
  if (isSkippableHref(href)) return null;

  let targetUrl;
  try {
    targetUrl = new URL(href, ORIGIN + sourceUrl);
  } catch {
    return { error: `invalid URL: ${href}` };
  }
  if (targetUrl.origin !== ORIGIN) return null;
  return { targetUrl };
}

function fragmentIds(html) {
  const ids = new Set();
  const idPattern = /\b(?:id|name)=["']([^"']+)["']/g;
  let match;
  while ((match = idPattern.exec(html))) ids.add(match[1]);
  return ids;
}

function validateTargetUrl(targetUrl, href, htmlCache) {
  const target = findTarget(targetUrl.pathname);
  if (target.error) return `${target.error}: ${href}`;
  if (targetUrl.hash)
    return validateFragment(target, targetUrl, href, htmlCache);
  return null;
}

function validateFragment(target, targetUrl, href, htmlCache) {
  const targetHtml =
    htmlCache.get(target.filePath) ?? fs.readFileSync(target.filePath, "utf8");
  htmlCache.set(target.filePath, targetHtml);
  const fragment = decodeURIComponent(targetUrl.hash.slice(1));
  return fragmentIds(targetHtml).has(fragment)
    ? null
    : `missing anchor #${fragment}: ${href}`;
}

function validateHref(href, sourceUrl, htmlCache) {
  const parsed = parseInternalUrl(href, sourceUrl);
  if (!parsed) return null;
  if (parsed.error) return parsed.error;
  return validateTargetUrl(parsed.targetUrl, href, htmlCache);
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ does not exist. Run the production build first.");
  process.exit(1);
}

const htmlCache = new Map();
const errors = [];
const hrefPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/g;
for (const filePath of findHtmlFiles(distDir)) {
  const html = fs.readFileSync(filePath, "utf8");
  const sourceUrl = pageUrl(filePath);
  let match;
  while ((match = hrefPattern.exec(html))) {
    const error = validateHref(match[1], sourceUrl, htmlCache);
    if (error) errors.push(`${path.relative(distDir, filePath)}: ${error}`);
  }
}

if (errors.length) {
  console.error(
    `Route/link audit failed: ${errors.length} broken internal link(s).`,
  );
  for (const error of errors.slice(0, 200)) console.error(`- ${error}`);
  if (errors.length > 200) console.error(`- ... ${errors.length - 200} more`);
  process.exit(1);
}

console.log(
  `Route/link audit passed across ${findHtmlFiles(distDir).length} HTML files.`,
);
