# Goals to Address

From recent discussions, the following areas require improvement before the project can be considered an MVP:

1. **Support Multiple Questions**
   - The UI currently shows only the first question in the survey. We need a way to store an ordered list of questions and navigate between them.
   - Update the Redux slices and `TestPage` to manage `currentQuestionId` and provide navigation (next/previous or by URL).

2. **Simplify Redux Event Logging**
   - The `eventRecorderMiddleware` logs cursor distance, click counts, and state diffs, creating very verbose state changes.
   - Consider removing or replacing it with a simpler logger, or guard it behind a feature flag so normal development flow is easier to trace.

3. **Refactor State Structure**
   - Question and option data are stored in separate slices with some redundant fields. Consolidate or normalize state to reduce complexity.
   - Evaluate whether grouping/position data belongs with options or in a dedicated slice.

4. **Re‑enable a Survey Editing Page**
   - A page for editing surveys (adding questions/options) is currently missing. Reintroducing this feature would allow easier management without manual API calls.

Addressing these goals will make the codebase easier to maintain and provide a more complete user experience.
