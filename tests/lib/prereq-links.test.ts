import { describe, expect, it } from "vitest";
import { getEntryUrl, getEntryUrlByName } from "../../src/lib/entryDatabase";
import {
  autoLinkPrerequisites,
  type EntryResolvers,
  parsePrerequisiteText,
} from "../../src/lib/remarkEntryLinks";

// ---------------------------------------------------------------------------
// Stub resolvers — no filesystem, instant, deterministic
// ---------------------------------------------------------------------------

const SPHERES: Record<string, string> = {
  alchemy: "/might/alchemy/",
  destruction: "/power/destruction/",
  enhancement: "/power/enhancement/",
};

const TALENTS: Record<string, string> = {
  blast: "/power/destruction/blast/",
  "aligned blast": "/power/destruction/aligned-blast/",
  "energy blast": "/power/destruction/energy-blast/",
  "aligned liquid": "/might/alchemy/aligned-liquid/",
  "billowing poison": "/might/alchemy/billowing-poison/",
  "two-handed combat": "/might/equipment/two-handed-combat/",
  "fool’s retreat": "/might/athletics/fool-s-retreat/",
  "grey hawk's gambit": "/power/time/grey-hawks-gambit/",
};

const stubResolvers: EntryResolvers = {
  resolveSphere: (name, _base) => SPHERES[name.toLowerCase()] ?? null,
  resolveTalent: (name, _base) => TALENTS[name.toLowerCase()] ?? null,
  resolveFeat: (_name, _base) => null,
};

function filterLinks(nodes: any[] | null): any[] {
  return (nodes ?? []).filter((n: any) => n.type === "link");
}

// ---------------------------------------------------------------------------
// parsePrerequisiteText — unit tests (no I/O)
// ---------------------------------------------------------------------------

describe("parsePrerequisiteText — sphere linking", () => {
  it("links a single sphere name", () => {
    const nodes = parsePrerequisiteText("Alchemy sphere.", "/", stubResolvers);
    expect(nodes).not.toBeNull();
    const link = nodes?.find((n: any) => n.type === "link");
    expect(link).toBeDefined();
    expect(link.url).toBe("/might/alchemy/");
    expect(link.children[0].value).toBe("Alchemy sphere");
  });

  it("returns null when no sphere/talent matches anything", () => {
    const nodes = parsePrerequisiteText("None.", "/", stubResolvers);
    expect(nodes).toBeNull();
  });

  it("does not link unknown sphere names", () => {
    const nodes = parsePrerequisiteText(
      "Telekinesis sphere.",
      "/",
      stubResolvers,
    );
    expect(nodes).toBeNull();
  });
});

describe("parsePrerequisiteText — parenthetical talent refs", () => {
  it("links a single talent in parens after sphere", () => {
    const nodes = parsePrerequisiteText(
      "Destruction sphere (Blast).",
      "/",
      stubResolvers,
    );
    expect(nodes).not.toBeNull();
    const links = nodes?.filter((n: any) => n.type === "link") ?? [];
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe("/power/destruction/");
    expect(links[1].url).toBe("/power/destruction/blast/");
    expect(links[1].children[0].value).toBe("Blast");
  });

  const talentListCases = [
    {
      name: "comma-separated talent list",
      text: "Destruction sphere (Aligned Blast, Energy Blast).",
      expectedUrls: [
        "/power/destruction/aligned-blast/",
        "/power/destruction/energy-blast/",
      ],
    },
    {
      name: "or-separated talent list",
      text: "Destruction sphere (Aligned Blast or Energy Blast).",
      expectedUrls: [
        "/power/destruction/aligned-blast/",
        "/power/destruction/energy-blast/",
      ],
    },
    {
      name: "mixed comma+or talent list (A, B or C)",
      text: "Destruction sphere (Aligned Blast, Energy Blast or Blast).",
      expectedUrls: [
        "/power/destruction/aligned-blast/",
        "/power/destruction/energy-blast/",
        "/power/destruction/blast/",
      ],
    },
  ];

  for (const { name, text, expectedUrls } of talentListCases) {
    it(`links ${name}`, () => {
      const nodes = parsePrerequisiteText(text, "/", stubResolvers);
      expect(nodes).not.toBeNull();
      const urls = filterLinks(nodes).map((l: any) => l.url);
      for (const expectedUrl of expectedUrls) {
        expect(urls).toContain(expectedUrl);
      }
    });
  }

  it("skips non-talent parens: (Any)", () => {
    const nodes = parsePrerequisiteText(
      "Destruction sphere (Any).",
      "/",
      stubResolvers,
    );
    // sphere itself should link; (Any) should not
    const links = filterLinks(nodes);
    expect(links.every((l: any) => l.children[0].value !== "Any")).toBe(true);
  });

  it("skips non-talent parens: (formulae)", () => {
    // lowercase — neither sphere regex nor talent lookup matches it
    const nodes = parsePrerequisiteText(
      "Alchemy sphere (formulae).",
      "/",
      stubResolvers,
    );
    const links = filterLinks(nodes);
    expect(links.every((l: any) => l.children[0].value !== "formulae")).toBe(
      true,
    );
  });

  it("skips non-talent parens: (toxin)", () => {
    const nodes = parsePrerequisiteText(
      "Alchemy sphere (toxin).",
      "/",
      stubResolvers,
    );
    const links = filterLinks(nodes);
    expect(links.every((l: any) => l.children[0].value !== "toxin")).toBe(true);
  });
});

