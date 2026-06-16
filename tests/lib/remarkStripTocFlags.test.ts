import { describe, expect, it } from "vitest";
import { EXCLUDE_SENTINEL } from "../../src/lib/articleToc";
import remarkStripTocFlags from "../../src/lib/remarkStripTocFlags";

function headingTree(text: string) {
  return {
    type: "root",
    children: [
      { type: "heading", depth: 2, children: [{ type: "text", value: text }] },
    ],
  };
}

function headingText(tree: ReturnType<typeof headingTree>): string {
  return (tree.children[0] as any).children[0].value;
}

describe("remarkStripTocFlags", () => {
  it("replaces {.toc-exclude} with the zero-width sentinel instead of deleting it", () => {
    const tree = headingTree("{.toc-exclude} Hidden Section");
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe(`${EXCLUDE_SENTINEL}Hidden Section`);
  });

  it("leaves headings with no flag untouched", () => {
    const tree = headingTree("Plain Heading");
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe("Plain Heading");
  });

  it("no longer special-cases {.toc-include} (flag removed from the codebase)", () => {
    const tree = headingTree("{.toc-include} Some Heading");
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe("{.toc-include} Some Heading");
  });
});
