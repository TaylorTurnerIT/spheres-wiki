---
id: privacy
name: "Privacy Policy"
type: article
tags: []
---

<div class="article-content">

Spheres Wiki is a free, non-commercial reference site. We collect no analytics, use no tracking cookies, and require no accounts. Last updated: 2026-06-19.

### Browser Storage

This site writes small values to your browser's local and session storage to remember UI preferences. No storage is used for tracking or analytics.

<table class="wiki-table">
  <thead>
    <tr>
      <th>Key</th>
      <th>Storage</th>
      <th>Purpose</th>
      <th>Retention</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>pref:power-original</code><br><code>pref:power-ultimate</code></td>
      <td>localStorage</td>
      <td>Tracks whether Original/Ultimate Spheres of Power content is enabled</td>
      <td>Indefinite (cleared via Preferences reset)</td>
    </tr>
    <tr>
      <td><code>pref:*-polished</code></td>
      <td>localStorage</td>
      <td>Tracks whether Polished (Diamond Recreational Studios) content is enabled for a given system</td>
      <td>Indefinite (cleared via Preferences reset)</td>
    </tr>
    <tr>
      <td><code>beta-toast-dismissed</code></td>
      <td>localStorage</td>
      <td>Hides the beta notice after dismissal</td>
      <td>Until browser data is cleared</td>
    </tr>
    <tr>
      <td><code>scroll-y</code></td>
      <td>sessionStorage</td>
      <td>Restores scroll position on page transitions</td>
      <td>Current browser session only</td>
    </tr>
    <tr>
      <td><code>*-animated</code></td>
      <td>sessionStorage</td>
      <td>Prevents toast slide-in animation replaying within a session</td>
      <td>Current browser session only</td>
    </tr>
    <tr>
      <td><code>spheres-wiki:casting-tradition-builder</code></td>
      <td>localStorage</td>
      <td>Autosaves the active Casting Tradition Builder state (selection ids, choices, name, CAM override, manual adjustments, export options) so work in progress is not lost when navigating away</td>
      <td>Indefinite (cleared by Reset to Defaults, or via browser data clear). Written with 300ms debounce; only compact selection state is stored (no rendered HTML or source-entry catalog)</td>
    </tr>
    <tr>
      <td><code>spheres-wiki:saved-casting-traditions</code></td>
      <td>localStorage</td>
      <td>Stores named saved casting traditions created via the Save button in the Casting Tradition Builder. Each record includes a stable id, display name, updated timestamp, schema version, and compact selection state</td>
      <td>Indefinite until deleted via the Builder's Delete button or browser data clear. Users can export saved traditions as a portable JSON backup via the Export Catalog button, and import them via the Import Catalog button. Reset to Defaults clears the active builder state but does not delete saved traditions</td>
    </tr>
  </tbody>
</table>

**Casting Tradition Builder data:** The two builder storage keys above contain only user-created tradition selections. They do not contain rendered HTML, personal information, or analytics data. The Reset to Defaults button in the Builder clears the active draft (<code>spheres-wiki:casting-tradition-builder</code>) without deleting saved traditions. The Delete button in the Builder removes a single saved tradition from <code>spheres-wiki:saved-casting-traditions</code> after confirmation. The Export Catalog button downloads all saved traditions as a portable JSON file; the Import Catalog button accepts a JSON backup and offers merge or replace behavior. When URL parameters are present (shareable links), the URL state takes precedence over stored drafts.

You can clear all stored values via your browser's developer tools (Application → Storage → Clear site data) or by clearing browser data for this site.

### Hosting

This site is hosted on **GitHub Pages** (GitHub, Inc. / Microsoft). GitHub automatically collects server access logs including IP addresses for security and operational purposes. This is outside our control. GitHub's privacy statement: [docs.github.com](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

### Third-Party Links

This site links to external services including GitHub, Discord, Google Docs, and Drop Dead Studios. Those services have their own privacy policies independent of this site. Following an external link means you are subject to that service's terms, not ours.

### Contact

Questions or concerns about data handling: join the Drop Dead Studios Discord and reach out to **@Chef** for technical concerns or **@Rednal** for content.

</div>
