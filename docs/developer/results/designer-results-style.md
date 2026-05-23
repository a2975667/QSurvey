Designer Results UI Notes
=========================

Scope
- This page captures the current approach and styling choices for the designer results views (`client/src/pages/designer/SurveyResultsPage.tsx`).
- Includes recent adjustments to panel hierarchy, metrics, toggles, and tooltips.

Layout & Panels
- Three main panels: Survey Overview (designer only), Results (option totals), Breakdown (visual insights).
- Consistent header typography via `surveyResults.css`:
  - `panel-overline` (uppercase label, 1rem), `panel-title`, `panel-subtitle`.
  - Info icon uses `.info-pill` with a custom hover/focus tooltip (shows Survey ID/Question ID).
- Toolbar model:
  - QV Results: chart/table toggle.
  - QV Breakdown: dots/histogram toggle.
  - Approval Results: dots/chart/table toggle.
  - Only one mode renders at a time within each panel.
- Likert + Selection show the Results card only (no Breakdown).
- Approval shows the Results card only (no Breakdown) with a three-mode toggle:
  - `Dots` (default), `Chart`, `Table`.
- Approval chart mode uses a zero-based x-axis (`axisMode='nonNegative'`).
- Approval legacy warning: if any respondent raw approvals exceed the current configured cap, show a warning text in Results; displayed totals remain unchanged.
- Text Block questions are excluded from results.

Metrics (Survey Overview)
- Responses (from `meta.counts.responses`).
- Options count (`meta.optionTotals.length`).
- Credits per person (from question `totalCredits` or `setting.totalCredits`).
- Max votes per option = `floor(sqrt(totalCredits))`.
- Avg votes per person = `counts.votes / counts.responses` when responses > 0.
- Snapshot as-of shown when present; status/grand total removed from overview to reduce noise.

Filtering & Guards
- Raw rows are filtered to allowed options (from `meta.optionTotals` or question options).
- `buildOptionSeries` defaults to strict filtering; orphans included only when `includeOrphans=true`.
- On question change, state resets (`meta`, `rawRows`, `filteredIds`, `nextCursor`, `error`) to avoid cross-question bleed.
- If a results payload `questionId` mismatches the requested id, designer logs a warning and surfaces an error instead of mixing data.

Styling Touchpoints
- `client/src/pages/designer/surveyResults.css`: panel headers, toggles, tooltip styling.
- `client/src/components/results/moveVis/moveVis.css`: Breakdown panel spacing, toolbar styles.
- Submitter results import the same CSS for toggles/headers.

Testing
- Designer results tests: `src/pages/designer/__tests__/SurveyResultsPage.test.tsx` (stubs visualization components, seeds questions via `fetchSampleQuestions` fulfilled action).
- Filtering logic: `src/components/results/__tests__/utils.buildOptionSeries.test.ts`.
- For approval dots-default assertions, synchronize on dots toggle active state before checking dots output.

Recent Changes (session highlights)
- Added header info tooltip; renamed header to “Question Results”.
- Added/cleaned metrics: options count, credits per person, max votes floor(sqrt), avg votes per person; removed status/grand total from overview.
- Tightened filtering guard on mismatched payload questionId.
- Standardized toolbar toggles and panel spacing across Results/Breakdown.
- For approval totals, bar-chart axis now starts at `0` (non-negative mode) while QV keeps symmetric signed axis behavior.
- Refactor Breakdown panel chart titles (Dots, Histogram) to use a shared `.scrollable-labels` class to avoid overflowing. Histogram title moved from Vega canvas to HTML to allow shared styling. The scroll defaults to the right end (where Var, Range appears).

Breakdown Ordering (new)
- Breakdown toolbar includes an “Order by” selector (Default / Variance / Range) that reorders the linked results visuals (bar chart, table, breakdown).
