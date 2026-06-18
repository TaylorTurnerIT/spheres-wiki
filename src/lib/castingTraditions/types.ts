import type {
  AbilityScore,
  BoonEntry,
  DrawbackEntry,
  EntryRef,
  TraditionEntry,
} from "../types";

export type TraditionSelection = {
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
