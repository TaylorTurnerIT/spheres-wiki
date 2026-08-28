import { describe, expect, it } from "vitest";
import {
  renderMarkdownFragment,
  splitBodyOnMarkers,
  stripBodySource,
} from "../../src/lib/renderBody";

describe("splitBodyOnMarkers", () => {
  it("returns empty array for undefined body", () => {
    expect(splitBodyOnMarkers(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(splitBodyOnMarkers("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(splitBodyOnMarkers("   \n  \t  ")).toEqual([]);
  });

  it("returns single markdown segment when no markers present", () => {
    const result = splitBodyOnMarkers("This is plain text.\nNo markers here.");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "markdown",
      text: "This is plain text.\nNo markers here.",
    });
  });

  it("splits on a single marker", () => {
    const body = "Some text before.\n\n[Shapeshift]\n\nSome text after.";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "markdown", text: "Some text before." });
    expect(result[1]).toEqual({ type: "base-ability", id: "shapeshift" });
    expect(result[2]).toEqual({ type: "markdown", text: "Some text after." });
  });

  it("handles case-insensitive markers", () => {
    const body = "[SHAPESHIFT]\nBody text.";
    const result = splitBodyOnMarkers(body);
    // No leading text → marker is result[0]
    expect(result[0]).toEqual({ type: "base-ability", id: "shapeshift" });
  });

  it("handles mixed-case markers", () => {
    const body = "[BeStIaL tRaIt]\nBody text.";
    const result = splitBodyOnMarkers(body);
    expect(result[0]).toEqual({ type: "base-ability", id: "bestial-trait" });
  });

  it("converts multi-word marker names to kebab-case", () => {
    const body = "[Bestial Trait]\nBody text.";
    const result = splitBodyOnMarkers(body);
    expect(result[0]).toEqual({ type: "base-ability", id: "bestial-trait" });
  });

  it("handles markers with trailing whitespace on the line", () => {
    const body = "[Shapeshift]   \nBody text.";
    const result = splitBodyOnMarkers(body);
    expect(result[0]).toEqual({ type: "base-ability", id: "shapeshift" });
  });

  it("handles multiple markers", () => {
    const body = `
Before first.

[Shapeshift]

Middle content.

[Bestial Trait]

After second.`;
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: "markdown", text: "Before first." });
    expect(result[1]).toEqual({ type: "base-ability", id: "shapeshift" });
    expect(result[2]).toEqual({ type: "markdown", text: "Middle content." });
    expect(result[3]).toEqual({ type: "base-ability", id: "bestial-trait" });
    expect(result[4]).toEqual({ type: "markdown", text: "After second." });
  });

  it("handles marker at start of body (no leading text)", () => {
    const body = "[Shapeshift]\nAfter marker only.";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "base-ability", id: "shapeshift" });
    expect(result[1]).toEqual({ type: "markdown", text: "After marker only." });
  });

  it("handles marker at end of body (no trailing text)", () => {
    const body = "Before marker only.\n[Shapeshift]";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: "markdown",
      text: "Before marker only.",
    });
    expect(result[1]).toEqual({ type: "base-ability", id: "shapeshift" });
  });

  it("does not match inline brackets that are not on their own line", () => {
    const body =
      "This has [inline] brackets that should not match.\nAnd more text.";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("markdown");
  });

  it("does not match brackets without alpha start character", () => {
    const body = "[123numeric]\nShould not match as marker.";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("markdown");
  });

  it("trims whitespace-only segments away", () => {
    const body = "\n\n  \n[Shapeshift]\n  \n\n";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "base-ability", id: "shapeshift" });
  });

  it("preserves markdown formatting in text segments", () => {
    const body =
      "**Bold** and *italic* text.\n\n[Shapeshift]\n\nMore **markdown** here.";
    const result = splitBodyOnMarkers(body);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: "markdown",
      text: "**Bold** and *italic* text.",
    });
    expect(result[2]).toEqual({
      type: "markdown",
      text: "More **markdown** here.",
    });
  });

  it("handles markers with hyphens in name", () => {
    const body = "[Coalesced-Manifestation]\nBody after.";
    const result = splitBodyOnMarkers(body);
    expect(result[0]).toEqual({
      type: "base-ability",
      id: "coalesced-manifestation",
    });
  });

  it("normalizes apostrophes in marker names to slug separators", () => {
    const result = splitBodyOnMarkers("[Physician's Efficacy]\nBody after.");
    expect(result[0]).toEqual({
      type: "base-ability",
      id: "physician-s-efficacy",
    });
  });

  it("handles markers with digits in name", () => {
    const body = "[Ability 2]\nBody after.";
    const result = splitBodyOnMarkers(body);
    expect(result[0]).toEqual({ type: "base-ability", id: "ability-2" });
  });

  it("handles a legacy marker immediately before an H2", () => {
    const body = "Intro.\n\n[Counter Punch]## Unarmed Combatants\n\nRules.";
    const result = splitBodyOnMarkers(body);
    expect(result).toEqual([
      { type: "markdown", text: "Intro." },
      { type: "base-ability", id: "counter-punch" },
      { type: "markdown", text: "## Unarmed Combatants\n\nRules." },
    ]);
  });
});

describe("renderMarkdownFragment", () => {
  it("converts basic markdown to HTML", async () => {
    const result = await renderMarkdownFragment("**bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("handles GFM tables", async () => {
    const md = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
    const result = await renderMarkdownFragment(md);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>Header 1</th>");
    expect(result).toContain("<td>Cell 1</td>");
  });

  it("handles empty string", async () => {
    const result = await renderMarkdownFragment("");
    // Remark returns empty string for empty input
    expect(result === "").toBe(true);
  });

  it("converts headings", async () => {
    const result = await renderMarkdownFragment("## Section Title\nContent.");
    expect(result).toContain("<h2");
    expect(result).toContain("Section Title");
  });

  it("converts inline code", async () => {
    const result = await renderMarkdownFragment("Use `const x = 1` here.");
    expect(result).toContain("<code>const x = 1</code>");
  });
});

describe("stripBodySource", () => {
  it("strips a trailing *Source: Book* line", () => {
    expect(stripBodySource("Body text.\n*Source: Spheres of Might*")).toBe(
      "Body text.",
    );
  });

  it("leaves bodies without a source line unchanged", () => {
    expect(stripBodySource("Body text.\nMore text.")).toBe(
      "Body text.\nMore text.",
    );
  });

  it("trims trailing whitespace after stripping", () => {
    expect(stripBodySource("Body text.\n\n*Source: Book*")).toBe("Body text.");
  });
});
