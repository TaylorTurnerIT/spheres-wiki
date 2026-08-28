import { contentEntryKey } from "./entryIdentity";
import type { ArticleEntry, BookMeta } from "./types";

export type ArticlePath = {
  params: { article: string; system?: string };
  props: {
    article: ArticleEntry;
    collEntry: any;
    book: BookMeta | undefined;
  };
  cacheKey?: string;
};

function requireArticleEntry(
  article: ArticleEntry,
  collEntries: Map<string, any>,
): any {
  const collEntry = collEntries.get(
    contentEntryKey("article", article.system, article.id),
  );
  if (!collEntry) {
    throw new Error(
      `Missing collection entry for article: ${article.system ?? "_"}/${article.id}`,
    );
  }
  return collEntry;
}

function articleParams(article: ArticleEntry): {
  article: string;
  system?: string;
} {
  return article.system
    ? { system: article.system, article: article.id }
    : { article: article.id };
}

function articleCacheKey(collEntry: any): { cacheKey?: string } {
  return collEntry.digest ? { cacheKey: collEntry.digest } : {};
}

function buildArticlePath(
  article: ArticleEntry,
  collEntries: Map<string, any>,
  bookMetaMap: Map<string, BookMeta>,
): ArticlePath {
  const collEntry = requireArticleEntry(article, collEntries);
  return {
    params: articleParams(article),
    props: {
      article,
      collEntry,
      book: bookMetaMap.get(article.sourceBook),
    },
    ...articleCacheKey(collEntry),
  };
}

/** Build every article detail path from the resolved, collision-safe ids. */
export function buildArticlePaths(
  articles: Iterable<ArticleEntry>,
  collEntries: Map<string, any>,
  bookMetaMap: Map<string, BookMeta>,
): ArticlePath[] {
  return Array.from(articles, (article) =>
    buildArticlePath(article, collEntries, bookMetaMap),
  );
}
