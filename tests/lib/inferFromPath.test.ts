// tests/lib/inferFromPath.test.ts
import { describe, it, expect } from "vitest";
import { inferFromPath } from "../../src/lib/inferFromPath";

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

  describe("edge cases", () => {
    it("_book.yaml returns empty object", () => {
      expect(inferFromPath("_book.yaml")).toEqual({});
    });
    it("unrecognized top-level segment returns empty object", () => {
      expect(inferFromPath("unknown/foo.md")).toEqual({});
    });
  });
});
