import type {
  AbilityScore,
  BoonEntry,
  DrawbackEntry,
  EntryRef,
  TraditionChoice,
  TraditionEntry,
} from "../types";

export type TraditionSelection = {
  traditionId?: string;
  name?: string;
  magicType?: TraditionEntry["magicType"];
  cam?: AbilityScore;
  drawbacks: EntryRef[];
  sphereDrawbacks?: EntryRef[];
  boons: EntryRef[];
  choices?: Record<string, string[]>;
};

export type TraditionData = {
  drawbacks: DrawbackEntry[];
  boons: BoonEntry[];
  traditions?: TraditionEntry[];
};

export type ResolvedTraditionState = {
  selection: TraditionSelection;
  tradition?: TraditionEntry;
  choices: TraditionChoice[];
  drawbacks: Array<{ ref: EntryRef; entry: DrawbackEntry }>;
  sphereDrawbacks: Array<{ ref: EntryRef; entry: DrawbackEntry }>;
  boons: Array<{ ref: EntryRef; entry: BoonEntry }>;
};

export type TraditionDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  sourceIds: string[];
};
