// @vitest-environment happy-dom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { loadPagefind, type SearchResult } from "../../src/lib/pagefindClient";

const widgets = vi.hoisted(
  () => new Map<string, { onChange(value: string): void }>(),
);
vi.mock("../../src/lib/pagefindClient", () => ({ loadPagefind: vi.fn() }));
vi.mock("../../src/lib/tomSelectInit", () => ({
  createTomSelect: (
    id: string,
    settings: { onChange(value: string): void },
  ) => {
    widgets.set(id, settings);
    return { destroy: vi.fn(), setValue: vi.fn() };
  },
}));

let idle: IdleRequestCallback;
let intersect: IntersectionObserverCallback;
const nativeSearch = vi.fn();
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

function result(
  title: string,
  meta: Record<string, string> = {},
): SearchResult {
  return {
    url: `/spheres-wiki/${title}/`,
    meta: { title, ...meta },
    excerpt: "",
  };
}

function handles(count: number, meta: Record<string, string> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    data: vi.fn().mockResolvedValue(result(`match-${i}`, meta)),
  }));
}

function input(value: string) {
  const element = document.querySelector<HTMLInputElement>("#sp-input");
  if (!element) throw new Error("Missing input fixture");
  element.value = value;
  element.dispatchEvent(new Event("input"));
}

function changeFilter(key: string, value: string) {
  const widget = widgets.get(`sp-${key}-select`);
  if (!widget) throw new Error(`Missing ${key} widget`);
  widget.onChange(value);
}

function nextPage() {
  intersect(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

beforeAll(async () => {
  await import("../../src/lib/searchClient");
});

beforeEach(() => {
  vi.useFakeTimers();
  widgets.clear();
  nativeSearch.mockReset();
  vi.mocked(loadPagefind).mockResolvedValue({
    search: nativeSearch,
    options: vi.fn(),
    init: vi.fn(),
  });
  window.requestIdleCallback = vi.fn((callback) => {
    idle = callback;
    return 7;
  });
  window.cancelIdleCallback = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
  );
  history.replaceState({}, "", "/spheres-wiki/search/");
  document.body.innerHTML = `
    <input id="sp-input" />
    <div id="sp-data" data-spheres='["Spellhacking"]' data-tags='[]'></div>
    <div id="sp-status"></div><div id="sp-results"></div><div id="sp-load-more" hidden></div>
    <select id="sp-system-select"></select><select id="sp-type-select"></select>
    <select id="sp-sphere-select"></select><select id="sp-tag-select"></select>`;
});

afterEach(() => {
  document.dispatchEvent(new Event("astro:before-swap"));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("search lifecycle V88", () => {
  it("ignores a cancelled idle callback even when delivered after query results", async () => {
    nativeSearch.mockResolvedValue({
      results: [{ data: async () => result("Spell result") }],
    });
    document.dispatchEvent(new Event("astro:page-load"));
    input("spell");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.querySelector("#sp-results")?.textContent).toContain(
      "Spell result",
    );
    idle({ didTimeout: false, timeRemaining: () => 50 });
    await flush();
    expect(window.cancelIdleCallback).toHaveBeenCalledWith(7);
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("#sp-results")?.textContent).toContain(
      "Spell result",
    );
    expect(location.search).toBe("?q=spell");
  });

  it("invalidates in-flight data at input time, before the next debounce", async () => {
    let finishOld: (value: SearchResult) => void = () => {};
    const old = new Promise<SearchResult>((resolve) => {
      finishOld = resolve;
    });
    nativeSearch.mockResolvedValueOnce({ results: [{ data: () => old }] });
    nativeSearch.mockResolvedValueOnce({
      results: [{ data: async () => result("New result") }],
    });
    history.replaceState({}, "", "?q=old");
    document.dispatchEvent(new Event("astro:page-load"));
    await flush();
    input("new");
    finishOld(result("Old result"));
    await flush();
    expect(document.querySelector("#sp-results")?.textContent).not.toContain(
      "Old result",
    );
    await vi.advanceTimersByTimeAsync(220);
    expect(document.querySelector("#sp-results")?.textContent).toContain(
      "New result",
    );
  });

  it("does not render a response or an idle callback after a View Transition swap", async () => {
    let finish: (value: { results: ReturnType<typeof handles> }) => void =
      () => {};
    nativeSearch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    document.dispatchEvent(new Event("astro:page-load"));
    input("spell");
    await vi.advanceTimersByTimeAsync(220);
    document.dispatchEvent(new Event("astro:before-swap"));
    document.body.innerHTML = "<main>New page</main>";
    finish({ results: handles(1) });
    idle({ didTimeout: false, timeRemaining: () => 50 });
    await flush();
    expect(document.body.textContent).toBe("New page");
  });
});

describe("complete bounded search V90", () => {
  it("queries native filters before paging and can reach matches beyond 500", async () => {
    const power = handles(640, { system: "Spheres of Power" });
    const guile = handles(118, { system: "Spheres of Guile" });
    nativeSearch.mockImplementation(async (_query, { filters }) => ({
      results:
        filters.system === "Spheres of Guile" ? guile : [...power, ...guile],
    }));
    history.replaceState({}, "", "?q=spell");
    document.dispatchEvent(new Event("astro:page-load"));
    await flush();
    expect(document.querySelector("#sp-status")?.textContent).toBe(
      "758 results",
    );
    expect(
      power.filter((handle) => handle.data.mock.calls.length),
    ).toHaveLength(40);
    changeFilter("system", "guile");
    await flush();
    expect(nativeSearch).toHaveBeenLastCalledWith("spell", {
      filters: { system: "Spheres of Guile" },
    });
    expect(document.querySelector("#sp-status")?.textContent).toBe(
      "118 results",
    );
    expect(
      guile.filter((handle) => handle.data.mock.calls.length),
    ).toHaveLength(40);
    nextPage();
    nextPage();
    await flush();
    expect(
      guile.filter((handle) => handle.data.mock.calls.length),
    ).toHaveLength(80);
    nextPage();
    await flush();
    expect(document.querySelectorAll(".sp-result")).toHaveLength(118);
    expect(document.querySelector<HTMLElement>("#sp-load-more")?.hidden).toBe(
      true,
    );
    changeFilter("system", "");
    await flush();
    expect(nativeSearch).toHaveBeenLastCalledWith("spell", { filters: {} });
    for (let page = 0; page < 13; page++) {
      nextPage();
      await flush();
    }
    expect(document.querySelectorAll(".sp-result")).toHaveLength(560);
    expect(power[559].data).toHaveBeenCalledOnce();
    expect(power[560].data).not.toHaveBeenCalled();
  });

  it("restores all URL facets and keeps their exact native filter values", async () => {
    nativeSearch.mockResolvedValue({ results: handles(1) });
    history.replaceState(
      {},
      "",
      "?q=spell&system=guile&type=talent&sphere=Spellhacking&tag=utility",
    );
    document.dispatchEvent(new Event("astro:page-load"));
    await flush();
    expect(nativeSearch).toHaveBeenLastCalledWith("spell", {
      filters: {
        system: "Spheres of Guile",
        type: "talent",
        sphere: "Spellhacking",
        tags: "utility",
      },
    });
    changeFilter("tag", "magic");
    await flush();
    expect(nativeSearch).toHaveBeenLastCalledWith("spell", {
      filters: {
        system: "Spheres of Guile",
        type: "talent",
        sphere: "Spellhacking",
        tags: "magic",
      },
    });
    expect(new URLSearchParams(location.search).get("tag")).toBe("magic");
  });
});
