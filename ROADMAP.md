# Roadmap

## Done

- Pools overview, pool page with two dot plots, method page, light and dark themes, report validation with a bundled fallback, deployment to GitHub Pages, later moved to Vercel (ADR 0003).
- Oracle status page: each asset's raw price against the price pools read, the anchor and its age, the policy rate against what is actually in force, and the keeper's alerts, read from the keeper's own published report (ADR 0004).

## Next

- **Per-asset history.** Cost and exposure over time, once the scanner publishes more than the latest report.
- **Operator setup.** Configure a Damper oracle for a new pool: feeds per asset, quorum, staleness and clamp policy, with a preview against the YieldBlox replay.
- **Compare a pool across scans** to show what changed.
- **Permalinkable chart state** and a share image per pool.
