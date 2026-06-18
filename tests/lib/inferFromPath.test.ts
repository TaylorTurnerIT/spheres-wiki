// tests/lib/inferFromPath.test.ts
import { describe, expect, it } from "vitest";
import {
  inferFromPath,
  resolveArchetypeEntry,
  resolveCastingTraditionEntry,
  resolveClassEntry,
  resolveSphereEntry,
} from "../../src/lib/inferFromPath";

/** No-op system attacher for testing sub-parsers in isolation. */
const identity = <T>(fields: T): T => fields;

describe("inferFromPath", () => {
  // ── Legacy flat paths — must continue working ──────────────────────────────
  describe("legacy paths", () => {
    it("talents/{id}.md → talent, id, no sphere", () => {
      expect(inferFromPath("talents/multifarious-transformation.md")).toEqual({
        type: "talent",
        id: "multifarious-transformation",
      });
    });
    it("feats/{id}.md → feat, id, no sphere", () => {
      expect(inferFromPath("feats/toxic-webs.md")).toEqual({
        type: "feat",
        id: "toxic-webs",
      });
    });
    it("spheres/{id}.md → sphere, id", () => {
      expect(inferFromPath("spheres/alteration.md")).toEqual({
        type: "sphere",
        id: "alteration",
      });
    });
    it("classes/{id}.md → class, id", () => {
      expect(inferFromPath("classes/shifter.md")).toEqual({
        type: "class",
        id: "shifter",
      });
    });
    it("archetypes/{id}.md → archetype, id, no className", () => {
      expect(inferFromPath("archetypes/abductee.md")).toEqual({
        type: "archetype",
        id: "abductee",
      });
    });
    it("archetype-features/{id}.md → archetype-feature, id, no archetypeId", () => {
      expect(inferFromPath("archetype-features/abducted.md")).toEqual({
        type: "archetype-feature",
        id: "abducted",
      });
    });
    it("class-features/{cid}/{id}.md → class-feature, className, id", () => {
      expect(
        inferFromPath("class-features/shifter/shifter-casting.md"),
      ).toEqual({
        type: "class-feature",
        className: "shifter",
        id: "shifter-casting",
      });
    });
    it("class-traits/{cid}/{id}.md → class-trait, className, id, no featureId", () => {
      expect(
        inferFromPath("class-traits/armorist/armorist-additional-binding.md"),
      ).toEqual({
        type: "class-trait",
        className: "armorist",
        id: "armorist-additional-binding",
      });
    });
    it("articles/{id}.md → article, id", () => {
      expect(inferFromPath("articles/using-spheres.md")).toEqual({
        type: "article",
        id: "using-spheres",
      });
    });
    it("tags/{id}.md → tag, id", () => {
      expect(inferFromPath("tags/ex.md")).toEqual({
        type: "tag",
        id: "ex",
      });
    });
  });

  // ── New nested paths ───────────────────────────────────────────────────────
  describe("new sphere-nested paths", () => {
    it("spheres/{sid}/index.md → sphere, id=sid", () => {
      expect(inferFromPath("spheres/alteration/index.md")).toEqual({
        type: "sphere",
        id: "alteration",
      });
    });
    it("spheres/{sid}/talents/{id}.md → talent, sphere, id", () => {
      expect(
        inferFromPath(
          "spheres/alteration/talents/multifarious-transformation.md",
        ),
      ).toEqual({
        type: "talent",
        sphere: "alteration",
        id: "multifarious-transformation",
      });
    });
    it("spheres/{sid}/feats/{id}.md → feat, sphere, id", () => {
      expect(inferFromPath("spheres/alteration/feats/toxic-webs.md")).toEqual({
        type: "feat",
        sphere: "alteration",
        id: "toxic-webs",
      });
    });
  });

  describe("new class-nested paths", () => {
    it("classes/{cid}/index.md → class, id=cid", () => {
      expect(inferFromPath("classes/shifter/index.md")).toEqual({
        type: "class",
        id: "shifter",
      });
    });
    it("classes/{cid}/features/{id}.md → class-feature, className, id", () => {
      expect(
        inferFromPath("classes/shifter/features/shifter-casting.md"),
      ).toEqual({
        type: "class-feature",
        className: "shifter",
        id: "shifter-casting",
      });
    });
    it("classes/{cid}/features/{fid}/traits/{id}.md → class-trait, className, featureId, id", () => {
      expect(
        inferFromPath(
          "classes/armorist/features/arsenal-trick/traits/armorist-additional-binding.md",
        ),
      ).toEqual({
        type: "class-trait",
        className: "armorist",
        featureId: "arsenal-trick",
        id: "armorist-additional-binding",
      });
    });
    it("classes/{cid}/archetypes/{aid}/index.md → archetype, className, id=aid", () => {
      expect(
        inferFromPath("classes/cleric/archetypes/abductee/index.md"),
      ).toEqual({
        type: "archetype",
        className: "cleric",
        id: "abductee",
      });
    });
    it("classes/{cid}/archetypes/{aid}/features/{id}.md → archetype-feature, archetypeId, id", () => {
      expect(
        inferFromPath(
          "classes/cleric/archetypes/abductee/features/abducted.md",
        ),
      ).toEqual({
        type: "archetype-feature",
        className: "cleric",
        archetypeId: "abductee",
        id: "abducted",
      });
    });
  });

  describe("system-prefixed paths", () => {
    it("might/spheres/{id}.md → sphere with system:might", () => {
      expect(inferFromPath("might/spheres/alchemy.md")).toEqual({
        type: "sphere",
        id: "alchemy",
        system: "might",
      });
    });
    it("might/spheres/{id}/talents/{tid}.md → talent with system:might, sphere", () => {
      expect(
        inferFromPath("might/spheres/alchemy/talents/billowing-poison.md"),
      ).toEqual({
        type: "talent",
        sphere: "alchemy",
        id: "billowing-poison",
        system: "might",
      });
    });
    it("power/spheres/{id}.md → sphere with system:power (future migration)", () => {
      expect(inferFromPath("power/spheres/alteration.md")).toEqual({
        type: "sphere",
        id: "alteration",
        system: "power",
      });
    });
    it("guile/spheres/{id}/talents/{tid} → talent with system:guile", () => {
      expect(inferFromPath("guile/spheres/deception/talents/bluff.md")).toEqual(
        {
          type: "talent",
          sphere: "deception",
          id: "bluff",
          system: "guile",
        },
      );
    });
    it("might/feats/{id}.md → feat with system:might", () => {
      expect(inferFromPath("might/feats/extra-combat-talent.md")).toEqual({
        type: "feat",
        id: "extra-combat-talent",
        system: "might",
      });
    });
    it("unknown system prefix is not recognized (treated as regular path)", () => {
      expect(inferFromPath("pf1e/spheres/fighter.md")).toEqual({});
    });
  });

  describe("casting tradition paths", () => {
    it("power/casting-traditions/drawbacks/general/{id}.md → general drawback", () => {
      expect(
        inferFromPath(
          "power/casting-traditions/drawbacks/general/draining-casting.md",
        ),
      ).toEqual({
        type: "drawback",
        drawbackKind: "general",
        id: "draining-casting",
        system: "power",
      });
    });

    it("power/casting-traditions/drawbacks/spheres/{sphere}/{id}.md → sphere drawback", () => {
      expect(
        inferFromPath(
          "power/casting-traditions/drawbacks/spheres/alteration/lycanthropic.md",
        ),
      ).toEqual({
        type: "drawback",
        drawbackKind: "sphere",
        sphere: "alteration",
        id: "lycanthropic",
        system: "power",
      });
    });

    it("power/casting-traditions/drawbacks/dual-spheres/{id}.md → dual-sphere drawback", () => {
      expect(
        inferFromPath(
          "power/casting-traditions/drawbacks/dual-spheres/terrain-warper.md",
        ),
      ).toEqual({
        type: "drawback",
        drawbackKind: "dual-sphere",
        id: "terrain-warper",
        system: "power",
      });
    });

    it("power/casting-traditions/boons/{id}.md → boon", () => {
      expect(
        inferFromPath("power/casting-traditions/boons/fortified-casting.md"),
      ).toEqual({
        type: "boon",
        id: "fortified-casting",
        system: "power",
      });
    });

    it("power/casting-traditions/traditions/custom/{id}.md → custom tradition", () => {
      expect(
        inferFromPath("power/casting-traditions/traditions/custom/blood-magic.md"),
      ).toEqual({
        type: "tradition",
        traditionKind: "custom",
        id: "blood-magic",
        system: "power",
      });
    });

    it("power/casting-traditions/traditions/variants/{id}.md → variant tradition", () => {
      expect(
        inferFromPath(
          "power/casting-traditions/traditions/variants/combat-wizardry.md",
        ),
      ).toEqual({
        type: "tradition",
        traditionKind: "variant",
        id: "combat-wizardry",
        system: "power",
      });
    });
  });

  describe("edge cases", () => {
    it("_book.yaml returns empty object", () => {
      expect(inferFromPath("_book.yaml")).toEqual({});
    });
    it("unrecognized top-level segment returns empty object", () => {
      expect(inferFromPath("unknown/foo.md")).toEqual({});
    });
  });
});

