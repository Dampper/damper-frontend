<p align="center">
  <img src="https://raw.githubusercontent.com/UbsOrg/.github/main/profile/damper-wordmark.png" alt="Damper" width="420">
</p>

# Damper Frontend

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE) ![Status](https://img.shields.io/badge/status-design%20stage-lightgrey)

Web dashboard for [Damper](https://github.com/UbsOrg/damper-contracts), a manipulation-resistant price oracle for Blend lending pools on Stellar.

## Planned views

- **Pool risk** — every Blend pool ranked by how cheaply it could be drained through a manipulated collateral price, with the assets and markets driving the score.
- **Asset markets** — per-asset manipulation-cost history, upstream feed agreement, and alerts from the keeper.
- **Operator setup** — configure a Damper oracle for a new pool: upstream feeds per asset, quorum, staleness, and per-asset clamp policy.

## Status

Design stage. Data comes from [damper-backend](https://github.com/UbsOrg/damper-backend); see the roadmap in [damper-contracts](https://github.com/UbsOrg/damper-contracts#roadmap).

## License

Apache-2.0
