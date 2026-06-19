import type { TraditionPredicate } from "../types";
import type { TraditionSelection, TraditionData, TraditionDiagnostic } from "./types";
import { buildTraditionState, validateTradition, calculateAvailableBoonSlots } from "./rules";

// ── Client-side entry types ─────────────────────────────────────────────────

export type ClientDrawback = {
  id: string;
  name: string;
  drawbackKind: string;
  drawbackValue: number;
  sphere?: string | null;
  spheres?: string[] | null;
  sourceBookTitle: string;
  tags: string[];
  bodyHtml: string;
  bodyPlain: string;
  choices?: unknown;
  requires?: unknown;
  incompatible?: string[] | null;
  rules?: unknown;
  buyoff?: string | null;
};

export type ClientBoon = {
  id: string;
  name: string;
  boonCost: number;
  sourceBookTitle: string;
  tags: string[];
  bodyHtml: string;
  bodyPlain: string;
  choices?: unknown;
  requires?: unknown;
  incompatible?: string[] | null;
  rules?: unknown;
};

export type ClientTradition = {
  id: string;
  name: string;
  traditionKind: string;
  cam: { mode: string; abilities: string[] };
  drawbacks: { id: string; count?: number }[];
  sphereDrawbacks: { id: string }[];
  boons: { id: string }[];
  choices?: unknown;
  choiceSelections?: unknown;
};

export type BuilderStore = {
  drawbacks: ClientDrawback[];
  boons: ClientBoon[];
  traditions: ClientTradition[];
};

export type SelectedIds = {
  drawbacks: string[];
  sphereDrawbacks: string[];
  boons: string[];
};

// ── Filtering ───────────────────────────────────────────────────────────────