// ─── Sub-parsers (extracted resolvers) ────────────────────────────────────

describe("resolveSphereEntry", () => {
  it("resolves 2-segment talents/{id}", () => {
    expect(resolveSphereEntry(["talents", "bluff"], identity)).toEqual({
      type: "talent",
      id: "bluff",
    });
  });
  it("resolves 2-segment feats/{id}", () => {
    expect(resolveSphereEntry(["feats", "toxic-webs"], identity)).toEqual({
      type: "feat",
      id: "toxic-webs",
    });
  });
  it("resolves 2-segment spheres/{id}", () => {
    expect(resolveSphereEntry(["spheres", "alteration"], identity)).toEqual({
      type: "sphere",
      id: "alteration",
    });
  });
  it("resolves nested spheres/{sid}/talents/{id}", () => {
    expect(
      resolveSphereEntry(
        ["spheres", "alteration", "talents", "bluff"],
        identity,
      ),
    ).toEqual({ type: "talent", sphere: "alteration", id: "bluff" });
  });
  it("resolves nested spheres/{sid}/feats/{id}", () => {
    expect(
      resolveSphereEntry(
        ["spheres", "alteration", "feats", "toxic-webs"],
        identity,
      ),
    ).toEqual({ type: "feat", sphere: "alteration", id: "toxic-webs" });
  });
  it("resolves spheres/{sid}/index", () => {
    expect(
      resolveSphereEntry(["spheres", "alteration", "index"], identity),
    ).toEqual({ type: "sphere", id: "alteration" });
  });
  it("returns undefined for a path it does not own", () => {
    expect(
      resolveSphereEntry(["classes", "shifter"], identity),
    ).toBeUndefined();
  });
});

