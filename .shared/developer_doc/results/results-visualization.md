Results Visualization (Designer & Submitter)
============================================

Overview
- The results views show aggregates and visuals for a selected question. There are three main panels: Survey Overview (designer only), Results (option totals), and Breakdown (visual insights).
- For QV questions, visuals include a bar chart for totals and a dots/histogram toggle for distributions.
- Likert and Selection reuse the totals bar chart + table toggle (no breakdown panel).
- Text shows raw responses (no chart).
- Text Block questions are excluded from results.
- For Approval questions, the Results panel supports `Dots / Chart / Table` modes. Breakdown panel is not used.
- Data flow (happy path):
  1) Designer fetches all pages from `/protected/surveys/:surveyId/results?questionId=...` (loop until `nextCursor` is null).
  2) Raw rows are filtered to allowed optionIds (from `meta.optionTotals` or question options).
  3) `buildOptionSeries` produces series for charts (strict by default).
  4) Option Totals: chart/table toggle renders filtered totals.
  5) Breakdown: Visual Insights renders dots/histogram per option.
  6) Overview metrics computed from `meta` and question metadata.

Key Components
- `client/src/pages/designer/SurveyResultsPage.tsx`
  - Designer results entry point; fetches results via `/protected/surveys/:surveyId/results?questionId=...`.
  - Renders:
    - Survey Overview: responses, options count, credits per person, max votes per option (floor(sqrt(totalCredits))), avg votes per person.
    - Results: option totals by type-specific modes (QV chart/table, approval dots/chart/table, etc.); filters raw rows to allowed options.
    - Breakdown: Visual Insights panel (dots/histogram toggle) for QV only.
  - Tooltips: header shows an info icon with survey/question IDs via CSS tooltip.
  - Guards mismatched payloads: if `meta.questionId` differs from requested, logs a warning, sets an error, and stops pagination.
  - Resets state on question change to avoid cross-question bleed (`meta`, `rawRows`, `filteredIds`, `nextCursor`, `error`).
- `client/src/pages/survey/components/SubmittedResultsSection.tsx`
  - Submitter results; reuses the same Results and Breakdown panels with the toolbar toggles.
- `client/src/components/results/ResultsVisualizationPanel.tsx`
  - Dots/histogram toggle (two-button toolbar). Dots view uses scatter plot; histogram shows distributions.
  - Filters respect `optionSeries` and `filteredIds`; reset clears selections.
- `client/src/components/results/OptionTotalsBarChart.tsx`
  - Shared totals bar chart with filtered overlays.
  - Axis behavior is explicit by mode:
    - `symmetric` (default) for signed vote systems (QV/QS), domain `[-max, +max]`.
    - `nonNegative` for approval totals, domain `[0, max]` so bars start at zero.
- `client/src/components/results/ApprovalStickerStackChart.tsx`
  - Approval-only dots visualization used in both designer and submitter results.
- `client/src/components/results/utils.ts`
  - `buildOptionSeries` defaults to strict filtering: only optionIds present in `meta.optionTotals` unless `includeOrphans=true`.

Approval Results
- Shape: aggregated approvals per option, no bins/categories. Expect `{ optionId, optionName?, sum }` from the backend (where `sum` is the approval count), with `meta` carrying `optionTotals` similarly to QV/Likert.
- Visualization:
  - `Dots`: `ApprovalStickerStackChart`.
  - `Chart`: `OptionTotalsBarChart` with `axisMode='nonNegative'`.
  - `Table`: per-option counts.
  - Sorting: total-vote descending with original-option-order tie-break.
  - Default results mode for approval is `Dots` (non-approval defaults to `Chart`).
  - Breakdown panel is skipped/hidden for approval.
  - Empty state follows the same “No responses yet.” results-card treatment.
  - Chart axis mode is always non-negative (`[0, max]`).
  - Designer warning: when raw approval rows indicate any respondent exceeded current effective K, show a warning banner but keep totals unchanged (legacy data is not rewritten).
