/**
 * Tag detail tail renderer. Tag detail pages server-render the first
 * TAG_DETAIL_SSR_CAP rows; the remaining rows live in tags/<tag>/data.json
 * and are appended on scroll (IntersectionObserver sentinel), keeping both
 * the transferred HTML and the rendered DOM bounded. The four system-tag
 * pages otherwise render up to 3,800 rows / 2.8MB of markup up front.
 */
import { url } from "@/lib/url";

const CHUNK = 250;
const STATUS_DONE = "done";

function badgeHtml(tagId: string, labels: Record<string, string>): string {
  const label = labels[tagId] ?? tagId;
  return `<a href="${url(`/tags/${tagId}/`)}" class="tag-wrapper talent-tag" data-tag="${tagId}">${label}</a>`;
}

function rowHtml(row: any, labels: Record<string, string>): string {
  const badges = (row.b ?? [])
    .map((id: string) => badgeHtml(id, labels))
    .join("");
  return (
    `<div class="tag-entry-row" data-system="${row.sys}">` +
    `<a href="${url(row.u)}" class="tag-entry-name">${row.n}</a>` +
    badges +
    `<span class="tag-entry-sphere">${row.s}</span>` +
    `</div>`
  );
}

// fallow-ignore-next-line complexity
export function initTagDetailTail(): void {
  const status = document.querySelector<HTMLElement>("[data-tag-tail-status]");
  if (!status || status.dataset.state === STATUS_DONE) return;

  const tagId = status.dataset.tagId;
  if (!tagId) return;
  const lists = document.querySelectorAll<HTMLElement>(".tag-entry-list");

  let data: any = null;
  let cursor = 0;

  // fallow-ignore-next-line complexity
  const renderChunk = (): boolean => {
    if (!data || cursor >= data.tail.length) return false;
    const chunk = data.tail.slice(cursor, cursor + CHUNK);
    cursor += chunk.length;
    const frags: DocumentFragment[] = data.groups.map(() =>
      document.createDocumentFragment(),
    );
    for (const row of chunk) {
      const frag = frags[row.g];
      if (!frag) continue;
      const tpl = document.createElement("template");
      tpl.innerHTML = rowHtml(row, data.labels ?? {}).trim();
      frag.appendChild(tpl.content);
    }
    frags.forEach((frag, g) => {
      const list = lists[g];
      if (frag && list) list.appendChild(frag);
    });
    const shown = Math.min(cursor + 300, data.total);
    status.textContent = `Showing ${shown} of ${data.total} entries`;
    return cursor < data.tail.length;
  };

  const finish = () => {
    status.textContent = `${data.total} entries`;
    status.dataset.state = STATUS_DONE;
  };

  const load = async (): Promise<void> => {
    const res = await fetch(url(`/tags/${tagId}/data.json`));
    if (!res.ok) return;
    data = await res.json();
  };

  const advance = async (): Promise<void> => {
    if (!data) {
      try {
        await load();
      } catch {
        return; // keep the server-rendered head; status stays honest
      }
    }
    const more = renderChunk();
    if (more) void advance();
    else finish();
  };

  if (!("IntersectionObserver" in window)) {
    status.textContent = `${status.textContent} (enable JavaScript to view the full list)`;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        void advance();
      }
    },
    { rootMargin: "800px" },
  );
  observer.observe(status);
}
