# 0001. A static site that reads a published report

Status: accepted, 2026-11-18

## Context

The dashboard needs the scanner's output. A read API would mean a server to run, secure and pay for, for data that changes a few times a day and is public anyway. The scanner already runs in CI.

## Decision

The backend's scheduled workflow publishes `latest.json` to a `reports` branch. The dashboard is a static site that fetches it from `raw.githubusercontent.com`, which allows cross-origin reads. It validates the file and falls back to a snapshot bundled with the build.

## Consequences

- Nothing to host or operate beyond GitHub Pages and Actions.
- Data is at most about six hours old, plus up to five minutes of CDN caching. The footer states the scan time.
- The report format is a contract between two repositories. `parseReport` checks it, and a mismatch shows a banner and uses the snapshot instead of breaking the page.
- History needs more than one file. A per-asset history view needs either more published files or an API.
