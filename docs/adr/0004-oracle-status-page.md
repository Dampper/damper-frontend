# 0004. An oracle status page, reading the keeper's own published report

Status: accepted, 2026-11-24

## Context

The pool dashboard scores manipulation risk, but it never shows the oracle's own health: whether a clamp is currently binding, whether the gate has fallen back to its tight rate for lack of evidence, whether an anchor has gone stale. That state only exists inside the keeper (damper-backend), which already decides it on every pass to choose what to do and what to alert on.

[0001](0001-static-site-reading-a-published-report.md) already settled how this kind of problem is solved here: something else reads the expensive state on a schedule and publishes plain JSON; the site reads that instead of the chain, and falls back to a bundled snapshot if the live file cannot be reached.

## Decision

The keeper now publishes an `oracle-status.json` (damper-backend ADR 0009) to its `keeper-state` branch after every pass. `src/oracleStatus.ts` validates it the same way `src/report.ts` validates the scan report — same style of parser, same `ReportError` naming the first bad field — with one addition: a price, cost or exposure is an arbitrary-precision i128 on the contract, sent as a decimal string, so it is parsed into a `bigint` rather than a lossy `number`.

The status page (`#/status`, `components/OracleStatusPage.tsx`) shows, per asset: the raw median before any clamp, the quote a pool actually reads, the anchor and when it last moved, the policy rate against the rate actually in force right now (and the gate's tight rate, when the asset has one), the latest published evidence, and that pass's alerts. It fetches independently of the pool report — a visitor who never opens this page never requests it.

## Consequences

- A person can see an oracle's live state — collateral or debt still correctly priced right now, or clamped and why — from a static page, the same guarantee the pool dashboard already gives for manipulation risk.
- The page is only as current as the keeper's last successful pass; nothing on it says a keeper has stopped running beyond its own timestamp. That is the heartbeat's job (damper-backend ADR 0006), not this page's.
- Reusing `bigint` for fixed-point amounts means every figure shown here is exact where the scan report's plain `number` fields are not; this page and the pool page round money differently for an honest reason, not an oversight.
- One oracle at a time. A pool operator running several guarded oracles would need either several links or a chooser; not built, since there is only ever one testnet demo oracle to show today.
