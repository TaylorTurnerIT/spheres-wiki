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
  | ArticleEntry;

export type EntryKey = string; // "type:id"

export type ResolvedMaps = {
  sphereMap: Map<EntryKey, SphereEntry>;
  talentMap: Map<EntryKey, TalentEntry>;
  featMap: Map<EntryKey, FeatEntry>;
  classMap: Map<EntryKey, ClassEntry>;
  articleMap: Map<EntryKey, ArticleEntry>;
  entrySourceBook: Map<EntryKey, string>;
  bookMetaMap: Map<string, BookMeta>;
  tagMap: Map<string, TagEntry>;
};
