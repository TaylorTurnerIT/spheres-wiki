/**
 * Unit tests for parse-wiki.mjs
 * Run: node --test scripts/parse-wiki.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRACKET_TAGS,
  cleanBody,
  convertWikidotTable,
  extractDualSphere,
  KNOWN_SPHERES,
  kebab,
  normalizeQuotes,
  PAREN_TAG_MAP,
  parseEntryBlock,
  parseHeading,
  parseSectionContext,
  parseWikiFile,
  resolveSourceBook,
  SPHERE_CONFIGS,
} from "./parse-wiki.mjs";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testConfig = {
  sphere: "test",
  primaryBook: "spheres-of-power-core",
  headingSourceMap: {
    BaP: "blood-and-portents",
    Apoc: null,
  },
  bodySourceMap: {
    "Some Book Title": "some-book-slug",
  },
};

const basicCtx = { type: "talent", tier: "basic", sectionTags: [] };
const featCtx = { type: "feat", tier: null, sectionTags: [] };
const _bodyCtx = { type: "talent", tier: "basic", sectionTags: ["body"] };
const advCtx = { type: "talent", tier: "advanced", sectionTags: [] };

// ─── normalizeQuotes ──────────────────────────────────────────────────────────

describe("normalizeQuotes", () => {
  it("converts U+2018/U+2019 curly single quotes to straight apostrophe", () => {
    assert.equal(normalizeQuotes("‘hello’"), "'hello'");
  });

  it("converts U+201C/U+201D curly double quotes to straight double quote", () => {
    assert.equal(normalizeQuotes("“hello”"), '"hello"');
  });

  it("converts backtick to straight apostrophe", () => {
    assert.equal(normalizeQuotes("it`s"), "it's");
  });

  it("converts modifier letter apostrophe (U+02BC) to straight apostrophe", () => {
    assert.equal(normalizeQuotes("itʼs"), "it's");
  });

  it("passes through strings with no special quotes", () => {
    assert.equal(normalizeQuotes("plain text 123"), "plain text 123");
  });

  it("handles mixed quote types in one string", () => {
    assert.equal(
      normalizeQuotes("‘hello’ and “world”"),
      "'hello' and \"world\"",
    );
  });
});

// ─── kebab ────────────────────────────────────────────────────────────────────

describe("kebab", () => {
  it("lowercases and hyphenates basic words", () => {
    assert.equal(kebab("Hello World"), "hello-world");
  });

  it("strips apostrophes: Puppet's Curse → puppets-curse", () => {
    assert.equal(kebab("Puppet's Curse"), "puppets-curse");
  });

  it("strips curly apostrophes", () => {
    assert.equal(kebab("Puppet’s Curse"), "puppets-curse");
  });

  it("strips em dash and apostrophe: Baron's—Gateway → baronsgateway (no hyphen, no spaces to split on)", () => {
    // em dash is adjacent to letters (no surrounding space), so stripping it yields no hyphen
    assert.equal(kebab("Baron's—Gateway"), "baronsgateway");
  });

  it("collapses multiple spaces", () => {
    assert.equal(kebab("hello   world"), "hello-world");
  });

  it("trims leading/trailing whitespace", () => {
    assert.equal(kebab("  trim me  "), "trim-me");
  });

  it("handles single word", () => {
    assert.equal(kebab("Alteration"), "alteration");
  });

  it("strips non-alphanumeric characters (brackets, parens, etc.)", () => {
    assert.equal(kebab("Foo (Bar)"), "foo-bar");
  });
});

// ─── convertWikidotTable ──────────────────────────────────────────────────────

describe("convertWikidotTable", () => {
  it("converts a header row with separator", () => {
    const lines = ["||~ Col A ||~ Col B ||"];
    const result = convertWikidotTable(lines);
    assert.equal(result[0], "| Col A | Col B |");
    assert.equal(result[1], "|---|---|");
  });

  it("inserts separator after first row when no header cell present", () => {
    const lines = ["|| val1 || val2 ||"];
    const result = convertWikidotTable(lines);
    assert.equal(result[0], "| val1 | val2 |");
    assert.equal(result[1], "|---|---|");
    assert.equal(result.length, 2);
  });

  it("strips trailing empty cell", () => {
    const lines = ["|| val1 || val2 ||"];
    const result = convertWikidotTable(lines);
    // should not have an empty trailing cell
    assert.ok(!result[0].endsWith("|  |"));
  });

  it("produces correct mixed header + data table", () => {
    const lines = ["||~ Name ||~ Cost ||", "|| Foo || 5 ||", "|| Bar || 10 ||"];
    const result = convertWikidotTable(lines);
    assert.equal(result[0], "| Name | Cost |");
    assert.equal(result[1], "|---|---|");
    assert.equal(result[2], "| Foo | 5 |");
    assert.equal(result[3], "| Bar | 10 |");
  });

  it("only inserts separator once even with multiple header rows", () => {
    const lines = ["||~ A ||~ B ||", "||~ C ||~ D ||"];
    const result = convertWikidotTable(lines);
    const separators = result.filter((l) => /^\|---/.test(l));
    assert.equal(separators.length, 1);
  });
});

// ─── cleanBody ────────────────────────────────────────────────────────────────

describe("cleanBody", () => {
  it("skips [[image ...]] lines", () => {
    const out = cleanBody("[[image foo.png]]\nsome text");
    assert.ok(!out.includes("image"));
    assert.ok(out.includes("some text"));
  });

  it("skips full-line ^^...^^ superscripts", () => {
    const out = cleanBody("^^**Source:** Some Book^^");
    assert.equal(out.trim(), "");
  });

  it("strips inline ^^ref^^ superscripts", () => {
    const out = cleanBody("Text ^^ARG^^ more");
    assert.ok(!out.includes("^^"));
    assert.ok(out.includes("Text"));
    assert.ok(out.includes("more"));
  });

  it("converts [[[page name]]] wikilinks to just the page name", () => {
    const out = cleanBody("See [[[blood sphere]]] for details.");
    assert.ok(out.includes("blood sphere"));
    assert.ok(!out.includes("[[["));
  });

  it("converts [[[display|url]]] wikilinks to just the display text", () => {
    const out = cleanBody("See [[[Blood Sphere|blood-sphere]]] here.");
    assert.ok(out.includes("Blood Sphere"));
    assert.ok(!out.includes("blood-sphere"));
    assert.ok(!out.includes("[[["));
  });

  it("converts //italic// to *italic*", () => {
    const out = cleanBody("This is //italic// text.");
    assert.ok(out.includes("*italic*"));
    assert.ok(!out.includes("//"));
  });

  it("converts * bullet to - bullet", () => {
    const out = cleanBody("* first item");
    assert.ok(out.includes("- first item"));
    assert.ok(!out.match(/^\* /m));
  });

  it("converts ---- to ---", () => {
    const out = cleanBody("----");
    assert.equal(out.trim(), "---");
  });

  it("strips [SA:EAO] inline citation", () => {
    const out = cleanBody("Some text [SA:EAO] more.");
    assert.ok(!out.includes("[SA:EAO]"));
    assert.ok(out.includes("Some text"));
  });

  it("strips [BTH] inline citation", () => {
    const out = cleanBody("Some text [BTH] more.");
    assert.ok(!out.includes("[BTH]"));
  });

  it("strips [Gravecaller's HB] with curly apostrophe", () => {
    const out = cleanBody("Some text [Gravecaller’s HB] more.");
    assert.ok(!out.includes("[Gravecaller"));
    assert.ok(out.includes("Some text"));
  });

  it("keeps **Special:** at start of line as bold", () => {
    const out = cleanBody("**Special:** When you do this...");
    assert.ok(out.includes("**Special:**"));
  });

  it("converts **Special:** mid-sentence to *Special:*", () => {
    const out = cleanBody(
      "You gain a swim speed. **Special:** When you do this...",
    );
    assert.ok(out.includes("*Special:*"));
    assert.ok(!out.includes("**Special:**"));
  });

  it("inserts blank line before bullet list when preceded by paragraph", () => {
    const out = cleanBody("Some paragraph.\n* first item\n* second item");
    const lines = out.split("\n");
    const bulletIdx = lines.findIndex((l) => l.startsWith("- first"));
    assert.ok(bulletIdx > 0);
    assert.equal(lines[bulletIdx - 1].trim(), "");
  });

  it("inserts blank line before table", () => {
    const out = cleanBody("Some text.\n||~ A ||~ B ||\n|| 1 || 2 ||");
    const lines = out.split("\n");
    const tableIdx = lines.findIndex((l) => l.startsWith("| A"));
    assert.ok(tableIdx > 0);
    assert.equal(lines[tableIdx - 1].trim(), "");
  });

  it("converts table inline with surrounding text", () => {
    const out = cleanBody("Intro.\n||~ Col ||~ Val ||\n|| x || 1 ||\nOutro.");
    assert.ok(out.includes("| Col | Val |"));
    assert.ok(out.includes("|---|---|"));
    assert.ok(out.includes("| x | 1 |"));
    assert.ok(out.includes("Intro."));
    assert.ok(out.includes("Outro."));
  });

  it("trims leading and trailing blank lines", () => {
    const out = cleanBody("\n\nHello\n\n");
    assert.ok(!out.startsWith("\n"));
    assert.ok(!out.endsWith("\n"));
    assert.equal(out, "Hello");
  });

  it("strips [Errata'd in ...] with curly apostrophe", () => {
    const out = cleanBody("Some text [Errata’d in some book] more.");
    assert.ok(!out.includes("[Errata"));
    assert.ok(out.includes("Some text"));
  });
});

// ─── parseSectionContext ──────────────────────────────────────────────────────

describe("parseSectionContext", () => {
  it('"Blood Sphere Feats" → feat context', () => {
    const ctx = parseSectionContext("Blood Sphere Feats");
    assert.deepEqual(ctx, { type: "feat", tier: null, sectionTags: [] });
  });

  it('"Advanced Blood Talents" → advanced talent', () => {
    const ctx = parseSectionContext("Advanced Blood Talents");
    assert.deepEqual(ctx, {
      type: "talent",
      tier: "advanced",
      sectionTags: [],
    });
  });

  it('"Body Talents" → basic talent with body sectionTag', () => {
    const ctx = parseSectionContext("Body Talents");
    assert.deepEqual(ctx, {
      type: "talent",
      tier: "basic",
      sectionTags: ["body"],
    });
  });

  it('"Transformation Talents" → basic talent with transformation sectionTag', () => {
    const ctx = parseSectionContext("Transformation Talents");
    assert.deepEqual(ctx, {
      type: "talent",
      tier: "basic",
      sectionTags: ["transformation"],
    });
  });

  it('"Blood Sphere Talents" → basic talent, no sectionTags', () => {
    const ctx = parseSectionContext("Blood Sphere Talents");
    assert.deepEqual(ctx, { type: "talent", tier: "basic", sectionTags: [] });
  });

  it('"Drawbacks" → basic tier (drawback is not a valid schema tier)', () => {
    const ctx = parseSectionContext("Drawbacks");
    assert.deepEqual(ctx, { type: "talent", tier: "basic", sectionTags: [] });
  });

  it('"Blood Control" (no match) → null', () => {
    const ctx = parseSectionContext("Blood Control");
    assert.equal(ctx, null);
  });

  it('"Blood Talent Types" has "talent" → basic context', () => {
    const ctx = parseSectionContext("Blood Talent Types");
    assert.equal(ctx.type, "talent");
    assert.equal(ctx.tier, "basic");
  });

  it("feat takes priority over talent when both in text", () => {
    // "Talent Feats" — feat should win since it's checked first
    const ctx = parseSectionContext("Talent Feats");
    assert.equal(ctx.type, "feat");
  });

  it('"Companion Features" → null (features ≠ feats)', () => {
    const ctx = parseSectionContext("Companion Features");
    assert.equal(ctx, null);
  });

  it('"Conjuration Talent Types" has "talent" → basic context', () => {
    const ctx = parseSectionContext("Conjuration Talent Types");
    assert.equal(ctx?.type, "talent");
    assert.equal(ctx?.tier, "basic");
  });
});

// ─── parseHeading ─────────────────────────────────────────────────────────────

describe("parseHeading", () => {
  it("parses simple name with no tags", () => {
    const result = parseHeading("++++ Simple Name", basicCtx, testConfig);
    assert.equal(result.name, "Simple Name");
    assert.deepEqual(result.tags, []);
    assert.equal(result.sourceKey, null);
    assert.equal(result.type, "talent");
    assert.equal(result.tier, "basic");
  });

  it("parses name with bracket source key", () => {
    const result = parseHeading("++++ Name [BaP]", basicCtx, testConfig);
    assert.equal(result.name, "Name");
    assert.equal(result.sourceKey, "BaP");
  });

  it("parses name with BRACKET_TAG and source key", () => {
    const result = parseHeading(
      "++++ Name [instill] [BaP]",
      basicCtx,
      testConfig,
    );
    assert.ok(result.tags.includes("instill"));
    assert.equal(result.sourceKey, "BaP");
    assert.equal(result.name, "Name");
  });

  it("parses multiple bracket ability-type tags", () => {
    const result = parseHeading(
      "++++ Name [mass] [range]",
      basicCtx,
      testConfig,
    );
    assert.ok(result.tags.includes("mass"));
    assert.ok(result.tags.includes("range"));
    assert.equal(result.sourceKey, null);
  });

  it("[Dual Sphere] → type: feat, source correct", () => {
    const result = parseHeading(
      "++++ Name [Dual Sphere] [BaP]",
      basicCtx,
      testConfig,
    );
    // dual-sphere tag no longer pushed to tags — auto-derived from dualSphere field
    assert.equal(result.type, "feat");
    assert.equal(result.sourceKey, "BaP");
  });

  it("(Combat) paren → tags: combat, type: feat", () => {
    const result = parseHeading("++++ Name (Combat)", basicCtx, testConfig);
    assert.ok(result.tags.includes("combat"));
    assert.equal(result.type, "feat");
  });

  it("(quicken) paren → tags: quicken", () => {
    const result = parseHeading("++++ Name (quicken)", basicCtx, testConfig);
    assert.ok(result.tags.includes("quicken"));
  });

  it("(quicken, still) paren → tags: quicken and still", () => {
    const result = parseHeading(
      "++++ Name (quicken, still)",
      basicCtx,
      testConfig,
    );
    assert.ok(result.tags.includes("quicken"));
    assert.ok(result.tags.includes("still"));
  });

  it("(blood art, still) [BaP] → tags: blood-art, still; sourceKey: BaP", () => {
    const result = parseHeading(
      "++++ Name (blood art, still) [BaP]",
      basicCtx,
      testConfig,
    );
    assert.ok(result.tags.includes("blood-art"));
    assert.ok(result.tags.includes("still"));
    assert.equal(result.sourceKey, "BaP");
  });

  it("normalizes curly apostrophe in name: Puppet’s Curse → Puppet's Curse", () => {
    const result = parseHeading(
      "++++ Puppet’s Curse [BaP]",
      basicCtx,
      testConfig,
    );
    assert.equal(result.name, "Puppet's Curse");
  });

  it("strips paren content from name", () => {
    const result = parseHeading("++++ Name (Combat)", basicCtx, testConfig);
    assert.equal(result.name, "Name");
  });

  it("strips bracket content from name", () => {
    const result = parseHeading("++++ Name [BaP]", basicCtx, testConfig);
    assert.equal(result.name, "Name");
  });

  it("propagates sectionTags from context", () => {
    const ctx = { type: "talent", tier: "basic", sectionTags: ["body"] };
    const result = parseHeading("++++ Name", ctx, testConfig);
    assert.ok(result.tags.includes("body"));
  });

  it("treats unknown bracket as sourceKey", () => {
    const result = parseHeading("++++ Name [UnknownKey]", basicCtx, testConfig);
    assert.equal(result.sourceKey, "UnknownKey");
  });

  it("uses type and tier from sectionCtx when no overrides", () => {
    const result = parseHeading("++++ Name", advCtx, testConfig);
    assert.equal(result.type, "talent");
    assert.equal(result.tier, "advanced");
  });
});

// ─── resolveSourceBook ────────────────────────────────────────────────────────

describe("resolveSourceBook", () => {
  const config = {
    primaryBook: "spheres-of-power-core",
    headingSourceMap: {
      BaP: "blood-and-portents",
      Apoc: null,
      Unknown: "unknown-source",
    },
    bodySourceMap: {
      "Some Book Title": "some-book-slug",
    },
  };

  it("null sourceKey → returns primaryBook", () => {
    assert.equal(
      resolveSourceBook(null, null, config),
      "spheres-of-power-core",
    );
  });

  it("known sourceKey → returns mapped slug", () => {
    assert.equal(resolveSourceBook("BaP", null, config), "blood-and-portents");
  });

  it('"Unknown" sourceKey → returns "unknown-source"', () => {
    assert.equal(resolveSourceBook("Unknown", null, config), "unknown-source");
  });

  it("null-mapped Apoc + matching bodySource → body-mapped slug", () => {
    assert.equal(
      resolveSourceBook("Apoc", "Some Book Title excerpt", config),
      "some-book-slug",
    );
  });

  it("null-mapped Apoc + no bodySource → unknown-source", () => {
    assert.equal(resolveSourceBook("Apoc", null, config), "unknown-source");
  });

  it("null-mapped Apoc + non-matching bodySource → unknown-source", () => {
    assert.equal(
      resolveSourceBook("Apoc", "Completely Different Book", config),
      "unknown-source",
    );
  });

  it("curly apostrophe in bodySource matches straight apostrophe key in bodySourceMap", () => {
    const cfg = {
      primaryBook: "spheres-of-power-core",
      headingSourceMap: { Apoc: null },
      bodySourceMap: { "Baron's Arena": "barons-arena" },
    };
    // bodySource has curly apostrophe, key has straight — should still match
    assert.equal(
      resolveSourceBook("Apoc", "Baron’s Arena", cfg),
      "barons-arena",
    );
  });
});

// ─── extractDualSphere ────────────────────────────────────────────────────────

describe("extractDualSphere", () => {
  it("extracts the non-primary sphere from Prerequisites line", () => {
    const body = "**Prerequisites:** Alteration sphere, Death sphere.";
    assert.equal(extractDualSphere(body, "alteration"), "death");
  });

  it("handles Blood sphere + Mana sphere", () => {
    const body = "**Prerequisites:** Blood sphere, Mana sphere.";
    assert.equal(extractDualSphere(body, "blood"), "mana");
  });

  it("does not return the primary sphere itself", () => {
    const body = "**Prerequisites:** Alteration sphere, Alteration sphere.";
    assert.equal(extractDualSphere(body, "alteration"), null);
  });

  it("does not return a sphere not in KNOWN_SPHERES", () => {
    const body = "**Prerequisites:** Alteration sphere, Foobar sphere.";
    assert.equal(extractDualSphere(body, "alteration"), null);
  });

  it("returns null when no prerequisites line", () => {
    const body = "**Benefit:** Does something cool.";
    assert.equal(extractDualSphere(body, "alteration"), null);
  });

  it('returns null when prerequisites have no "X sphere" pattern', () => {
    const body = "**Prerequisites:** 5 ranks in Knowledge (arcana).";
    assert.equal(extractDualSphere(body, "alteration"), null);
  });
});

// ─── parseWikiFile (integration) ──────────────────────────────────────────────

describe("parseWikiFile", () => {
  const config = {
    sphere: "test",
    primaryBook: "spheres-of-power-core",
    headingSourceMap: { BaP: "blood-and-portents" },
    bodySourceMap: {},
  };

  const minimalWiki = `
++ Test Talents
[[div style="..."]]
++++ First Talent
Body text for first talent.
[[/div]]
[[div style="..."]]
++++ Second Talent [BaP]
Body text for second.
[[/div]]
+ Test Feats
[[div style="..."]]
++++ Test Feat (Dual Sphere)
**Prerequisites:** Test sphere, Death sphere.
**Benefit:** Does something.
[[/div]]
`.trim();

  it("returns 3 entries for the minimal wiki", () => {
    const entries = parseWikiFile(minimalWiki, config);
    assert.equal(entries.length, 3);
  });

  it("first entry: talent, basic tier, primary book", () => {
    const entries = parseWikiFile(minimalWiki, config);
    const first = entries[0];
    assert.equal(first.type, "talent");
    assert.equal(first.tier, "basic");
    assert.equal(first.bookSlug, "spheres-of-power-core");
  });

  it("second entry: talent, blood-and-portents book", () => {
    const entries = parseWikiFile(minimalWiki, config);
    const second = entries[1];
    assert.equal(second.type, "talent");
    assert.equal(second.bookSlug, "blood-and-portents");
  });

  it("third entry: feat, dualSphere=death", () => {
    const entries = parseWikiFile(minimalWiki, config);
    const third = entries[2];
    assert.equal(third.type, "feat");
    // dual-sphere tag no longer in tags — auto-derived from dualSphere field
    assert.equal(third.dualSphere, "death");
  });

  it("duplicate detection: same heading twice → only first included", () => {
    const dupeWiki = `
++ Test Talents
[[div style="..."]]
++++ Repeated Talent
First occurrence.
[[/div]]
[[div style="..."]]
++++ Repeated Talent
Second occurrence.
[[/div]]
`.trim();
    const entries = parseWikiFile(dupeWiki, config);
    assert.equal(entries.filter((e) => e.name === "Repeated Talent").length, 1);
    assert.equal(entries[0].body, "First occurrence.");
  });

  it('stub skipping: "See General Feats." → not included', () => {
    const stubWiki = `
+ Test Feats
[[div style="..."]]
++++ Stub Feat
See General Feats.
[[/div]]
`.trim();
    const entries = parseWikiFile(stubWiki, config);
    assert.equal(entries.length, 0);
  });

  it('stub skipping: "See [[[page]]]" cross-reference → not included', () => {
    const stubWiki = `
+ Test Feats
[[div style="..."]]
++++ Stub Feat Two
See [[[general-feats|General Feats]]].
[[/div]]
`.trim();
    const entries = parseWikiFile(stubWiki, config);
    assert.equal(entries.length, 0);
  });

  it("section context changes propagate to subsequent entries", () => {
    const wiki = `
++ Test Talents
[[div style="..."]]
++++ Talent One
Some text.
[[/div]]
+++ Advanced Test Talents
[[div style="..."]]
++++ Advanced One
Some advanced text.
[[/div]]
`.trim();
    const entries = parseWikiFile(wiki, config);
    assert.equal(entries[0].tier, "basic");
    assert.equal(entries[1].tier, "advanced");
  });

  it("H2 with no section context → tier:base entry", () => {
    const wiki = `
++ My Base Ability
This is the base description.
++ Test Talents
`.trim();
    const entries = parseWikiFile(wiki, config);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, "My Base Ability");
    assert.equal(entries[0].tier, "base");
    assert.equal(entries[0].type, "talent");
    assert.equal(entries[0].bookSlug, "spheres-of-power-core");
  });

  it("divs inside base section are embedded as sub-sections, not emitted separately", () => {
    const wiki = `
++ My Base Ability
Base prose.
[[div style="..."]]
++++ Built-in Sub
Sub body.
[[/div]]
++ Test Talents
[[div style="..."]]
++++ Regular Talent
Regular body.
[[/div]]
`.trim();
    const entries = parseWikiFile(wiki, config);
    // base entry + regular talent — NOT base + sub + regular
    assert.equal(entries.length, 2);
    assert.equal(entries[0].tier, "base");
    assert.ok(entries[0].body.includes("#### Built-in Sub"));
    assert.ok(entries[0].body.includes("Sub body."));
    assert.equal(entries[1].tier, "basic");
    assert.equal(entries[1].name, "Regular Talent");
  });

  it("base ability ends and talent context restores at section-context H3", () => {
    const wiki = `
++ My Base Ability
Base prose.
[[div style="..."]]
++++ Sub Entry
Sub body.
[[/div]]
+++ Sphere Talents
[[div style="..."]]
++++ Normal Talent
Normal body.
[[/div]]
`.trim();
    const entries = parseWikiFile(wiki, config);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].tier, "base");
    assert.equal(entries[1].tier, "basic");
  });

  it("base entry body contains prose and sub-sections separated by ---", () => {
    const wiki = `
++ Control
Prose text.
[[div style="..."]]
++++ Sub One
Sub one body.
[[/div]]
[[div style="..."]]
++++ Sub Two
Sub two body.
[[/div]]
++ Test Talents
`.trim();
    const entries = parseWikiFile(wiki, config);
    assert.equal(entries.length, 1);
    const body = entries[0].body;
    assert.ok(body.includes("Prose text."));
    assert.ok(body.includes("#### Sub One"));
    assert.ok(body.includes("#### Sub Two"));
    // sub-sections separated by ---
    assert.ok(body.includes("---"));
  });

  it("consecutive null-context H2 extends base ability instead of creating new entry", () => {
    const wiki = `
++ Summon
Base prose.
++ Rules Section
Rules prose.
[[div style="..."]]
++++ Sub Entry
Sub body.
[[/div]]
+++ Sphere Talents
[[div style="..."]]
++++ Normal Talent
Normal body.
[[/div]]
`.trim();
    const entries = parseWikiFile(wiki, config);
    // Only 2 entries: one base ability (Summon, extended) + one talent
    assert.equal(entries.length, 2);
    assert.equal(entries[0].name, "Summon");
    assert.equal(entries[0].tier, "base");
    assert.ok(entries[0].body.includes("Base prose."));
    assert.ok(entries[0].body.includes("### Rules Section"));
    assert.ok(entries[0].body.includes("Rules prose."));
    assert.ok(entries[0].body.includes("Sub body."));
    assert.equal(entries[1].tier, "basic");
  });

  it("non-heading div inside base ability is included in body prose", () => {
    const wiki = `
++ Summon
Intro prose.
[[div style="..."]]
**Avian**
A bird form.
[[/div]]
+++ Sphere Talents
[[div style="..."]]
++++ A Talent
Talent body.
[[/div]]
`.trim();
    const entries = parseWikiFile(wiki, config);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].tier, "base");
    assert.ok(entries[0].body.includes("Avian"));
    assert.ok(entries[0].body.includes("A bird form."));
    assert.equal(entries[1].name, "A Talent");
  });
});

// ─── parseEntryBlock ──────────────────────────────────────────────────────────

describe("parseEntryBlock", () => {
  it("returns null when no ++++ heading found", () => {
    const result = parseEntryBlock(
      "Just some text\nno heading",
      basicCtx,
      testConfig,
    );
    assert.equal(result, null);
  });

  it("parses name, body, bookSlug from minimal block", () => {
    const block = "++++ My Talent\nThis is the body.";
    const result = parseEntryBlock(block, basicCtx, testConfig);
    assert.equal(result.name, "My Talent");
    assert.equal(result.body, "This is the body.");
    assert.equal(result.bookSlug, "spheres-of-power-core");
  });

  it("extracts ^^Source: Book^^ and removes from body", () => {
    const block =
      "++++ Apoc Talent [Apoc]\n^^Source: Some Book Title^^\nThe actual body.";
    const result = parseEntryBlock(block, basicCtx, testConfig);
    assert.ok(!result.body.includes("^^"));
    assert.equal(result.bookSlug, "some-book-slug");
  });

  it("returns null for cross-reference stub", () => {
    const block = "++++ Stub\nSee General Feats.";
    const result = parseEntryBlock(block, basicCtx, testConfig);
    assert.equal(result, null);
  });

  it("sets dualSphere for dual-sphere feat", () => {
    const config = { ...testConfig, sphere: "alteration" };
    const block =
      "++++ Dual Feat [Dual Sphere]\n**Prerequisites:** Alteration sphere, Death sphere.\n**Benefit:** Something.";
    const result = parseEntryBlock(block, featCtx, config);
    assert.equal(result.dualSphere, "death");
  });
});

// ─── Exported constants ───────────────────────────────────────────────────────

describe("exported constants", () => {
  it("SPHERE_CONFIGS includes blood and alteration", () => {
    assert.ok("blood" in SPHERE_CONFIGS);
    assert.ok("alteration" in SPHERE_CONFIGS);
  });

  it("BRACKET_TAGS is a Set containing expected tags", () => {
    assert.ok(BRACKET_TAGS instanceof Set);
    assert.ok(BRACKET_TAGS.has("instill"));
    assert.ok(BRACKET_TAGS.has("mass"));
    assert.ok(BRACKET_TAGS.has("strike"));
  });

  it("PAREN_TAG_MAP includes blood-art mapping", () => {
    assert.equal(PAREN_TAG_MAP["blood art"], "blood-art");
    assert.equal(PAREN_TAG_MAP.quicken, "quicken");
  });

  it("KNOWN_SPHERES is a Set containing standard spheres", () => {
    assert.ok(KNOWN_SPHERES instanceof Set);
    assert.ok(KNOWN_SPHERES.has("blood"));
    assert.ok(KNOWN_SPHERES.has("death"));
    assert.ok(KNOWN_SPHERES.has("alteration"));
    assert.ok(KNOWN_SPHERES.has("life"));
  });

  it("KNOWN_SPHERES contains fallen-fey for dual-sphere detection", () => {
    assert.ok(KNOWN_SPHERES.has("fallen-fey"));
  });
});