describe("resolveClassEntry", () => {
  it("resolves 2-segment classes/{id}", () => {
    expect(resolveClassEntry(["classes", "shifter"], identity)).toEqual({
      type: "class",
      id: "shifter",
    });
  });
  it("resolves legacy class-features/{cid}/{id}", () => {
    expect(
      resolveClassEntry(
        ["class-features", "shifter", "shifter-casting"],
        identity,
      ),
    ).toEqual({
      type: "class-feature",
      className: "shifter",
      id: "shifter-casting",
    });
  });
  it("resolves legacy class-traits/{cid}/{id}", () => {
    expect(
      resolveClassEntry(
        ["class-traits", "armorist", "armorist-additional-binding"],
        identity,
      ),
    ).toEqual({
      type: "class-trait",
      className: "armorist",
      id: "armorist-additional-binding",
    });
  });
  it("resolves nested classes/{cid}/features/{id}", () => {
    expect(
      resolveClassEntry(
        ["classes", "shifter", "features", "shifter-casting"],
        identity,
      ),
    ).toEqual({
      type: "class-feature",
      className: "shifter",
      id: "shifter-casting",
    });
  });
  it("resolves nested class-trait under classes/{cid}/features/{fid}/traits/{id}", () => {
    expect(
      resolveClassEntry(
        [
          "classes",
          "armorist",
          "features",
          "arsenal-trick",
          "traits",
          "armorist-additional-binding",
        ],
        identity,
      ),
    ).toEqual({
      type: "class-trait",
      className: "armorist",
      featureId: "arsenal-trick",
      id: "armorist-additional-binding",
    });
  });
  it("resolves classes/{cid}/index", () => {
    expect(
      resolveClassEntry(["classes", "shifter", "index"], identity),
    ).toEqual({
      type: "class",
      id: "shifter",
    });
  });
  it("does not steal an archetype-feature nested path (features under archetypes)", () => {
    expect(
      resolveClassEntry(
        ["classes", "cleric", "archetypes", "abductee", "features", "abducted"],
        identity,
      ),
    ).toEqual({ type: "class-feature", className: "abductee", id: "abducted" });
    // ^ resolveClassEntry alone (out of pipeline order) DOES match this generically —
    // disambiguation from archetype-features happens by resolver call order in
    // inferFromPath (archetype resolver runs first). See inferFromPath-level test.
  });
  it("returns undefined for a path it does not own", () => {
    expect(
      resolveClassEntry(["spheres", "alteration"], identity),
    ).toBeUndefined();
  });
});

