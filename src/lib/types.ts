// src/lib/types.ts

export type BookMeta = {
  slug: string;
  title: string;
  publisher: string;
  publishedDate: string;
  system?: "power" | "might" | "guile" | "champions";
  price?: string;
  buyUrl?: string;
  coverImage?: string;
};

export type TalentCategory = {
  label: string;
  tiers?: Array<"base" | "basic" | "advanced" | "feat">;
  tags?: string[];
  excludeTags?: string[];
};

export type SectionDefinition = {
  label: string;
  categories?: TalentCategory[];
};

export type AbilityScore = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type EntryRef = {
  id: string;
  label?: string;
  kind?: "drawback" | "sphere-drawback" | "boon" | "feat" | "talent";
  count?: number;
  option?: string;
  sphere?: string;
  sourceBook?: string;
};

export type TraditionPredicate =
  | { drawback: string }
  | { boon: string }
  | { choice: string }
  | { not: TraditionPredicate }
  | { all: TraditionPredicate[] }
  | { any: TraditionPredicate[] };

export type TraditionRule =
  | {
      op: "allow-cam";
      ability: AbilityScore;
      mode: "always" | "if-higher-than-base";
      when?: TraditionPredicate;
    }
  | {
      op: "set-cam";
      abilities: AbilityScore[];
      mode: "fixed" | "choose-one" | "highest";
      when?: TraditionPredicate;
    }
  | { op: "add-drawback-value"; value: number; when?: TraditionPredicate }
  | {
      op: "add-bonus-spell-points";
      formula: string;
      when?: TraditionPredicate;
    }
  | {
      op: "grant-talent";
      sphere?: string;
      talent?: string;
      selector?: string;
      when?: TraditionPredicate;
    }
  | {
      op: "grant-feat";
      feat?: string;
      selector?: string;
      when?: TraditionPredicate;
    }
  | { op: "require-choice"; choice: string; when?: TraditionPredicate }
  | { op: "export-note"; text: string; when?: TraditionPredicate };

export type TraditionChoiceOption = {
  id: string;
  label: string;
  grants?: EntryRef[];
  addsDrawbackValue?: number;
  requires?: TraditionPredicate;
};

export type TraditionChoice = {
  id: string;
  label: string;
  selector?: "drawback" | "sphere-drawback" | "boon" | "feat" | "talent";
  min?: number;
  max?: number;
  options: TraditionChoiceOption[];
};

export type RepeatRule = {
  min?: number;
  max?: number;
  valueMode?: "flat" | "per-selection" | "scaling";
};

export type DrawbackEntry = {
  type: "drawback";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  drawbackKind: "general" | "sphere" | "dual-sphere";
  drawbackValue: number;
  sphere?: string;
  spheres?: string[];
  grants?: EntryRef[];
  buyoff?: "talent" | "feat" | "none" | "custom";
  repeat?: RepeatRule;
  choices?: TraditionChoice[];
  requires?: TraditionPredicate;
  incompatible?: string[];
  rules?: TraditionRule[];
};

export type BoonEntry = {
  type: "boon";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  boonCost: number;
  repeat?: RepeatRule;
  choices?: TraditionChoice[];
  requires?: TraditionPredicate;
  incompatible?: string[];
  rules?: TraditionRule[];
};

export type TraditionEntry = {
  type: "tradition";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  traditionKind: "standard" | "custom" | "card" | "variant";
  magicType?: "arcane" | "divine" | "psychic" | "other" | "none" | "custom";
  cam: {
    mode: "fixed" | "choose-one" | "highest";
    abilities: AbilityScore[];
  };
  drawbacks: EntryRef[];
  sphereDrawbacks?: EntryRef[];
  boons: EntryRef[];
  choices?: TraditionChoice[];
  choiceSelections?: Record<string, string[]>;
  classes?: string[];
  parentTradition?: string;
  notes?: string[];
  rules?: TraditionRule[];
};

