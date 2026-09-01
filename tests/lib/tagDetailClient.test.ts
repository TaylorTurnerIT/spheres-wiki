// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTagDetailTail } from "../../src/lib/tagDetailClient";

type ObserverInstance = {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
};

const observers: ObserverInstance[] = [];

class FakeIntersectionObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
}

describe("tag detail tail", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="tag-entry-list"></div>
      <p data-tag-tail-status data-tag-id="talent">Loading…</p>
    `;
    observers.length = 0;
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          groups: ["Might"],
          labels: { "danger-tag": "Danger <tag>" },
          total: 1,
          tail: [
            {
              g: 0,
              n: "A <dangerous> entry",
              u: "/might/spheres/example/entry/",
              s: "A <sphere>",
              sys: "might",
              b: ["danger-tag"],
            },
          ],
        }),
      }),
    );
  });

  it("renders escaped tail content with its system and cleans up on swap", async () => {
    initTagDetailTail();
    expect(observers).toHaveLength(1);

    observers[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      observers[0] as unknown as IntersectionObserver,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const row = document.querySelector<HTMLElement>(".tag-entry-row");
    expect(row?.dataset.system).toBe("might");
    expect(row?.querySelector(".tag-entry-name")?.textContent).toBe(
      "A <dangerous> entry",
    );
    expect(row?.querySelector(".tag-entry-name b")).toBeNull();
    expect(row?.querySelector(".tag-entry-sphere")?.textContent).toBe(
      "A <sphere>",
    );
    expect(row?.querySelector('[data-tag="danger-tag"]')?.textContent).toBe(
      "Danger <tag>",
    );

    document.dispatchEvent(new Event("astro:before-swap"));
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
