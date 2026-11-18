# 0002. Show cost against exposure as a dot plot on a log axis

Status: accepted, 2026-11-18

## Context

For each reserve the dashboard compares two dollar amounts that differ by orders of magnitude, from tens of dollars of exposure to hundreds of thousands to move a price. Bars on a linear axis would make every small value invisible. Bars on a log axis have no meaningful zero, so their length would mislead.

## Decision

A dot plot with a connecting line per reserve, on a logarithmic axis labelled in whole decades ($1k, $10k, $100k). Position carries the value; there is no baseline to truncate. Two series means a legend, and every value is also in a table.

## Consequences

- A gap of one decade is the same distance anywhere on the axis, which suits the question: how many times larger is one than the other.
- The ratio is printed beside each row, so the reader need not estimate it from the axis.
- A reader unused to log axes may misjudge distances, so the axis is labelled in decades and the page explains how to read it.
- Rows without a market model get a sentence instead of dots, never an empty plot.
