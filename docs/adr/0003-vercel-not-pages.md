# 0003. Deploy to Vercel instead of GitHub Pages

Status: accepted, 2026-11-18

## Context

[0001](0001-static-site-reading-a-published-report.md) chose GitHub Pages because a static site reading a published report needs nothing to host: no server, no bill. That reasoning holds regardless of which static host serves the files, so the choice of Pages specifically was never load-bearing. Vercel was the one actually set up.

## Decision

The site is built and served at the project root (`vercel.json` sets `DAMPER_BASE` via `build.env`, since Vercel does not serve this project under a subpath the way `dampper.github.io/damper-frontend/` did). `pages.yml` is removed; `vercel.json`'s build settings are the only deployment config now. The app's hash routing (`#/pool/...`) already needed no server rewrites for either host.

## Consequences

- One deployment config to keep current, not two.
- The live URL moved from `dampper.github.io/damper-frontend` to `damper-frontend.vercel.app`; links in this README and the org profile were updated.
- Nothing else in [0001](0001-static-site-reading-a-published-report.md) changes: the site still reads `reports` from `raw.githubusercontent.com`, still falls back to a bundled snapshot, and is still "nothing to host or operate" in the sense that matters — no server of our own either way.
