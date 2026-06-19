import {
  bonusSpellPointFormula,
  buildTraditionState,
  calculateAvailableBoonSlots,
  calculateGeneralDrawbackValue,
  calculateUnspentDrawbackValue,
} from "./rules";
import type { TraditionData, TraditionSelection } from "./types";

type EntryWithBody = { entry: { name: string }; ref: { count?: number; option?: string } };

function appendDetailSection(
  lines: string[],
  heading: string,
  items: Array<EntryWithBody>,
): void {
  if (items.length === 0) return;
  lines.push(`\n## ${heading}`);
  for (const { entry } of items) {
    const body = (entry as any).bodyPlain ?? "";
    if (!body) continue;
    lines.push(`\n### ${entry.name}`);
    lines.push(body.split("\n").map((l: string) => `> ${l}`).join("\n"));
  }
}

function formatRefs(
  refs: Array<{
    ref: { count?: number; option?: string };
    entry: { name: string; bodyPlain?: string };
  }>,
): string {
  if (refs.length === 0) return "None";
  return refs
    .map(({ ref, entry }) => {
      const count = ref.count && ref.count > 1 ? ` x${ref.count}` : "";
      const option = ref.option ? ` (${ref.option})` : "";
      return `${entry.name}${count}${option}`;
    })
    .join(", ");
}

export function exportTraditionMarkdown(
  selection: TraditionSelection,
  data: TraditionData,
  detailed = false,
): string {
  const state = buildTraditionState(selection, data);
  const lines = [
    `### ${selection.name || "Custom Tradition"}`,
    `**Casting Ability Modifier:** ${selection.cam?.toUpperCase() ?? "Choose one"}`,
    `**Drawbacks:** ${formatRefs(state.drawbacks)}`,
  ];

  if (state.sphereDrawbacks.length > 0) {
    lines.push(`**Sphere-Specific Drawbacks:** ${formatRefs(state.sphereDrawbacks)}`);
  }

  const unspent = calculateUnspentDrawbackValue(state);
  const spellPointBoon = bonusSpellPointFormula(unspent);
  const boonDisplay = state.boons.length > 0 ? formatRefs(state.boons) : null;
  lines.push(
    `**Boons:** ${[boonDisplay, spellPointBoon].filter(Boolean).join("; ") || "None"}`,
  );

  const baseGdv = calculateGeneralDrawbackValue(state);
  const baseSlots = calculateAvailableBoonSlots(state);
  const manualGdv = selection.manualGeneralDrawbackValue ?? 0;
  const manualSlots = selection.manualBoonSlots ?? 0;
  const gdvPart = manualGdv ? ` (base: ${baseGdv} + GM: ${manualGdv})` : "";
  const slotsPart = manualSlots ? ` (base: ${baseSlots} + GM: ${manualSlots})` : "";
  lines.push(`**General Drawback Value:** ${baseGdv + manualGdv}${gdvPart}`);
  lines.push(`**Available Boon Slots:** ${baseSlots + manualSlots}${slotsPart}`);

  if (selection.camOverride) {
    lines.push(`**CAM Override:** Yes (GM)`);
  }

  if (detailed) {
    appendDetailSection(lines, "Drawbacks", state.drawbacks);
    appendDetailSection(lines, "Sphere-Specific Drawbacks", state.sphereDrawbacks);
    appendDetailSection(lines, "Boons", state.boons);
  }

  return `${lines.join("\n")}\n`;
}

export function exportTraditionJson(
  selection: TraditionSelection,
  data: TraditionData,
): string {
  const state = buildTraditionState(selection, data);
  return JSON.stringify(
    {
      name: selection.name ?? "Custom Tradition",
      cam: selection.cam,
      camOverride: selection.camOverride ?? false,
      manualGeneralDrawbackValue: selection.manualGeneralDrawbackValue ?? 0,
      manualBoonSlots: selection.manualBoonSlots ?? 0,
      drawbacks: state.drawbacks.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        count: ref.count ?? 1,
        option: ref.option,
        bodyHtml: (entry as any).bodyHtml ?? "",
        bodyPlain: (entry as any).bodyPlain ?? "",
      })),
      sphereDrawbacks: state.sphereDrawbacks.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        sphere: entry.sphere,
        count: ref.count ?? 1,
        option: ref.option,
        bodyHtml: (entry as any).bodyHtml ?? "",
        bodyPlain: (entry as any).bodyPlain ?? "",
      })),
      boons: state.boons.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        count: ref.count ?? 1,
        option: ref.option,
        bodyHtml: (entry as any).bodyHtml ?? "",
        bodyPlain: (entry as any).bodyPlain ?? "",
      })),
      choices: selection.choices,
    },
    null,
    2,
  );
}
