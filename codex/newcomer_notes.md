# Notes for Newcomers

Welcome to the QV System React frontend! Here are a few tips to get started:

## Project Layout
- `src/app` – Redux store configuration and hooks.
- `src/features` – Redux slices for metadata, questions, and QV options.
- `src/components` – Reusable UI components (drag-and-drop categories, summary panel, etc.).
- `src/pages/test-page` – The current test interface for running the survey.
- `src/types` – Shared TypeScript interfaces for backend and frontend data.

## Running the App
1. Install dependencies with `npm install`.
2. Start the development server with `npm start` (CRA default) and open `http://localhost:3000`.
3. Use a query string such as `?version=version1` to load a survey configuration.

## Understanding the Survey Flow
- `App.tsx` fetches metadata and questions based on the version selected. Once questions are loaded, `initQvOptions` initializes the option state.
- `TestPage` drives the UI: first a welcome screen, then an optional "organize" phase, and finally the voting phase with a summary.
- The `Category` component uses `react-beautiful-dnd` for drag-and-drop grouping of options.
- Votes are tracked in `qvOptionsSlice` and summarized by the `Summary` component.

## Things to Explore Next
- Review `reduxRecorderMiddleware.jsx` to see how user events are logged. This middleware attaches timestamps and state diffs to each action.
- Check the `qvOptionsSlice` reducers such as `updateOptionPosition` and `regroupAndOrderOptions` for how option state is updated during drag-and-drop and voting.
- Consider adding more automated tests (currently only a placeholder test in `App.test.tsx` exists).

Feel free to experiment with the test page, follow the code flow from components to Redux, and refer to the Goals document for planned improvements.
