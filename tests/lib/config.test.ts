import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../src/config/site";
import {
  ANNOUNCEMENT,
  HEADER_NAV,
  SITE_TITLE,
  SYSTEM_DEFAULT,
  SYSTEMS,
} from "../../src/config/site";

describe("site.ts — SYSTEMS record", () => {
  const systemIds = ["power", "might", "guile", "champions"] as const;

  it("has entries for all four systems", () => {
    for (const id of systemIds) {
      expect(SYSTEMS[id]).toBeDefined();
    }
  });

  it("each system has required fields", () => {
    const requiredFields: Array<keyof SystemConfig> = [
      "label",
      "color",
      "darkColor",
      "route",
      "cssKey",
      "subtitle",
      "classLabel",
      "description",
      "introLinkText",
      "buildText",
      "buildHref",
    ];
    for (const id of systemIds) {
      const sys = SYSTEMS[id];
      for (const field of requiredFields) {
        expect(sys[field], `${id}.${field} is missing`).toBeDefined();
        expect(sys[field], `${id}.${field} is empty`).not.toBe("");
      }
    }
  });

  it("all routes start and end with /", () => {
    for (const id of systemIds) {
      const route = SYSTEMS[id].route;
      expect(route.startsWith("/"), `${id} route does not start with /`).toBe(
        true,
      );
      expect(route.endsWith("/"), `${id} route does not end with /`).toBe(true);
    }
  });

  it("all routes are unique", () => {
    const routes = systemIds.map((id) => SYSTEMS[id].route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("all cssKeys are unique", () => {
    const keys = systemIds.map((id) => SYSTEMS[id].cssKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("all color values are valid hex colors", () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const id of systemIds) {
      expect(SYSTEMS[id].color).toMatch(hexRe);
      expect(SYSTEMS[id].darkColor).toMatch(hexRe);
    }
  });

  it("dark colors are darker than main colors (value comparison)", () => {
    for (const id of systemIds) {
      const main = SYSTEMS[id].color.replace("#", "");
      const dark = SYSTEMS[id].darkColor.replace("#", "");
      const mainVal = parseInt(main, 16);
      const darkVal = parseInt(dark, 16);
      expect(
        darkVal,
        `${id} darkColor should be numerically lower than color`,
      ).toBeLessThan(mainVal);
    }
  });

  it("all labels are non-empty strings", () => {
    for (const id of systemIds) {
      expect(SYSTEMS[id].label.length).toBeGreaterThan(0);
    }
  });

  it("all buildHref values point to valid routes", () => {
    for (const id of systemIds) {
      expect(SYSTEMS[id].buildHref.startsWith("/")).toBe(true);
    }
  });

  it("SYSTEM_DEFAULT provides fallback color values", () => {
    expect(SYSTEM_DEFAULT.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(SYSTEM_DEFAULT.darkColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("site.ts — HEADER_NAV", () => {
  it("is a readonly array", () => {
    expect(Array.isArray(HEADER_NAV)).toBe(true);
    expect(HEADER_NAV.length).toBeGreaterThan(0);
  });

  it("each nav item has label and href", () => {
    for (const item of HEADER_NAV) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});

describe("site.ts — core constants", () => {
  it("SITE_TITLE is defined and non-empty", () => {
    expect(SITE_TITLE).toBeTruthy();
    expect(SITE_TITLE.length).toBeGreaterThan(0);
  });

  it("ANNOUNCEMENT is either a string or null", () => {
    expect(typeof ANNOUNCEMENT === "string" || ANNOUNCEMENT === null).toBe(
      true,
    );
  });
});