export function filterByText<T extends { name: string }>(items: T[], query: string): T[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

// ── Grouping ────────────────────────────────────────────────────────────────

export function groupBySphere(drawbacks: ClientDrawback[]): Map<string, ClientDrawback[]> {
  const groups = new Map<string, ClientDrawback[]>();
  for (const d of drawbacks) {
    const sphere = d.sphere ?? (d.spheres ?? []).join("/") ?? "Other";
    if (!groups.has(sphere)) groups.set(sphere, []);
    groups.get(sphere)!.push(d);
  }
  // Sort each group by name
  for (const [, items] of groups) {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }
  // Sort groups by sphere name
  return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

// ── Formatted names ─────────────────────────────────────────────────────────

export function formatIncompatibleName(id: string, store: BuilderStore): string {
  const found = store.drawbacks.find((d) => d.id === id) ?? store.boons.find((b) => b.id === id);
  return found?.name ?? id;
}

export function prerequisiteExcerpt(
  entry: { requires?: TraditionPredicate },
  store: BuilderStore,
): string {
  return predicateExcerpt(entry.requires, store);
}

function leafExcerpt(predicate: TraditionPredicate, store: BuilderStore): string {
  if ("drawback" in predicate) {
    return store.drawbacks.find((d) => d.id === predicate.drawback)?.name ?? predicate.drawback;
  }
  if ("boon" in predicate) {
    return store.boons.find((b) => b.id === predicate.boon)?.name ?? predicate.boon;
  }
  if ("choice" in predicate) return `choice: ${predicate.choice}`;
  return "";
}

function predicateExcerpt(
  predicate: TraditionPredicate | undefined,
  store: BuilderStore,
): string {
  if (!predicate) return "";
  if ("drawback" in predicate || "boon" in predicate || "choice" in predicate) {
    return leafExcerpt(predicate, store);
  }
  if ("not" in predicate) return `NOT ${predicateExcerpt(predicate.not, store)}`;
  if ("all" in predicate) {
    return predicate.all.map((p) => predicateExcerpt(p, store)).join(" and ");
  }
  if ("any" in predicate) {
    return predicate.any.map((p) => predicateExcerpt(p, store)).join(" or ");
  }
  return "";
}

// ── Selection validation ────────────────────────────────────────────────────

function addEntryToHypothetical(
  hypothetical: TraditionSelection,
  entryId: string,
  kind: "drawback" | "sphere-drawback" | "boon",
): TraditionSelection {
  if (kind === "drawback") {
    return { ...hypothetical, drawbacks: [...hypothetical.drawbacks, { id: entryId }] };
  }
  if (kind === "sphere-drawback") {
    return { ...hypothetical, sphereDrawbacks: [...(hypothetical.sphereDrawbacks ?? []), { id: entryId }] };
  }
  return { ...hypothetical, boons: [...hypothetical.boons, { id: entryId }] };
}

function isAlreadySelected(
  hypothetical: TraditionSelection,
  entryId: string,
  kind: "drawback" | "sphere-drawback" | "boon",
): boolean {
  if (kind === "drawback") return hypothetical.drawbacks.some((r) => r.id === entryId);
  if (kind === "sphere-drawback") return (hypothetical.sphereDrawbacks ?? []).some((r) => r.id === entryId);
  return hypothetical.boons.some((r) => r.id === entryId);
}

export function canSelectEntry(
  entryId: string,
  kind: "drawback" | "sphere-drawback" | "boon",
  selectedIds: SelectedIds,
  store: BuilderStore,
  currentBoonSlots: number,
  _availableBoonSlots: number,
): { allowed: boolean; reason?: string } {
  let hypothetical: TraditionSelection = {
    drawbacks: selectedIds.drawbacks.map((id) => ({ id })),
    sphereDrawbacks: selectedIds.sphereDrawbacks.map((id) => ({ id })),
    boons: selectedIds.boons.map((id) => ({ id })),
  };

  if (isAlreadySelected(hypothetical, entryId, kind)) return { allowed: true };

  hypothetical = addEntryToHypothetical(hypothetical, entryId, kind);

  const traitData: TraditionData = {
    drawbacks: store.drawbacks as any[],
    boons: store.boons as any[],
    traditions: store.traditions as any[],
  };

  const diagnostics = validateTradition(hypothetical, traitData);
  const entryErrors = diagnostics.filter(
    (d) => d.severity === "error" && d.sourceIds.includes(entryId),
  );

  if (entryErrors.length > 0) {
    return { allowed: false, reason: entryErrors[0].message };
  }

  if (kind === "boon") {
    const state = buildTraditionState(hypothetical, traitData);
    const slots = calculateAvailableBoonSlots(state);
    const boon = store.boons.find((b) => b.id === entryId);
    const cost = boon?.boonCost ?? 1;
    if (currentBoonSlots + cost > slots) {
      return { allowed: false, reason: `Not enough boon slots (need ${cost}, have ${slots} total, ${slots - currentBoonSlots} remaining)` };
    }
  }

  return { allowed: true };
}

// ── Safe-fix eligibility ────────────────────────────────────────────────────

function addMissingIdsToHypothetical(
  missingIds: string[],
  store: BuilderStore,
  ids: SelectedIds,
): SelectedIds | null {
  const result = {
    drawbacks: [...ids.drawbacks],
    sphereDrawbacks: [...ids.sphereDrawbacks],
    boons: [...ids.boons],
  };

  for (const missingId of missingIds) {
    const isDrawback = store.drawbacks.some((d) => d.id === missingId);
    if (isDrawback && !result.drawbacks.includes(missingId)) {
      result.drawbacks.push(missingId);
      continue;
    }
    const isBoon = store.boons.some((b) => b.id === missingId);
    if (!isBoon) continue;

    const totalCost = [...result.boons, missingId].reduce((sum, id) => {
      const b = store.boons.find((bb) => bb.id === id);
      return sum + (b?.boonCost ?? 0);
    }, 0);
    const data: TraditionData = {
      drawbacks: store.drawbacks as any[],
      boons: store.boons as any[],
    };
    const state = buildTraditionState(
      { drawbacks: result.drawbacks.map((id) => ({ id })), boons: result.boons.map((id) => ({ id })) },
      data,
    );
    if (totalCost > calculateAvailableBoonSlots(state)) return null;
    if (!result.boons.includes(missingId)) result.boons.push(missingId);
  }
  return result;
}

export function isSafeFix(
  diagnostic: TraditionDiagnostic,
  store: BuilderStore,
  selectedIds: SelectedIds,
): boolean {
  if (diagnostic.code !== "missing-prerequisite") return false;

  const entryId = diagnostic.sourceIds[0];
  const entry = store.drawbacks.find((d) => d.id === entryId) ??
    store.boons.find((b) => b.id === entryId);
  if (!entry?.requires) return false;

  const missingIds = collectRequiredIds(entry.requires as any);
  const hypotheticalIds = addMissingIdsToHypothetical(missingIds, store, selectedIds);
  if (!hypotheticalIds) return false;

  const traitData: TraditionData = {
    drawbacks: store.drawbacks as any[],
    boons: store.boons as any[],
  };
  const selection: TraditionSelection = {
    drawbacks: hypotheticalIds.drawbacks.map((id) => ({ id })),
    sphereDrawbacks: hypotheticalIds.sphereDrawbacks.map((id) => ({ id })),
    boons: hypotheticalIds.boons.map((id) => ({ id })),
  };
  const diagnostics = validateTradition(selection, traitData);
  return diagnostics.filter((d) => d.severity === "error").length === 0;
}

function collectRequiredIds(predicate: TraditionPredicate): string[] {
  const result: string[] = [];
  if ("drawback" in predicate) result.push(predicate.drawback);
  if ("boon" in predicate) result.push(predicate.boon);
  if ("all" in predicate) {
    for (const p of predicate.all) result.push(...collectRequiredIds(p));
  }
  if ("any" in predicate) {
    for (const p of predicate.any) result.push(...collectRequiredIds(p));
  }
  // "not" and "choice" are not actionable as "add to fix"
  return result;
}
