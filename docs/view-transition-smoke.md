# View Transition smoke test

The browser smoke test covers the quick, uncached navigation from `/feats/` to
`/power/`. It clicks the destination link directly, so the run does not depend
on hover prefetch completing first.

```bash
TMPDIR=/dev/shm direnv exec . bun run build
TMPDIR=/dev/shm direnv exec . bun run preview -- --host 127.0.0.1
TMPDIR=/dev/shm direnv exec . bun run test:browser
```

The test records the Astro preparation/swap/page-load events, the target page's
computed style at `astro:after-swap`, and animation-frame samples from the live
DOM and root View Transition pseudos. It fails if the target is blank or
unstyled, if lifecycle events are missing or out of order, or if Chrome's
additive `plus-lighter` root compositing is active. Set
`VIEW_TRANSITION_CAPTURE=1` to retain PNG screencast frames under
`test-results/view-transition/` for visual inspection.

Set `CHROME_PATH` (or `PUPPETEER_EXECUTABLE_PATH`) to a local Chrome executable
when it is outside the standard Linux paths. An explicit missing path fails
instead of selecting another browser. CI requires an explicit path and installs
the Chrome revision exported by the locked `puppeteer-core` dependency.
Both checks use `--no-sandbox --disable-dev-shm-usage` for the CI runner;
Lighthouse keeps these launch flags in `lighthouserc.json` for local parity.

The report includes the selected executable, its version, and failure details,
even when startup fails before the first page opens. Browser stdout/stderr is
forwarded to the command output; CI retains it as `browser.log` alongside
`report.json` and the Preview log in the `browser-check-reports` artifact.

`deploy.yml` runs the smoke test and all Lighthouse targets before uploading
the Pages artifact, using the same built files for validation and publication.
Manual dispatch follows this gate too. Failing browser or Lighthouse checks
leave the last successful deployment in place; performance thresholds are not
relaxed to work around known payload failures.

The reported flash was not a stylesheet FOUC or a DOM flush. Chrome's default
root transition animates both document snapshots with `plus-lighter`, so the
different `/feats/` and `/power/` surfaces brighten while they overlap. The
root animation in `src/styles/global.css` replaces that blend with an ordinary
alpha crossfade; named element transitions retain their existing behavior.
