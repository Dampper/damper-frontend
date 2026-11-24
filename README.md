<p align="center">
  <img src="https://raw.githubusercontent.com/Dampper/.github/main/profile/damper-wordmark.png" alt="Damper" width="420">
</p>

# Damper Frontend

[![CI](https://github.com/Dampper/damper-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Dampper/damper-frontend/actions/workflows/ci.yml) [![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE) ![Network](https://img.shields.io/badge/network-Stellar%20mainnet%20(read--only)-informational)

**Live:** [damper-frontend.vercel.app](https://damper-frontend.vercel.app)

Pool risk dashboard for [Damper](https://github.com/Dampper/damper-contracts). It shows which Blend lending pools on Stellar could be drained through a manipulated price, how cheaply, and where each reserve's price comes from. It reads mainnet data only and never asks for a wallet.

More documentation:

- [Architecture](docs/ARCHITECTURE.md): where the data comes from and how the pages are built
- [Decision records](docs/adr/README.md): why it is built this way
- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md)

## What it shows

- **Pools.** Every scanned pool: status, supplied, borrowed, where its prices come from, and its highest risk tier. Filter to the pools that allow borrowing. A "what stands out" list groups patterns the pools cannot see for themselves: prices set by one admin key, a deviation check switched off, collateral at a fixed price.
- **A pool.** Its reserves and price sources, then two charts: if a collateral asset's price were pushed up, and if a borrowed asset's price were pushed down. Each is a dot plot on a logarithmic dollar axis comparing *the capital needed to move the price 10×* with *what could be borrowed once it moved*. Every chart has a table twin.
- **Method.** What the numbers mean and what they leave out.
- **Oracle status.** For a Damper guarded oracle: each asset's raw price before any clamp, the quote a pool actually reads, the anchor and its age, the policy rate against what is actually in force right now, the gate's latest published evidence, and the keeper's alerts from its last pass. See [decision record 0004](docs/adr/0004-oracle-status-page.md).

Tiers come from the scanner in [damper-backend](https://github.com/Dampper/damper-backend); the reasoning is in its [decision record 0002](https://github.com/Dampper/damper-backend/blob/main/docs/adr/0002-score-by-capital-to-clear-the-book.md).

## Data

The page reads `https://raw.githubusercontent.com/Dampper/damper-backend/reports/latest.json`, which a scheduled workflow in damper-backend refreshes every 6 hours. The oracle status page separately reads `https://raw.githubusercontent.com/Dampper/damper-backend/keeper-state/oracle-status.json`, published after every keeper pass (about every 5 minutes). Either can fail independently; each falls back to its own snapshot bundled with the build and says so in a banner. Set `VITE_REPORT_URL` or `VITE_STATUS_URL` to point at another report.

## Develop

Node 20 or newer.

```sh
npm install
npm run dev          # http://localhost:5173/
npm test             # parsing, formatting, chart scale, and page rendering
npm run typecheck
npm run build        # DAMPER_BASE=/ for a host that serves from the root
```

Append `?theme=dark` or `?theme=light` to the URL to force a theme.

## Colour

The two chart series are categorical slots 1 and 2 of a validated palette (`#2a78d6` and `#eb6834` on light, `#3987e5` and `#d95926` on dark). Run against each theme's real chart surface, both pass the lightness band, chroma floor, colour-vision separation (ΔE 24.7 light, 26.8 dark), normal-vision separation, and 3:1 contrast checks. Risk tiers use status colours and always carry an icon and a label, never colour alone.

## License

Apache-2.0
