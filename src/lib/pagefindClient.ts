export interface SearchResult {
  url: string;
  meta: Record<string, string>;
  excerpt: string;
}

export interface PagefindResultHandle {
  data(): Promise<SearchResult>;
}

interface PagefindClient {
  options(options: { excerptLength: number }): Promise<void>;
  init(): Promise<void>;
  search(
    query: string,
    options: { filters: Record<string, string> },
  ): Promise<{ results: PagefindResultHandle[] }>;
}

let clientPromise: Promise<PagefindClient> | null = null;

/** Share initialization, including concurrent searches during the first load. */
export function loadPagefind(): Promise<PagefindClient> {
  if (!clientPromise) {
    clientPromise = import(
      /* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`
    )
      .then(async (client: PagefindClient) => {
        await client.options({ excerptLength: 30 });
        await client.init();
        return client;
      })
      .catch((error: unknown) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}