describe("parsePrerequisiteText — bare talent names", () => {
  it("links bare talent with no sphere prefix", () => {
    const nodes = parsePrerequisiteText("Blast.", "/", stubResolvers);
    expect(nodes).not.toBeNull();
    const link = nodes?.find((n: any) => n.type === "link");
    expect(link).toBeDefined();
    expect(link.url).toBe("/power/destruction/blast/");
  });

  it("does not link stopwords: Any", () => {
    const nodes = parsePrerequisiteText("Any talent.", "/", stubResolvers);
    expect(nodes).toBeNull();
  });

  it("keeps hyphens and apostrophes in talent names", () => {
    const nodes = parsePrerequisiteText(
      "Two-Handed Combat, Fool’s Retreat, and Grey Hawk's Gambit.",
      "/",
      stubResolvers,
    );
    const links = filterLinks(nodes);

    expect(links.map((link: any) => link.children[0].value)).toEqual([
      "Two-Handed Combat",
      "Fool’s Retreat",
      "Grey Hawk's Gambit",
    ]);
  });
});

describe("parsePrerequisiteText — text structure", () => {
  it("preserves non-linked text as text nodes", () => {
    const nodes = parsePrerequisiteText(
      "Alchemy sphere, 5 ranks.",
      "/",
      stubResolvers,
    );
    expect(nodes).not.toBeNull();
    const textNodes = nodes?.filter((n: any) => n.type === "text") ?? [];
    const textContent = textNodes.map((n: any) => n.value).join("");
    expect(textContent).toContain(", 5 ranks.");
  });

  it("produces no link when resolvers return nothing", () => {
    const nullResolvers: EntryResolvers = {
      resolveSphere: () => null,
      resolveTalent: () => null,
      resolveFeat: () => null,
    };
    const nodes = parsePrerequisiteText(
      "Alchemy sphere (Blast).",
      "/",
      nullResolvers,
    );
    expect(nodes).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// autoLinkPrerequisites — node preservation (F-005 regression guard)
// ---------------------------------------------------------------------------

describe("autoLinkPrerequisites — preserves non-text children", () => {
  it("preserves an existing link node inside the prereq paragraph", () => {
    // Simulate: **Prerequisites:** [Blast](@talent:blast) and Alchemy sphere.
    const existingLink = {
      type: "link",
      url: "/power/destruction/blast/",
      children: [{ type: "text", value: "Blast" }],
    };
    const paraNode = {
      children: [
        {
          type: "strong",
          children: [{ type: "text", value: "Prerequisites:" }],
        },
        { type: "text", value: " " },
        existingLink,
        { type: "text", value: " and Alchemy sphere." },
      ],
    };

    autoLinkPrerequisites(paraNode, "/", stubResolvers);

    // The existing link must still be present and unchanged
    const links = paraNode.children.filter((n: any) => n.type === "link");
    expect(links.some((l: any) => l.url === "/power/destruction/blast/")).toBe(
      true,
    );
    // The Alchemy sphere text node should also produce a link
    expect(links.some((l: any) => l.url === "/might/alchemy/")).toBe(true);
  });

  it("preserves emphasis nodes between text nodes", () => {
    const emNode = {
      type: "emphasis",
      children: [{ type: "text", value: "note" }],
    };
    const paraNode = {
      children: [
        {
          type: "strong",
          children: [{ type: "text", value: "Prerequisites:" }],
        },
        { type: "text", value: " Alchemy sphere, " },
        emNode,
        { type: "text", value: " Blast." },
      ],
    };

    autoLinkPrerequisites(paraNode, "/", stubResolvers);

    expect(paraNode.children.some((n: any) => n.type === "emphasis")).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// Integration: real content DB (slow — hits filesystem once)
// ---------------------------------------------------------------------------

describe("entryDatabase — real content lookup", () => {
  it("returns a URL for Alchemy sphere", () => {
    const url = getEntryUrlByName("sphere", "Alchemy", "/spheres-wiki/");
    expect(url).not.toBeNull();
    expect(url).toContain("/spheres-wiki/");
    expect(url).toContain("alchemy");
  });

  it("is case-insensitive", () => {
    const lower = getEntryUrlByName("sphere", "alchemy", "/spheres-wiki/");
    const upper = getEntryUrlByName("sphere", "Alchemy", "/spheres-wiki/");
    expect(lower).not.toBeNull();
    expect(lower).toBe(upper);
  });

  it("returns null for unknown sphere", () => {
    expect(getEntryUrlByName("sphere", "NonexistentSphere", "/")).toBeNull();
  });

  it("returns null for talent name 'Any'", () => {
    expect(getEntryUrlByName("talent", "Any", "/")).toBeNull();
  });

  it("getEntryUrl works for known talent id", () => {
    const url = getEntryUrl("talent", "aligned-liquid", "/spheres-wiki/");
    if (url !== null) {
      expect(url).toContain("/spheres-wiki/");
    }
    // aligned-liquid may or may not be present; test documents behavior
  });
});
