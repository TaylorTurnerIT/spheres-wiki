# Fallow Agent Guide & Remediation Techniques

This guide provides context-aware remediation techniques for Fallow audit findings. Use these patterns when fixing codebase health and dead-code issues.

## 1. Complexity & CRAP Scores
**Flagged when:** Function exceeds complexity thresholds (Cognitive/Cyclomatic) or has high CRAP (untested complexity).

### Remediation Techniques:
- **Flatten Guard Clauses**: Replace nested `if` blocks with early returns.
- **Extract Named Helpers**: Break logic into smaller, pure functions (1-15 lines).
- **Split Independent Branches**: If a function does "A or B," split it into `handleA()` and `handleB()`.
- **Add Tests**: Before refactoring a high-CRAP function, ensure it has unit tests covering all branches.

## 2. Dead Code (Unused Files & Exports)
**Flagged when:** A file or export is unreachable from any entry point.

### Remediation Techniques:
- **Trace Usage**: Run `fallow dead-code --trace <file>:<export>` to verify it is truly unused before deleting.
- **Inline Single-Use**: If an export is only used in one place, consider moving it into that file as a local constant.
- **Delete Genuinely Dead Code**: If the file was a one-off migration script or an experiment, delete it and its corresponding tests.

## 3. Dependency Hygiene
**Flagged when:** Unlisted dependencies are used, or listed dependencies are unused.

### Remediation Techniques:
- **Register Unlisted**: Add missing packages (e.g., `zod`, `unified`) to `package.json` to ensure build stability in clean environments.
- **Prune Unused**: Remove packages like `uipro-cli` if they are no longer imported.
- **Move to Dev**: Move test-only or build-time packages (e.g., `@astrojs/sitemap`) from `dependencies` to `devDependencies`.

## 4. Logical Duplication
**Flagged when:** Identical or near-identical code blocks exist in multiple files.

### Remediation Techniques:
- **Extract to Library**: Move shared logic from scripts or components into `src/lib/` or a dedicated script utility.
- **Componentize**: For duplicated Astro patterns, create a shared component in `src/components/`.

## 5. Inline Suppressions
**Flagged when:** You have an intentional architectural exception, a false positive, or an unused dependency that the framework requires under the hood but Fallow cannot statically trace.

### Remediation Techniques:
- **Code-Level Suppressions**: Use `// fallow-ignore-next-line <rule-name>` above the line to suppress a finding. For example, `// fallow-ignore-next-line unused-exports` prevents an export from failing the build. Use this sparingly for genuine exceptions. You can also use JSDoc tags like `@public` or `@expected-unused`.
- **Dependency Suppressions**: Since you cannot add comments in `package.json`, Fallow provides the `ignoreDependencies` array in `.fallowrc.json`. Add the package name there (e.g. `"ignoreDependencies": ["@astrojs/compiler-rs"]`) to tell Fallow that a dependency is legitimately used.

---

For detailed explanations of any finding, run:
`npm run fallow -- explain <issue-label>`