- Integration:
  - Detect `question.type === 'approval'` and route results rendering through approval-specific mode branches.
  - Submitter view shares the same semantics and toggle model (`Dots / Chart / Table`).
  - Approval chart axis must remain `nonNegative` so the chart starts at `0`.

Selection Results
-----------------
- Selection uses the same Results card as Likert but with **per‑option counts**.
- Table view shows counts and percentages relative to respondent count.
- Chart view uses `OptionTotalsBarChart` without breakdown visuals.

Text Block Results
------------------
- Text block questions (`type: 'text_block'`) are non‑answerable and **excluded** from results.

Data/Filtering Invariants
- Allowed options come from `meta.optionTotals` (and question options when present); raw rows are filtered to this set before building series.
- Mismatched question payloads are guarded: designer page logs and surfaces an error if `meta.questionId` differs from the requested `questionId`.
- State resets on question change (`meta`, `rawRows`, `filteredIds`, `nextCursor`, `error`) to avoid cross-question bleed.
- Pagination: Results page requests set `limit` and follow `nextCursor` until null; guards stop if mismatch or error.

Participant Results Visibility
- Public submitted-results endpoints are server-gated in `server/src/response/user-response.service.ts`.
- `survey.settings.respondentsCanViewResults === false` blocks participant snapshot and aggregate endpoints with 403. Missing survey settings remain backward compatible and are treated as enabled.
- `question.respondentResultsEnabled === false` blocks participant aggregate access for that question with 403. Missing question settings are treated as enabled only for supported participant result types (`qv`, `qs`, `quadratic`, `likert`, `selection`, `approval`); unsupported question types return 403 for direct participant aggregate requests.
- The participant snapshot endpoint stays available when survey-level results are enabled, even if individual questions have participant aggregates disabled. Question-level gating applies to aggregate/plot requests.
- Participant completed-results requests should resolve stored `sKey`/`uKey` from the completed `SurveyResponse` identified by `uuid`; the participant UI should not pass `sKey`/`uKey` for completed-results requests.
- A completed-results question-catalog endpoint should curate the dropdown from the UUID's answered question mapping, current survey membership, supported question types, and current question-level visibility.
- Participant aggregate results must use the stored response `sKey` as the aggregate scope when present, and must reject unanswered `questionId` requests even when the question belongs to the survey.
- See `architecture/anonymous-capability-survey-flow.md` for the canonical anonymous capability model.

Credits/Max Votes
- `totalCredits` is read from the question (`question.totalCredits` or `question.setting.totalCredits`).
- Max votes per option = `floor(sqrt(totalCredits))`; avg votes per person = `counts.votes / counts.responses` when responses > 0.

Styling
- Shared header typography in `client/src/pages/designer/surveyResults.css` (`panel-overline`, `panel-title`, `panel-subtitle`, `info-pill` tooltip).
- The same CSS is imported in submitter results for consistent toggles/headers.

Testing Notes
- Designer tests mock `/protected/surveys/:id/results` and seed questions with `totalCredits` to exercise the max-votes metric.
- Strict filtering is covered by `src/components/results/__tests__/utils.buildOptionSeries.test.ts`.
- Designer page tests (`src/pages/designer/__tests__/SurveyResultsPage.test.tsx`) stub visualization components and seed questions via the fulfilled action for `fetchSampleQuestions`. When adding metrics, seed question fields (e.g., `totalCredits`) to avoid null UI values in tests.
- Approval dots-default tests should wait for the dots toggle to be active (`Show dots view`, `aria-pressed='true'`) before asserting dots-specific output.

Related Docs
- End-to-end approval behavior: `.shared/developer_doc/frontend/approval-voting.md`

Divergence Ordering (QV Breakdown)
- For variance/range ordering details (raw values, missing-as-zero, and alignment across panels), see:
  - `.codex/4_developer_doc/results/results-breakdown-divergence-ordering.md`
