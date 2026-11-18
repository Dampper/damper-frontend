# Architecture

A static single-page app. There is no server: it reads one JSON file, validates it, and renders it.

```
 damper-backend (every 6 h)                     browser
 ┌──────────────────────────┐   raw.githubusercontent.com   ┌────────────────────────────────┐
 │ scan Blend pools         │ ─────── latest.json ────────▶ │ loadReport → parseReport       │
 │ publish to `reports`     │                               │   ├─ live ok      → render     │
 └──────────────────────────┘      bundled snapshot ──────▶ │   └─ else fallback → banner    │
                                                            └────────────────────────────────┘
```

## Modules

| File | Role |
| --- | --- |
| [`src/types.ts`](../src/types.ts) | The scanner's report format, mirrored by hand from damper-backend |
| [`src/report.ts`](../src/report.ts) | `parseReport`: validates the JSON and names the first wrong field, so a format change fails loudly |
| [`src/data.ts`](../src/data.ts) | Live report first, bundled snapshot second; an abort is never mistaken for a fallback |
| [`src/derive.ts`](../src/derive.ts) | Summary figures, tiers, what to plot per reserve and why a row has no dots, the "what stands out" findings |
| [`src/format.ts`](../src/format.ts) | Dollar, multiple, price and age formatting |
| [`src/components/CostChart.tsx`](../src/components/CostChart.tsx) | The dot plot on a log axis, with hover, keyboard focus and a table twin |
| [`src/router.ts`](../src/router.ts) | Hash routing, so any static host works |

Pure logic (parsing, formatting, derivation, the chart's scale) is separate from rendering and is tested without a browser. Pages are tested with the bundled snapshot as the fixture.

## The chart

Each reserve is one row: a blue dot for the cost of moving the price 10×, an orange dot for what could be borrowed once it moved, joined by a line, on a logarithmic dollar axis whose decades are labelled. Reading rule: where orange is to the right of blue, the prize is bigger than the cost. The ratio and the tier sit at the end of the row. Reserves that play no part on a side (not collateral, nothing to borrow) are collapsed into one line; reserves with no market model say why. Rows are 44px tall hit targets, hover and keyboard focus show the same tooltip, and every value is also in a table.

## Failure modes

- **Live report missing or malformed:** falls back to the bundled snapshot and shows a banner with the reason and the snapshot's date.
- **Both unreadable:** an error message, not a blank page.
- **Stale report:** the footer states how long ago the scan ran and its ledger.
- **Unknown pool in the URL:** a message and a link back.
