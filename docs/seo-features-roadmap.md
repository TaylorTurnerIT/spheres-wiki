# Website Features & SEO Roadmap

This is a categorized TODO list for the key website features and SEO optimizations missing from your site.

## SEO & Discoverability
Since you love SEO, these are the highest priority items. Even if you don't have social media, Open Graph tags are crucial because they control how your site looks when users share links on Discord, Reddit, or Slack.

- `[ ]` **Canonical URLs**: Add `<link rel="canonical">` to the head to prevent duplicate content issues in search engines.
- `[ ]` **Dynamic Meta Descriptions**: Ensure every page passes a unique `description` to the `Base.astro` layout.
- `[ ]` **JSON-LD Structured Data**: Add Breadcrumb structured data to detail pages so search engines can display rich results.
- `[ ]` **Social Sharing Tags**: Add Open Graph (`og:title`, `og:description`, `og:image`) and Twitter Cards to `Base.astro`.
- `[ ]` **RSS Feed**: Create an `/rss.xml` route for users to subscribe to site updates.

## Core Website Functionality
Standard features expected of modern web applications.

- `[ ]` **Custom 404 Page**: Create a helpful `404.astro` page to catch broken links and guide users back to the content.
- `[ ]` **Print-Friendly Styles**: Add a `@media print` stylesheet block so users can cleanly print wiki pages or save them as PDFs.
- `[ ]` **Recent Changes / Changelog**: Implement a `/recent-changes/` page so users can see what content has been updated recently.

## User Experience (UX)
Quality of life improvements for your readers.

- `[ ]` **Dark Mode Toggle**: Implement a dark mode switch with CSS variables and `localStorage` persistence.
- `[ ]` **Content Filters / Preferences**: Create a config page (`/preferences/`) allowing users to filter out specific content site-wide (e.g., third-party or April Fools content).
- `[ ]` **Version Selector**: Add a content version selector (Original vs Ultimate) for systems that support it.
