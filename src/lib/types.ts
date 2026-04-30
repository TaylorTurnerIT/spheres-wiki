// src/lib/types.ts

export type SphereEntry = {
  type: 'sphere';
  id: string;
  namespace: string;
  name: string;
  icon: string;
  description: string;
  modifies?: string;
};

export type TalentEntry = {
  type: 'talent';
  id: string;
  sphere: string;
  namespace: string;
  tier: 'basic' | 'advanced' | 'legendary';
  name: string;
  description: string;
  modifies?: string;
};

export type ClassEntry = {
  type: 'class';
  id: string;
  namespace: string;
  name: string;
  description: string;
  modifies?: string;
};

export type ArticleEntry = {
  type: 'article';
  id: string;
  namespace: string;
  title: string;
  description: string;
  modifies?: string;
};

export type AnyEntry = SphereEntry | TalentEntry | ClassEntry | ArticleEntry;

export type BookData = {
  title: string;
  publisher: string;
  slug: string;
  publishedDate: string;
  price?: string;
  buyUrl?: string;
  coverImage?: string;
  entries: AnyEntry[];
};

/** Composite key used to uniquely identify entries across types: "type:id" */
export type EntryKey = string;

export type ResolvedMaps = {
  /** "sphere:alteration" -> SphereEntry */
  sphereMap: Map<EntryKey, SphereEntry>;
  /** "talent:alter-shape" -> TalentEntry */
  talentMap: Map<EntryKey, TalentEntry>;
  /** "class:armorist" -> ClassEntry */
  classMap: Map<EntryKey, ClassEntry>;
  /** "article:chakra-binds" -> ArticleEntry */
  articleMap: Map<EntryKey, ArticleEntry>;
  /** "type:id" -> slug of book that FIRST defined this entry */
  entrySourceBook: Map<EntryKey, string>;
};
