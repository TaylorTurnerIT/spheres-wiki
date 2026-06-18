import {
  bonusSpellPointFormula,
  buildTraditionState,
  calculateUnspentDrawbackValue,
} from "./rules";
import type { TraditionData, TraditionSelection } from "./types";

function formatRefs(
  refs: Array<{
    ref: { count?: number; option?: string };
    entry: { name: string };
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
): string {
  const state = buildTraditionState(selection, data);
  const lines = [
    `### ${selection.name || "Custom Tradition"}`,
    `**Casting Ability Modifier:** ${selection.cam?.toUpperCase() ?? "Choose one"}`,
    `**Drawbacks:** ${formatRefs(state.drawbacks)}`,
  ];

  if (state.sphereDrawbacks.length > 0) {
    lines.push(`**Sphere Drawbacks:** ${formatRefs(state.sphereDrawbacks)}`);
  }

  const unspent = calculateUnspentDrawbackValue(state);
  const spellPointBoon = bonusSpellPointFormula(unspent);
  const boonText = formatRefs(state.boons);
  lines.push(
    `**Boons:** ${[boonText, spellPointBoon].filter(Boolean).join("; ")}`,
  );

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
      magicType: selection.magicType,
      cam: selection.cam,
      drawbacks: state.drawbacks.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        count: ref.count ?? 1,
        option: ref.option,
      })),
      sphereDrawbacks: state.sphereDrawbacks.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        sphere: entry.sphere,
        count: ref.count ?? 1,
        option: ref.option,
      })),
      boons: state.boons.map(({ ref, entry }) => ({
        id: entry.id,
        name: entry.name,
        count: ref.count ?? 1,
        option: ref.option,
      })),
      choices: selection.choices,
    },
    null,
    2,
  );
}
