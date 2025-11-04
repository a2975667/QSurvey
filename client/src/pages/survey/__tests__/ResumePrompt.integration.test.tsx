import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

jest.mock(
  'react-router-dom',
  () => ({
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useNavigate: () => jest.fn(),
    useParams: () => ({ id: 'survey-1' }),
  }),
  { virtual: true },
);

import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer, { startSurveySession } from '../../../features/unifiedResponsesSlice';
import SurveyView from '../SurveyView';

describe('Resume popup on mount', () => {
  it('shows resume link modal when flag is set and ids exist', () => {
    (global as any).localStorage?.setItem('qv_show_resume_popup', 'true');

    const store = configureStore({
      reducer: {
        metadata: metadataSlice.reducer,
        questions: questionsSlice.reducer,
        surveys: surveysSlice.reducer,
        unifiedResponses: unifiedResponsesReducer,
        auth: (s = { isAuthenticated: false, token: null, user: null }) => s,
      },
    });

    // Seed metadata and questions loaded
    store.dispatch({
      type: 'questions/fetchMetaData/fulfilled',
      payload: { _id: 'survey-1', surveyId: 'survey-1', settings: { isAvailable: true }, sKey: null, uKey: null, uuid: null, resumeUuid: null },
    });
    store.dispatch({ type: 'questions/fetchSampleQuestions/fulfilled', payload: [] });

    // Seed unified session identifiers (uuid)
    store.dispatch(startSurveySession({ surveyId: 'survey-1', surveyResponseId: 'resp-1', uuid: 'uuid-1' }));

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    const node = screen.getByTestId('resume-link');
    expect(node.textContent).toContain('/survey/survey-1');
    expect(node.textContent).toContain('uuid=uuid-1');
  });
});

