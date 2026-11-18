# Contributing to Damper Frontend

Thanks for helping. This page covers setup, checks and what a pull request needs. For the shared rules (labels, commit messages, code of conduct) see the [organisation guide](https://github.com/Dampper/.github/blob/main/CONTRIBUTING.md).

## Finding something to work on

Look for issues labelled `good first issue` or `help wanted`. Each one lists what to do, acceptance criteria and where to look. Comment to get assigned before you start. If none fits, the [roadmap](ROADMAP.md) lists what is next, and an accessibility pass on any page is always welcome.

## Working on a Stellar Wave issue

Pick an issue marked for the Wave, comment to be assigned, and open your pull request against it. Keep to the issue's acceptance criteria; if the issue is wrong, say so there rather than widening the change.

## Local setup

Node 20 or newer.

```sh
npm install
npm run dev          # http://localhost:5173/damper-frontend/
npm test
npm run typecheck
npm run build
```

The app reads the scanner's published report and falls back to `public/data/latest.json`. To work on a new report field, change the scanner in [damper-backend](https://github.com/Dampper/damper-backend), then update `src/types.ts`, `src/report.ts` and the bundled snapshot together.

## Making a change

CI runs typecheck, tests and a build. A pull request needs:

- **Tests for logic.** Parsing, formatting, derivation and the chart's scale are pure functions with tests; a change to any of them needs a case. A bug fix needs a test that fails without it.
- **Both themes checked.** Open the page with `?theme=dark` and `?theme=light`, and at phone width. Say what you looked at in the pull request.
- **Charts follow the chart rules.** Dollar values stay readable without hover (a table twin or a label), hit targets are at least 24px, colour is never the only carrier of meaning (tiers have icons and labels), and series colours come from the palette tokens in `styles.css`. If you change a series colour, run it through the palette validator for both surfaces and put the result in the pull request.
- **Honest data.** Never fill a gap with a made-up number. If the scanner has no value, show a dash or say why.
- **Docs.** If a design choice changed, update or add a record in [`docs/adr`](docs/adr/README.md).

## Code guidelines

- Keep data logic (`report.ts`, `derive.ts`, `format.ts`) free of React so it stays testable.
- Validate anything read from the network. `parseReport` names the first wrong field.
- No wallet connection and no transactions: the dashboard is read-only on purpose.

## Commit messages

Imperative subject under about 70 characters, then a body that says why.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](https://github.com/Dampper/.github/blob/main/SECURITY.md).
