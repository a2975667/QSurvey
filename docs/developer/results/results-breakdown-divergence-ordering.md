Results Breakdown Divergence Ordering (QV)
=========================================

Context
- QV results include:
  - Results panel: per-option totals (bar chart / table).
  - Breakdown panel: per-option subplots (Dots / Histogram).
- These views are linked: the same option ordering should be used so a given option appears in the same relative position across panels.

What The Dots Represent
- Source series: `buildOptionSeries` aggregates raw vote rows into per-option respondent totals.
  - File: `client/src/components/results/utils.ts`
  - Each dot is a single respondent’s *total votes for that option* (sum of their vote rows for that option).
- Dots view display clamping:
  - `ScatterPlot` clamps values to [-10, 10] for the current display.
  - This clamping is display-only and is not used for divergence metrics.
  - File: `client/src/components/results/moveVis/ScatterPlot.tsx`

Divergence Metrics (for Ordering)
- Goal: surface options where there may be “hidden divergence” (minority voices / spread of opinions) even when totals do not stand out.
- Metrics are computed on raw aggregated vote totals (pre-clamp).
- Missing-as-zero rule:
  - Respondents who did not vote on an option are treated as vote=0 for that option.
  - We implement this using `meta.counts.responses` as the total respondent count for the question.

Metrics
- Variance:
  - Population variance over respondent totals for that option.
  - Uses `nTotal = meta.counts.responses` (includes implicit zeros).
- Range:
  - `max - min` over respondent totals for that option.
  - If there are implicit zeros, 0 participates in min/max.

Ordering Control
- UI: an “Order by” selector (Default / Variance / Range).
- Default ordering is totals sum desc.
- When ordering changes, the ordering is applied consistently to:
  - Results bar chart
  - Results table
  - Breakdown dots
  - Breakdown histogram
- Filtering behavior:
  - Brushing/selection filters do not recompute divergence metrics or ordering; ordering always reflects the full dataset.
- Persistence:
  - “Order by” persists across question changes within the session (in-memory state).
