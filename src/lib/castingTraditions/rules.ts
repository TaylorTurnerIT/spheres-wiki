import type {
  AbilityScore,
  DrawbackEntry,
  EntryRef,
  TraditionChoice,
  TraditionChoiceOption,
  TraditionEntry,
  TraditionPredicate,
  TraditionRule,
} from "../types";
import type {
  ResolvedTraditionState,
  TraditionData,
  TraditionDiagnostic,
  TraditionSelection,
} from "./types";

const DEFAULT_CAM_OPTIONS: AbilityScore[] = ["int", "wis", "cha"];

export type AllowedCam = {
  ability: AbilityScore;
  mode: "always" | "if-higher-than-base" | "fixed";
};

function byId<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function refCount(ref: EntryRef): number {
  return ref.count ?? 1;
}

function refKey(ref: EntryRef): string {
  return [
    ref.kind ?? "",
    ref.sourceBook ?? "",
    ref.id,
    ref.option ?? "",
    ref.sphere ?? "",
  ].join("|");
}

function appendUniqueRefs(refs: EntryRef[], additions: EntryRef[]): EntryRef[] {
  const seen = new Set(refs.map(refKey));
  const result = [...refs];
  for (const ref of additions) {
    const key = refKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}

function choiceOptionsById(
  choices: TraditionChoice[],
): Map<string, TraditionChoiceOption> {
  const options = new Map<string, TraditionChoiceOption>();
  for (const choice of choices) {
    for (const option of choice.options) {
      options.set(`${choice.id}:${option.id}`, option);
    }
  }
  return options;
}

function collectChoiceDefinitions(
  selection: TraditionSelection,
  data: TraditionData,
): { tradition?: TraditionEntry; choices: TraditionChoice[] } {
  const drawbackMap = byId(data.drawbacks);
  const boonMap = byId(data.boons);
  const tradition = selection.traditionId
    ? data.traditions?.find((entry) => entry.id === selection.traditionId)
    : undefined;
  const choices = [
    ...(tradition?.choices ?? []),
    ...selection.drawbacks.flatMap(
      (ref) => drawbackMap.get(ref.id)?.choices ?? [],
    ),
    ...(selection.sphereDrawbacks ?? []).flatMap(
      (ref) => drawbackMap.get(ref.id)?.choices ?? [],
    ),
    ...selection.boons.flatMap((ref) => boonMap.get(ref.id)?.choices ?? []),
  ];
  return { tradition, choices };
}

function applyPresetChoiceSelections(
  selection: TraditionSelection,
  tradition: TraditionEntry | undefined,
): TraditionSelection {
  if (!tradition?.choiceSelections) return selection;
  return {
    ...selection,
    choices: {
      ...tradition.choiceSelections,
      ...(selection.choices ?? {}),
    },
  };
}

function selectedChoiceGrants(
  selected: TraditionSelection["choices"],
  choices: TraditionChoice[],
): EntryRef[] {
  const optionsById = choiceOptionsById(choices);
  return Object.entries(selected ?? {}).flatMap(([choiceId, optionIds]) =>
    optionIds.flatMap(
      (optionId) => optionsById.get(`${choiceId}:${optionId}`)?.grants ?? [],
    ),
  );
}

function applyChoiceGrants(
  selection: TraditionSelection,
  choices: TraditionChoice[],
): TraditionSelection {
  const grants = selectedChoiceGrants(selection.choices, choices);
  return {
    ...selection,
    drawbacks: appendUniqueRefs(
      selection.drawbacks,
      grants.filter((ref) => ref.kind === "drawback"),
    ),
    sphereDrawbacks: appendUniqueRefs(
      selection.sphereDrawbacks ?? [],
      grants.filter((ref) => ref.kind === "sphere-drawback"),
    ),
    boons: appendUniqueRefs(
      selection.boons,
      grants.filter((ref) => ref.kind === "boon"),
    ),
  };
}

function selectedChoiceOptions(
  selected: TraditionSelection["choices"],
  choices: TraditionChoice[],
): TraditionChoiceOption[] {
  const optionsById = choiceOptionsById(choices);
  return Object.entries(selected ?? {}).flatMap(([choiceId, optionIds]) =>
    optionIds.flatMap((optionId) => {
      const option = optionsById.get(`${choiceId}:${optionId}`);
      return option ? [option] : [];
    }),
  );
}

function selectedIds(state: ResolvedTraditionState): Set<string> {
  return new Set([
    ...state.drawbacks.map(({ entry }) => entry.id),
    ...state.sphereDrawbacks.map(({ entry }) => entry.id),
    ...state.boons.map(({ entry }) => entry.id),
  ]);
}

export function buildTraditionState(
  selection: TraditionSelection,
  data: TraditionData,
): ResolvedTraditionState {
  const drawbackMap = byId(data.drawbacks);
  const boonMap = byId(data.boons);
  const initial = collectChoiceDefinitions(selection, data);
  const selectionWithPresetChoices = applyPresetChoiceSelections(
    selection,
    initial.tradition,
  );
  const expandedSelection = applyChoiceGrants(
    selectionWithPresetChoices,
    initial.choices,
  );
  const final = collectChoiceDefinitions(expandedSelection, data);

  return {
    selection: expandedSelection,
    tradition: final.tradition,
    choices: final.choices,
    drawbacks: expandedSelection.drawbacks.flatMap((ref) => {
      const entry = drawbackMap.get(ref.id);
      return entry ? [{ ref, entry }] : [];
    }),
    sphereDrawbacks: (expandedSelection.sphereDrawbacks ?? []).flatMap(
      (ref) => {
        const entry = drawbackMap.get(ref.id);
        return entry ? [{ ref, entry }] : [];
      },
    ),
    boons: expandedSelection.boons.flatMap((ref) => {
      const entry = boonMap.get(ref.id);
      return entry ? [{ ref, entry }] : [];
    }),
  };
}

/**
 * Build a TraditionSelection pre-populated from a preset TraditionEntry.
 * Callers can pass the result directly to validateTradition or buildTraditionState.
 */
export function selectionFromTradition(
  entry: TraditionEntry,
  _data: TraditionData,
): TraditionSelection {
  return {
    traditionId: entry.id,
    name: entry.name,
    // Pre-set CAM only for fixed-mode traditions with exactly one ability
    cam:
      entry.cam.mode === "fixed" && entry.cam.abilities.length === 1
        ? entry.cam.abilities[0]
        : undefined,
    drawbacks: entry.drawbacks ?? [],
    sphereDrawbacks: entry.sphereDrawbacks ?? [],
    boons: entry.boons ?? [],
    choices: entry.choiceSelections,
  };
}

function evaluatePredicate(
  predicate: TraditionPredicate | undefined,
  state: ResolvedTraditionState,
): boolean {
  if (!predicate) return true;
  if ("drawback" in predicate)
    return selectedIds(state).has(predicate.drawback);
  if ("boon" in predicate) return selectedIds(state).has(predicate.boon);
  if ("choice" in predicate) {
    return Object.values(state.selection.choices ?? {}).some((choices) =>
      choices.includes(predicate.choice),
    );
  }
  if ("not" in predicate) return !evaluatePredicate(predicate.not, state);
  if ("all" in predicate) {
    return predicate.all.every((child) => evaluatePredicate(child, state));
  }
  if ("any" in predicate) {
    return predicate.any.some((child) => evaluatePredicate(child, state));
  }
  return false;
}

function ruleAddsDrawbackValue(
  rule: TraditionRule,
  state: ResolvedTraditionState,
): number {
  if (rule.op !== "add-drawback-value") return 0;
  return evaluatePredicate(rule.when, state) ? rule.value : 0;
}

function drawbackValue(
  ref: EntryRef,
  entry: DrawbackEntry,
  state: ResolvedTraditionState,
): number {
  const extra = (entry.rules ?? []).reduce(
    (sum, rule) => sum + ruleAddsDrawbackValue(rule, state),
    0,
  );
  return (entry.drawbackValue + extra) * refCount(ref);
}

export function calculateGeneralDrawbackValue(
  state: ResolvedTraditionState,
): number {
  const baseDrawbackValue = state.drawbacks.reduce((sum, { ref, entry }) => {
    if (entry.drawbackKind !== "general") return sum;
    return sum + drawbackValue(ref, entry, state);
  }, 0);
  // Only sum addsDrawbackValue from choices on general drawbacks (B21)
  const generalChoices = state.drawbacks
    .filter(({ entry }) => entry.drawbackKind === "general")
    .flatMap(({ entry }) => entry.choices ?? []);
  const choiceValue = selectedChoiceOptions(
    state.selection.choices,
    generalChoices,
  ).reduce((sum, option) => sum + (option.addsDrawbackValue ?? 0), 0);
  return baseDrawbackValue + choiceValue;
}

function calculateBoonCost(state: ResolvedTraditionState): number {
  return state.boons.reduce(
    (sum, { ref, entry }) => sum + entry.boonCost * refCount(ref),
    0,
  );
}

export function calculateAvailableBoonSlots(
  state: ResolvedTraditionState,
): number {
  return Math.max(0, Math.floor(calculateGeneralDrawbackValue(state) / 2));
}

export function calculateUnspentDrawbackValue(
  state: ResolvedTraditionState,
): number {
  return calculateGeneralDrawbackValue(state) - calculateBoonCost(state) * 2;
}

export function bonusSpellPointFormula(
  unspentDrawbacks: number,
): string | null {
  const formulas: Record<number, string> = {
    1: "+1, +1 per 6 levels in casting classes",
    2: "+1, +1 per 3 levels in casting classes",
    3: "+1 per odd level in a casting class",
    4: "+1, +1 per 1.5 levels in casting classes",
    5: "+1 per level in a casting class",
  };
  return formulas[Math.min(Math.max(unspentDrawbacks, 0), 5)] ?? null;
}

function applyCamRuleToMap(
  allowed: Map<AbilityScore, AllowedCam["mode"]>,
  rule: TraditionRule,
  state: ResolvedTraditionState,
): Map<AbilityScore, AllowedCam["mode"]> {
  if (!evaluatePredicate(rule.when, state)) return allowed;
  if (rule.op === "allow-cam") {
    if (!allowed.has(rule.ability)) {
      allowed.set(rule.ability, rule.mode);
    }
  }
  if (rule.op === "set-cam") {
    const entryMode: AllowedCam["mode"] =
      rule.mode === "fixed"
        ? "fixed"
        : rule.mode === "highest"
          ? "if-higher-than-base"
          : "always";
    return new Map(rule.abilities.map((a) => [a, entryMode]));
  }
  return allowed;
}

function traditionCamMode(
  mode: TraditionEntry["cam"]["mode"],
): AllowedCam["mode"] {
  if (mode === "fixed") return "fixed";
  if (mode === "highest") return "if-higher-than-base";
  return "always";
}

function initialAllowedCams(
  tradition: TraditionEntry | undefined,
): Map<AbilityScore, AllowedCam["mode"]> {
  if (!tradition) {
    return new Map(DEFAULT_CAM_OPTIONS.map((a) => [a, "always" as const]));
  }
  const mode = traditionCamMode(tradition.cam.mode);
  return new Map(
    tradition.cam.abilities.map(
      (a) => [a, mode] as [AbilityScore, AllowedCam["mode"]],
    ),
  );
}

function applyCamRules(
  allowed: Map<AbilityScore, AllowedCam["mode"]>,
  rules: TraditionRule[] | undefined,
  state: ResolvedTraditionState,
): Map<AbilityScore, AllowedCam["mode"]> {
  let result = allowed;
  for (const rule of rules ?? []) {
    result = applyCamRuleToMap(result, rule, state);
  }
  return result;
}

function formatAllowedCams(
  allowed: Map<AbilityScore, AllowedCam["mode"]>,
): AllowedCam[] {
  return [...allowed.entries()].map(([ability, mode]) => ({ ability, mode }));
}

/**
 * Returns allowed casting ability modifiers with their mode annotation.
 * Starts from tradition.cam (if any) instead of the default {int,wis,cha} set,
 * then applies drawback, tradition, and boon rules in order (B19, B22).
 */
export function getAllowedCastingAbilities(
  state: ResolvedTraditionState,
): AllowedCam[] {
  let allowed = initialAllowedCams(state.tradition);
  for (const { entry } of [...state.drawbacks, ...state.sphereDrawbacks]) {
    allowed = applyCamRules(allowed, entry.rules, state);
  }
  allowed = applyCamRules(allowed, state.tradition?.rules, state);
  for (const { entry } of state.boons) {
    allowed = applyCamRules(allowed, entry.rules, state);
  }

  return formatAllowedCams(allowed);
}

function missingRefDiagnostics(
  selection: TraditionSelection,
  data: TraditionData,
): TraditionDiagnostic[] {
  const knownDrawbacks = new Set(data.drawbacks.map((entry) => entry.id));
  const knownBoons = new Set(data.boons.map((entry) => entry.id));
  const diagnostics: TraditionDiagnostic[] = [];

  for (const ref of [
    ...selection.drawbacks,
    ...(selection.sphereDrawbacks ?? []),
  ]) {
    if (!knownDrawbacks.has(ref.id)) {
      diagnostics.push({
        severity: "error",
        code: "unknown-drawback",
        message: `Unknown drawback: ${ref.id}`,
        sourceIds: [ref.id],
      });
    }
  }

  for (const ref of selection.boons) {
    if (!knownBoons.has(ref.id)) {
      diagnostics.push({
        severity: "error",
        code: "unknown-boon",
        message: `Unknown boon: ${ref.id}`,
        sourceIds: [ref.id],
      });
    }
  }

  return diagnostics;
}

function prerequisiteDiagnostics(
  state: ResolvedTraditionState,
): TraditionDiagnostic[] {
  return [...state.drawbacks, ...state.sphereDrawbacks, ...state.boons].flatMap(
    ({ entry }) => {
      if (evaluatePredicate(entry.requires, state)) return [];
      return [
        {
          severity: "error",
          code: "missing-prerequisite",
          message: `${entry.name} has unmet prerequisites.`,
          sourceIds: [entry.id],
        } satisfies TraditionDiagnostic,
      ];
    },
  );
}

function incompatibilityDiagnostics(
  state: ResolvedTraditionState,
): TraditionDiagnostic[] {
  const ids = selectedIds(state);
  return [...state.drawbacks, ...state.sphereDrawbacks, ...state.boons].flatMap(
    ({ entry }) =>
      (entry.incompatible ?? [])
        .filter((id) => ids.has(id))
        .map(
          (id) =>
            ({
              severity: "error",
              code: "incompatible-selection",
              message: `${entry.name} is incompatible with ${id}.`,
              sourceIds: [entry.id, id],
            }) satisfies TraditionDiagnostic,
        ),
  );
}

function choiceCardinalityDiagnostics(
  choice: TraditionChoice,
  selectedOptionIds: string[],
): TraditionDiagnostic[] {
  const diagnostics: TraditionDiagnostic[] = [];
  const min = choice.min ?? 0;
  const max = choice.max ?? Number.POSITIVE_INFINITY;

  if (selectedOptionIds.length < min) {
    diagnostics.push({
      severity: "error",
      code: "missing-choice",
      message: `${choice.label} requires at least ${min} selection${min === 1 ? "" : "s"}.`,
      sourceIds: [choice.id],
    });
  }

  if (selectedOptionIds.length > max) {
    diagnostics.push({
      severity: "error",
      code: "too-many-choices",
      message: `${choice.label} allows at most ${max} selection${max === 1 ? "" : "s"}.`,
      sourceIds: [choice.id],
    });
  }

  return diagnostics;
}

function unknownOptionDiagnostics(
  choice: TraditionChoice,
  selectedOptionIds: string[],
): TraditionDiagnostic[] {
  const optionIds = new Set(choice.options.map((option) => option.id));
  if (optionIds.size === 0) return [];
  return selectedOptionIds.flatMap((optionId) => {
    if (optionIds.has(optionId)) return [];
    return [
      {
        severity: "error",
        code: "unknown-choice-option",
        message: `${optionId} is not a valid option for ${choice.label}.`,
        sourceIds: [choice.id, optionId],
      } satisfies TraditionDiagnostic,
    ];
  });
}

function choiceOptionPrerequisiteDiagnostics(
  choice: TraditionChoice,
  selectedOptionIds: string[],
  state: ResolvedTraditionState,
): TraditionDiagnostic[] {
  const optionsById = new Map(
    choice.options.map((option) => [option.id, option]),
  );

  return selectedOptionIds.flatMap((optionId) => {
    const option = optionsById.get(optionId);
    if (!option || evaluatePredicate(option.requires, state)) return [];
    return [
      {
        severity: "error",
        code: "missing-choice-prerequisite",
        message: `${option.label} has unmet prerequisites.`,
        sourceIds: [choice.id, option.id],
      } satisfies TraditionDiagnostic,
    ];
  });
}

function unknownChoiceDiagnostics(
  selected: Record<string, string[]>,
  choices: TraditionChoice[],
): TraditionDiagnostic[] {
  const knownChoiceIds = new Set(choices.map((choice) => choice.id));
  return Object.keys(selected).flatMap((choiceId) => {
    if (knownChoiceIds.has(choiceId)) return [];
    return [
      {
        severity: "error",
        code: "unknown-choice",
        message: `Unknown choice: ${choiceId}`,
        sourceIds: [choiceId],
      } satisfies TraditionDiagnostic,
    ];
  });
}

function knownChoiceDiagnostics(
  choice: TraditionChoice,
  selected: Record<string, string[]>,
  state: ResolvedTraditionState,
): TraditionDiagnostic[] {
  const selectedOptionIds = selected[choice.id] ?? [];
  return [
    ...choiceCardinalityDiagnostics(choice, selectedOptionIds),
    ...unknownOptionDiagnostics(choice, selectedOptionIds),
    ...choiceOptionPrerequisiteDiagnostics(choice, selectedOptionIds, state),
  ];
}

function choiceDiagnostics(
  state: ResolvedTraditionState,
): TraditionDiagnostic[] {
  const selected = state.selection.choices ?? {};

  return [
    ...state.choices.flatMap((choice) =>
      knownChoiceDiagnostics(choice, selected, state),
    ),
    ...unknownChoiceDiagnostics(selected, state.choices),
  ];
}

export function validateTradition(
  selection: TraditionSelection,
  data: TraditionData,
): TraditionDiagnostic[] {
  const state = buildTraditionState(selection, data);
  const diagnostics = [
    ...missingRefDiagnostics(state.selection, data),
    ...prerequisiteDiagnostics(state),
    ...incompatibilityDiagnostics(state),
    ...choiceDiagnostics(state),
  ];

  const boonSlots = calculateAvailableBoonSlots(state);
  const boonCost = calculateBoonCost(state);
  if (boonCost > boonSlots) {
    diagnostics.push({
      severity: "error",
      code: "insufficient-drawbacks",
      message: `Selected boons cost ${boonCost}, but only ${boonSlots} boon slots are available.`,
      sourceIds: state.boons.map(({ entry }) => entry.id),
    });
  }

  if (
    selection.cam &&
    !getAllowedCastingAbilities(state).some((c) => c.ability === selection.cam)
  ) {
    diagnostics.push({
      severity: "error",
      code: "invalid-cam",
      message: `${selection.cam.toUpperCase()} is not an allowed casting ability modifier.`,
      sourceIds: [],
    });
  }

  return diagnostics;
}
