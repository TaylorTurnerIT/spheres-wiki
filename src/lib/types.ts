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

export type SphereEntry = {
  type: 'sphere';
  id: string;
  system: string;
  name: string;
  icon: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type TalentEntry = {
  type: 'talent';
  id: string;
  sphere: string;
  system: string;
  tier: 'base' | 'basic' | 'advanced';
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type ClassEntry = {
  type: 'class';
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type ArticleEntry = {
  type: 'article';
  id: string;
  system: string;
  name: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
};

export type AnyEntry = SphereEntry | TalentEntry | ClassEntry | ArticleEntry;

export type EntryKey = string; // "type:id"

export type ResolvedMaps = {
  sphereMap: Map<EntryKey, SphereEntry>;
  talentMap: Map<EntryKey, TalentEntry>;
  classMap: Map<EntryKey, ClassEntry>;
  articleMap: Map<EntryKey, ArticleEntry>;
  entrySourceBook: Map<EntryKey, string>;
  bookMetaMap: Map<string, BookMeta>;
};