describe("resolveCastingTraditionEntry", () => {
  it("resolves general drawbacks", () => {
    expect(
      resolveCastingTraditionEntry(
        ["casting-traditions", "drawbacks", "general", "draining-casting"],
        identity,
      ),
    ).toEqual({
      type: "drawback",
      drawbackKind: "general",
      id: "draining-casting",
    });
  });

  it("resolves sphere drawbacks", () => {
    expect(
      resolveCastingTraditionEntry(
        [
          "casting-traditions",
          "drawbacks",
          "spheres",
          "alteration",
          "lycanthropic",
        ],
        identity,
      ),
    ).toEqual({
      type: "drawback",
      drawbackKind: "sphere",
      sphere: "alteration",
      id: "lycanthropic",
    });
  });

  it("resolves boons", () => {
    expect(
      resolveCastingTraditionEntry(
        ["casting-traditions", "boons", "fortified-casting"],
        identity,
      ),
    ).toEqual({ type: "boon", id: "fortified-casting" });
  });

  it("resolves tradition categories", () => {
    expect(
      resolveCastingTraditionEntry(
        ["casting-traditions", "traditions", "standard", "wizard"],
        identity,
      ),
    ).toEqual({
      type: "tradition",
      traditionKind: "standard",
      id: "wizard",
    });
  });

  it("resolves variant traditions", () => {
    expect(
      resolveCastingTraditionEntry(
        ["casting-traditions", "traditions", "variants", "combat-wizardry"],
        identity,
      ),
    ).toEqual({
      type: "tradition",
      traditionKind: "variant",
      id: "combat-wizardry",
    });
  });

  it("returns undefined for a path it does not own", () => {
    expect(
      resolveCastingTraditionEntry(["spheres", "alteration"], identity),
    ).toBeUndefined();
  });
});

describe("resolveArchetypeEntry", () => {
  it("resolves 2-segment archetypes/{id}", () => {
    expect(resolveArchetypeEntry(["archetypes", "abductee"], identity)).toEqual(
      {
        type: "archetype",
        id: "abductee",
      },
    );
  });
  it("resolves 2-segment archetype-features/{id}", () => {
    expect(
      resolveArchetypeEntry(["archetype-features", "abducted"], identity),
    ).toEqual({ type: "archetype-feature", id: "abducted" });
  });
  it("resolves legacy archetype-features/{aid}/{id}", () => {
    expect(
      resolveArchetypeEntry(
        ["archetype-features", "abductee", "abducted"],
        identity,
      ),
    ).toEqual({
      type: "archetype-feature",
      archetypeId: "abductee",
      id: "abducted",
    });
  });
  it("resolves classes/{cid}/archetypes/{aid}/index", () => {
    expect(
      resolveArchetypeEntry(
        ["classes", "cleric", "archetypes", "abductee", "index"],
        identity,
      ),
    ).toEqual({ type: "archetype", className: "cleric", id: "abductee" });
  });
  it("resolves classes/{cid}/archetypes/{aid}/features/{id}", () => {
    expect(
      resolveArchetypeEntry(
        ["classes", "cleric", "archetypes", "abductee", "features", "abducted"],
        identity,
      ),
    ).toEqual({
      type: "archetype-feature",
      className: "cleric",
      archetypeId: "abductee",
      id: "abducted",
    });
  });
  it("returns undefined for a path it does not own", () => {
    expect(
      resolveArchetypeEntry(["talents", "bluff"], identity),
    ).toBeUndefined();
  });
});
