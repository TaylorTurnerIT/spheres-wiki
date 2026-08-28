import { describe, expect, it } from "vitest";
import { buildArticlePaths } from "../../src/lib/articleRoutes";
import type { ArticleEntry, BookMeta } from "../../src/lib/types";

const bookMeta = new Map<string, BookMeta>([
  [
    "rules-book",
    {
      slug: "rules-book",
      title: "Rules Book",
      publisher: "Publisher",
      publishedDate: "2020-01-01",
    },
  ],
]);

function article(overrides: Partial<ArticleEntry> = {}): ArticleEntry {
  return {
    type: "article",
    id: "rules",
    system: "power",
    name: "Rules",
    sourceBook: "rules-book",
    tags: [],
    ...overrides,
  };
}

describe("buildArticlePaths", () => {
  it("routes system articles under their system namespace", () => {
    const collEntry = { digest: "rules-digest", data: {} };
    const paths = buildArticlePaths(
      [article()],
      new Map([["article:power:rules", collEntry]]),
      bookMeta,
    );

    expect(paths).toEqual([
      {
        params: { system: "power", article: "rules" },
        props: {
          article: article(),
          collEntry,
          book: bookMeta.get("rules-book"),
        },
        cacheKey: "rules-digest",
      },
    ]);
  });

  it("routes systemless articles at the neutral article root", () => {
    const systemless = article({
      id: "about",
      system: undefined,
      name: "About",
    });
    const collEntry = { data: {} };
    const [path] = buildArticlePaths(
      [systemless],
      new Map([["article:_:about", collEntry]]),
      bookMeta,
    );

    expect(path.params).toEqual({ article: "about" });
    expect(path.props.article).toEqual(systemless);
    expect(path.cacheKey).toBeUndefined();
  });

  it("fails instead of silently omitting an article collection entry", () => {
    expect(() => buildArticlePaths([article()], new Map(), bookMeta)).toThrow(
      "Missing collection entry for article: power/rules",
    );
  });
});
