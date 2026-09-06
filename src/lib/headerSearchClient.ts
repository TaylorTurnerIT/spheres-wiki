// src/lib/headerSearchClient.ts
// Header search bar and quick-search panel client logic.

import {
  CLASS_SUBTITLES,
  getSphereSubtitle,
  getSphereTalentCount,
} from "@/lib/searchData";
import { url } from "@/lib/url";

export interface HeaderSearchItem {
  url: string;
  title: string;
  type: string;
  sphere?: string;
  system?: string;
  tier?: string;
  tags?: string[];
  icon?: string;
  talentCount?: number;
  subtitle?: string;
}

const CATEGORY_CONFIG: Array<{ key: string; label: string; max: number }> = [
  { key: "sphere", label: "SPHERES", max: 2 },
  { key: "talent", label: "TALENTS", max: 2 },
  { key: "feat", label: "FEATS", max: 2 },
  { key: "class", label: "CLASSES", max: 2 },
  { key: "archetype", label: "ARCHETYPES", max: 2 },
  { key: "class-trait", label: "TRAITS", max: 2 },
  { key: "article", label: "ARTICLES", max: 2 },
  { key: "other", label: "OTHER", max: 2 },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractSlug(itemUrl: string): string {
  const parts = itemUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function extractSphere(itemUrl: string, metaSphere?: string): string {
  if (metaSphere) return metaSphere;
  const parts = itemUrl.split("/").filter(Boolean);
  if (
    parts.length >= 3 &&
    ["power", "might", "guile", "champions"].includes(parts[0])
  ) {
    const slug = parts[1];
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  return "";
}

function extractClassName(itemUrl: string): string {
  const parts = itemUrl.split("/").filter(Boolean);
  const classIdx = parts.indexOf("classes");
  if (classIdx !== -1 && parts[classIdx + 1]) {
    const raw = parts[classIdx + 1];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return "";
}

// fallow-ignore-next-line complexity
export function detectEntryType(rawType?: string, itemUrl?: string): string {
  const type = (rawType || "")
    .replace(/^type:/, "")
    .trim()
    .toLowerCase();
  if (type) return type;
  const url = itemUrl || "";
  if (url.includes("/classes/") && url.includes("/traits/"))
    return "class-trait";
  if (url.includes("/classes/") && url.split("/").filter(Boolean).length >= 4)
    return "archetype";
  if (url.includes("/classes/")) return "class";
  if (url.includes("/feats/")) return "feat";
  if (url.includes("/articles/")) return "article";
  const parts = url.split("/").filter(Boolean);
  if (
    parts.length === 2 &&
    ["power", "might", "guile", "champions"].includes(parts[0])
  )
    return "sphere";
  if (
    parts.length === 3 &&
    ["power", "might", "guile", "champions"].includes(parts[0])
  )
    return "talent";
  return "other";
}

// fallow-ignore-next-line complexity
export function formatSubtitle(item: HeaderSearchItem): string {
  const { type, system, sphere, title, url } = item;

  if (type === "sphere") {
    const count = item.talentCount ?? getSphereTalentCount(title);
    return getSphereSubtitle(system, count);
  }

  if (type === "talent" || type === "feat") {
    const parent = extractSphere(url, sphere);
    if (parent) return `${parent} · ${type}`;
    if (system) return `${system} · ${type}`;
    return type === "talent" ? "Talent" : "Feat";
  }

  if (type === "class") {
    const slug = extractSlug(url);
    const sub = item.subtitle || CLASS_SUBTITLES[slug];
    if (sub) return `Class · ${sub}`;
    return system ? `Class · ${system}` : "Class";
  }

  if (type === "archetype" || type === "class-trait") {
    const cls = extractClassName(url);
    const label = type === "archetype" ? "Archetype" : "Trait";
    return cls ? `${label} · ${cls}` : label;
  }

  if (type === "article") {
    return system ? `Article · ${system}` : "Article";
  }

  return system ? `${system} · ${type}` : type;
}

// fallow-ignore-next-line complexity
export function scoreSearchItem(item: HeaderSearchItem, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = (item.title || "").toLowerCase();
  const sphere = (item.sphere || "").toLowerCase();
  const subtitle = (item.subtitle || "").toLowerCase();
  const type = item.type;

  let score = 0;

  // Title matching
  if (title === q) {
    score += 1000;
  } else if (title.startsWith(q)) {
    score += 600;
  } else if (
    title.includes(` ${q}`) ||
    title.includes(`(${q}`) ||
    title.includes(`- ${q}`)
  ) {
    score += 400;
  } else if (title.includes(q)) {
    score += 200;
  }

  // Primary entity boosts when matching query prefix
  if (type === "sphere" && (title === q || title.startsWith(q))) {
    score += 800;
  }

  // Associated sphere items (talents/feats in matched sphere)
  if (sphere && (sphere === q || sphere.startsWith(q))) {
    score += 350;
  }

  // Class subtitle association (e.g. "Alteration specialist")
  if (type === "class") {
    if (title.startsWith(q)) score += 500;
    else if (subtitle.toLowerCase().includes(q)) score += 450;
  }

  // Tag matches
  if (
    item.tags?.some(
      (t) => t.toLowerCase() === q || t.toLowerCase().startsWith(q),
    )
  ) {
    score += 100;
  }

  return score;
}

export function groupSearchResults(
  items: HeaderSearchItem[],
  query = "",
): Map<string, HeaderSearchItem[]> {
  const groups = new Map<string, HeaderSearchItem[]>();
  for (const cfg of CATEGORY_CONFIG) {
    groups.set(cfg.key, []);
  }

  const sortedItems = query
    ? [...items].sort(
        (a, b) => scoreSearchItem(b, query) - scoreSearchItem(a, query),
      )
    : items;

  for (const item of sortedItems) {
    const key = CATEGORY_CONFIG.some((c) => c.key === item.type)
      ? item.type
      : "other";
    const cfg = CATEGORY_CONFIG.find((c) => c.key === key);
    const list = groups.get(key) ?? [];
    if (!cfg || list.length < cfg.max) {
      list.push(item);
      groups.set(key, list);
    }
  }

  return groups;
}

function renderItemIcon(
  item: HeaderSearchItem,
  classImageMap: Record<string, string>,
): string {
  const slug = extractSlug(item.url);
  if (item.type === "sphere") {
    const iconId = item.icon || slug;
    return `<span class="search-panel-icon-wrap"><svg class="search-panel-sphere-icon" width="32" height="32" viewBox="-1 -1 18 18" aria-hidden="true"><use href="#si-${escapeHtml(iconId)}"/></svg></span>`;
  }
  if (item.type === "class") {
    const imgSrc = classImageMap[slug];
    if (imgSrc) {
      return `<span class="search-panel-icon-wrap"><img src="${escapeHtml(imgSrc)}" class="search-panel-class-img" alt="" width="32" height="32" loading="lazy" /></span>`;
    }
    return `<span class="search-panel-icon-wrap"><svg class="search-panel-class-fallback" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>`;
  }
  return `<span class="search-panel-icon-wrap search-panel-icon-empty" aria-hidden="true"></span>`;
}

function resolveSystemId(rawSystem?: string): string {
  if (!rawSystem) return "";
  const s = rawSystem.toLowerCase();
  if (s.includes("power")) return "power";
  if (s.includes("might")) return "might";
  if (s.includes("guile")) return "guile";
  if (s.includes("champ")) return "champions";
  return "";
}

function renderBadges(item: HeaderSearchItem): string {
  let out = "";
  if (item.tier) {
    out += `<span class="search-badge">${escapeHtml(item.tier)}</span>`;
  }
  if (item.tags && item.tags.length > 0) {
    const mainTag =
      item.tags.find((t) => {
        const lower = t.toLowerCase();
        return (
          lower === "base" ||
          lower === "advanced" ||
          lower === "utility" ||
          lower === "legendary"
        );
      }) || item.tags[0];
    if (mainTag && mainTag.toLowerCase() !== (item.tier || "").toLowerCase()) {
      const label = mainTag.toLowerCase() === "base" ? "Base Ability" : mainTag;
      out += `<span class="search-badge">${escapeHtml(label)}</span>`;
    }
  }
  return out;
}

// fallow-ignore-next-line complexity
export function renderResultsPanel(
  groups: Map<string, HeaderSearchItem[]>,
  classImageMap: Record<string, string>,
  query: string,
  totalResultsCount = 0,
): { html: string; totalRendered: number } {
  let totalRendered = 0;
  let html = "";

  for (const cfg of CATEGORY_CONFIG) {
    const items = groups.get(cfg.key);
    if (!items || items.length === 0) continue;

    html += `<div class="search-panel-group">`;
    html += `<div class="search-panel-group-header">${escapeHtml(cfg.label)}</div>`;
    html += `<div class="search-panel-group-items">`;

    for (const item of items) {
      const idx = totalRendered++;
      const isFirst = idx === 0;
      const subtitle = formatSubtitle(item);
      const iconHtml = renderItemIcon(item, classImageMap);
      const sysId = resolveSystemId(item.system);
      const dataSys = sysId ? ` data-system="${escapeHtml(sysId)}"` : "";
      const badges = renderBadges(item);

      html += `
        <a href="${escapeHtml(item.url)}" class="search-panel-item ${isFirst ? "is-selected" : ""}" role="option" data-idx="${idx}" aria-selected="${isFirst ? "true" : "false"}"${dataSys}>
          ${iconHtml}
          <div class="search-panel-item-text">
            <span class="search-panel-item-title">${escapeHtml(item.title)}</span>
            <div class="search-panel-item-sub-row">
              <span class="search-panel-item-sub">${escapeHtml(subtitle)}</span>
              ${badges}
            </div>
          </div>
        </a>
      `;
    }

    html += `</div></div>`;
  }

  if (totalRendered === 0) {
    html = `
      <div class="search-panel-empty">No results found for "${escapeHtml(query)}"</div>
      <div class="search-panel-footer">
        <span class="search-panel-see-all-spacer"></span>
        <div class="search-panel-hints">
          <span class="search-panel-hint">esc close</span>
          <span class="search-panel-hint">/ to focus</span>
        </div>
      </div>
    `;
    return { html, totalRendered: 0 };
  }

  const seeAllLink =
    totalResultsCount > totalRendered
      ? `<a href="${url(`search/?q=${encodeURIComponent(query)}`)}" class="search-panel-see-all">See all ${totalResultsCount} results →</a>`
      : `<span class="search-panel-see-all-spacer"></span>`;

  html += `
    <div class="search-panel-footer">
      ${seeAllLink}
      <div class="search-panel-hints">
        <span class="search-panel-hint">↑ ↓ navigate</span>
        <span class="search-panel-hint">↵ open</span>
        <span class="search-panel-hint">esc close</span>
        <span class="search-panel-hint">/ to focus</span>
      </div>
    </div>
  `;

  return { html, totalRendered };
}
