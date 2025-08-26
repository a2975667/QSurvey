# Current State of the App

The project is a React/TypeScript application created with Create React App. Redux Toolkit is used for state management with slices for metadata, questions, and Quadratic Voting (QV) options. The app currently loads survey data from a backend API and renders a testing page for the QV survey.

Key points:
- **Loading Flow**: `App.tsx` fetches survey metadata and questions based on a `version` query parameter. Once questions are loaded, it initializes QV options.
- **Single Question Display**: `TestPage.tsx` currently selects only the first question (position `0`) to display, so multi-question surveys are not supported.
- **Complex Event Logging**: A custom middleware (`reduxRecorderMiddleware`) tracks mouse movement, click counts, and deep diffs of state on every action, storing logs in `localStorage`.
- **Option State**: QV options are normalized in `qvOptionsSlice` with positions and categories for drag-and-drop grouping and voting.
- **Components**: The `Category` and `CategoryColumn` components implement drag-and-drop reordering. Voting interactions update the option state with vote counts.
- **No Editing Page**: There is only a test page (`/pages/test-page`) for the survey UI; a survey editing page has been removed or disabled.

Overall the app provides an experimental interface for arranging and voting on survey options but lacks multi-question navigation and has heavy event tracking in the Redux middleware.
