Feature Idea: Strict K-Approval Mode (Exact K)
Owner: Product
Status: Medium (Not planned today)
Last Updated: 2026-03-01

Summary
Add an optional strict approval mode where respondents must select exactly `K` options (instead of the current up-to-`K` behavior).

Motivation
- Some use cases require fixed-size shortlists rather than flexible support counts.
- Exact-K can improve comparability across respondents when every response carries the same number of approvals.

Current Baseline
- Approval currently uses restricted up-to-`K` semantics:
  - Unlimited mode, custom `maxApprovals`, or default `max(3, ceil(optionCount / 4))`.
  - Backend rejects over-cap payloads; zero approvals are still allowed.

Proposed Behavior (Future)
- Add a designer-configurable strict mode toggle for approval questions.
- When strict mode is enabled:
  - Respondent must submit exactly `K` approvals.
  - Under-selection (`< K`) and over-selection (`> K`) are both invalid.
  - Submission should show actionable validation messaging in the toolbar/submit flow.

High-Level Impact
- Frontend authoring (`SurveyEdit`):
  - Add strict-mode control and validation copy.
- Respondent UI (`ApprovalSurveyPage`):
  - Enforce exact-K on submit and interaction.
  - Update counter/help text for exact requirement.
- Backend validation (`UserResponseService`):
  - Add exact-K enforcement branch (not only max cap).
  - Return deterministic error code/message for under/over in strict mode.
- Results/docs:
  - Clarify strict-mode semantics in developer docs and product documentation.

Non-Goals
- Implement strict mode now.
- Change current up-to-`K` behavior in existing surveys by default.

Open Questions
- Should strict mode allow a designer override for zero (`K=0`)?
- If options are edited after responses exist, how should strict-mode validity be reported for legacy responses?
- Should strict mode be available together with unlimited mode, or mutually exclusive in authoring UI?

Notes
- This is a feature idea only and is explicitly **not planned today**.
