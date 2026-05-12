// Prepend the site base path to an absolute internal URL.
// import.meta.env.BASE_URL is '/' in dev and '/spheres-wiki/' in production.
export const url = (path: string): string =>
  import.meta.env.BASE_URL.slice(0, -1) + path;
