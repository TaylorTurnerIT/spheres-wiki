// src/lib/types.ts

export type BookMeta = {
  slug: string;
  title: string;
  publisher: string;
  publishedDate: string;
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
  system: string;
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
};

export type TagEntry = {
  type: "tag";
  id: string;
  label: string;
  color?: string;
  priority: number;
  description: string;
  sourceBook: string;
};

export type FeatEntry = {
  type: "feat";
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  sphere: string;
  dualSphere?: string;
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
  | ArchetypeFeatureEntry;

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
  entrySourceBook: Map<EntryKey, string>;
  bookMetaMap: Map<string, BookMeta>;
  tagMap: Map<string, TagEntry>;
};
