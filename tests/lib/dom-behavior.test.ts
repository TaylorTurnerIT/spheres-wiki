// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindCollapseToggle,
  setCollapsibleState,
} from "../../src/lib/collapseClient";
import { setSidebarSemantics } from "../../src/lib/sidebarSemantics";
import { createTocEngine } from "../../src/lib/tocEngine";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("sidebar semantics", () => {
  it("keeps desktop navigation exposed and makes mobile state modal", () => {
    const sidebar = document.createElement("aside");
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
    sidebar.setAttribute("aria-hidden", "true");

    setSidebarSemantics(sidebar, false, false);
    expect(sidebar.getAttribute("role")).toBeNull();
    expect(sidebar.getAttribute("aria-modal")).toBeNull();
    expect(sidebar.getAttribute("aria-hidden")).toBeNull();

    setSidebarSemantics(sidebar, true, false);
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(sidebar.getAttribute("role")).toBeNull();

    setSidebarSemantics(sidebar, true, true);
    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(sidebar.getAttribute("role")).toBe("dialog");
    expect(sidebar.getAttribute("aria-modal")).toBe("true");
  });
});

describe("collapse behavior", () => {
  it("keeps aria and inert state synchronized with the toggle", () => {
    const btn = document.createElement("button");
    const target = document.createElement("section");
    btn.setAttribute("aria-expanded", "false");
    target.setAttribute("aria-hidden", "true");
    document.body.append(btn, target);

    bindCollapseToggle(btn, target, "section");
    expect(target.inert).toBe(true);

    btn.click();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(target.getAttribute("aria-hidden")).toBe("false");
    expect(target.inert).toBe(false);

    setCollapsibleState(btn, target, false, "section");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(target.getAttribute("aria-hidden")).toBe("true");
    expect(target.inert).toBe(true);
  });
});

describe("TOC behavior", () => {
  it("highlights a section and disconnects its observer on stop", () => {
    const observerInstances: Array<{
      disconnect: ReturnType<typeof vi.fn>;
      observe: ReturnType<typeof vi.fn>;
    }> = [];
    class FakeIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();

      constructor(_callback: IntersectionObserverCallback) {
        observerInstances.push(this);
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

    const nav = document.createElement("nav");
    nav.innerHTML =
      '<li data-toc-section="overview"><a href="#overview">Overview</a></li>';
    const heading = document.createElement("h1");
    heading.id = "overview";
    heading.className = "page-title";
    document.body.append(nav, heading);

    const engine = createTocEngine({ nav });
    expect(engine).not.toBeNull();
    expect(
      nav.querySelector("[data-toc-section]")?.classList.contains("is-active"),
    ).toBe(true);
    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].observe).toHaveBeenCalledWith(heading);

    engine?.stop();
    expect(observerInstances[0].disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
