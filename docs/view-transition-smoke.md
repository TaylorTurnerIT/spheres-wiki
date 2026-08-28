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

The reported flash was not a stylesheet FOUC or a DOM flush. Chrome's default
root transition animates both document snapshots with `plus-lighter`, so the
different `/feats/` and `/power/` surfaces brighten while they overlap. The
root animation in `src/styles/global.css` replaces that blend with an ordinary
alpha crossfade; named element transitions retain their existing behavior.
