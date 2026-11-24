# Changelog

All notable changes to this repository are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Nothing has been released yet.

## [Unreleased]

### Added

- Pool risk dashboard: pools overview with filters and a "what stands out" list, a pool page with reserves, price sources and two cost-versus-exposure dot plots, and a method page.
- Light and dark themes, following the system with a manual override.
- Reads the scanner's published report and falls back to a bundled snapshot, with validation of the report format.
- CI, and deployment to GitHub Pages, later moved to Vercel (see decision record 0003).
- Oracle status page: reads the keeper's own published report for each asset's raw price, quote, anchor, policy versus the rate in force, gate evidence and alerts (see decision record 0004).
