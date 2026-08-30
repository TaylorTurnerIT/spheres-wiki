import { describe, expect, it } from "vitest";
import { mdLinksToHtml } from "@/lib/mdLinks";

describe("mdLinksToHtml", () => {
  it("converts markdown links to anchors", () => {
    expect(
      mdLinksToHtml("See [Mighty Bow](https://example.com/a) for details."),
    ).toBe(
      'See <a href="https://example.com/a" target="_blank" rel="noopener noreferrer">Mighty Bow</a> for details.',
    );
  });

  it("converts multiple links", () => {
    expect(mdLinksToHtml("[a](http://x) and [b](http://y)")).toBe(
      '<a href="http://x" target="_blank" rel="noopener noreferrer">a</a> and <a href="http://y" target="_blank" rel="noopener noreferrer">b</a>',
    );
  });

  it("strips links when stripLinks is set", () => {
    expect(
      mdLinksToHtml("See [Mighty Bow](https://example.com/a).", {
        stripLinks: true,
      }),
    ).toBe("See Mighty Bow.");
  });

  it("leaves plain text untouched", () => {
    expect(mdLinksToHtml("no links here")).toBe("no links here");
  });
});