export type SphereEntry = {
  type: "sphere";
  id: string;
  system: string;
  name: string;
  icon: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  categoryDefinitions?: TalentCategory[];
  sectionDefinitions?: SectionDefinition[];
};

export type TalentEntry = {
  type: "talent";
  id: string;
  sphere: string;
  dualSphere?: string;
  system: string;
  tier: "base" | "basic" | "advanced";
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type ClassTableData = {
  /** Column headers for class-specific (non-standard) columns */
  extraHeaders: string[];
  /** Source "Special" column text per level (1-20), for dynamic table rendering */
  specialSource: Record<number, string>;
  /** Extra column values per level (1-20); each value array aligns with extraHeaders */
  extraRowData: Record<number, string[]>;
};

export type ClassEntry = {
  type: "class";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  hitDie: number;
  alignment: string;
  startingWealth: string;
  skillRanks: number;
  classSkills: string[];
  babProgression: "full" | "3/4" | "half";
  fortSaveProgression: "good" | "poor";
  refSaveProgression: "good" | "poor";
  willSaveProgression: "good" | "poor";
  /** Parsed class progression table data (may be a JSON string in frontmatter) */
  classTable?: ClassTableData | string;
  casterTier?: "high" | "mid" | "low" | "none";
};

export type ClassFeatureEntry = {
  type: "class-feature";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  className: string;
  level: number | number[];
  isTraitContainer?: boolean;
};

export type ClassTraitEntry = {
  type: "class-trait";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  className: string;
  featureId: string;
  requires?: string;
};

export type ArticleEntry = {
  type: "article";
  id: string;
  system?: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type ArchetypeEntry = {
  type: "archetype";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  className: string;
  spheres?: string[];
};

export type ArchetypeFeatureEntry = {
  type: "archetype-feature";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  archetypeId: string;
  level: number | number[];
  replaces?: string[];
  alters?: string[];
  mutuallyExclusive?: boolean;
  classOverrides?: Record<string, string>;
  isAlternateClassFeature?: boolean;
};

export type TagEntry = {
  type: "tag";
  id: string;
  label: string;
  priority: number;
  description: string;
  sourceBook: string;
  featCategory?: boolean;
  system?: "power" | "might" | "guile" | "champions";
  sphere?: string;
  hidden?: boolean;
};

export type FeatEntry = {
  type: "feat";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  sphere?: string;
  category?: string;
  dualSphere?: string;
  summary?: string;
  tags: string[];
  modifies?: string;
};

export type AnyEntry =
  | SphereEntry
  | TalentEntry
  | FeatEntry
  | ClassEntry
  | ClassFeatureEntry
  | ClassTraitEntry
  | ArticleEntry
  | ArchetypeEntry
  | ArchetypeFeatureEntry
  | DrawbackEntry
  | BoonEntry
  | TraditionEntry;

export type EntryKey = string; // "type:id"

export type ResolvedMaps = {
  sphereMap: Map<EntryKey, SphereEntry>;
  talentMap: Map<EntryKey, TalentEntry>;
  featMap: Map<EntryKey, FeatEntry>;
  classMap: Map<EntryKey, ClassEntry>;
  classFeatureMap: Map<EntryKey, ClassFeatureEntry>;
  classTraitMap: Map<EntryKey, ClassTraitEntry>;
  articleMap: Map<EntryKey, ArticleEntry>;
  archetypeMap: Map<EntryKey, ArchetypeEntry>;
  archetypeFeatureMap: Map<EntryKey, ArchetypeFeatureEntry>;
  drawbackMap: Map<EntryKey, DrawbackEntry>;
  boonMap: Map<EntryKey, BoonEntry>;
  traditionMap: Map<EntryKey, TraditionEntry>;
  entrySourceBook: Map<EntryKey, string>;
  bookMetaMap: Map<string, BookMeta>;
  tagMap: Map<string, TagEntry>;
};
