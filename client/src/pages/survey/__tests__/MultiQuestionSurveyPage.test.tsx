import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import MultiQuestionSurveyPage from '../components/MultiQuestionSurveyPage';
import metadataSlice from '../../../features/metadataSlice';
import qsOptionsSlice from '../../../features/qsOptionsSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';

jest.mock(
  'react-router-dom',
  () => ({
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  }),
  { virtual: true },
);

const buildStore = () => {
  const metadataState = metadataSlice.reducer(undefined, { type: '@@INIT' });
  const qsOptionsState = qsOptionsSlice.reducer(undefined, { type: '@@INIT' });
  const surveysState = surveysSlice.reducer(undefined, { type: '@@INIT' });
  const unifiedState = unifiedResponsesReducer(undefined, { type: '@@INIT' });

  const questionsState = {
    loaded: true,
    byId: {
      q1: {
        questionId: 'q1',
        type: 'likert',
        question: 'How satisfied are you?',
        description: '',
        status: 'Incomplete',
        position: 0,
        scale: ['1', '2', '3', '4', '5'],
        minLabel: 'Low',
        maxLabel: 'High',
      },
      q2: {
        questionId: 'q2',
        type: 'text',
        question: 'Any additional feedback?',
        description: '',
        status: 'Incomplete',
        position: 1,
        multiline: false,
        maxLength: 120,
      },
    },
  };

  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      qsOptions: qsOptionsSlice.reducer,
      questions: questionsSlice.reducer,
      auth: (state = { isAuthenticated: false }) => state,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
    },
    preloadedState: {
      metadata: metadataState,
      qsOptions: qsOptionsState,
      questions: questionsState,
      auth: { isAuthenticated: false },
      surveys: surveysState,
      unifiedResponses: unifiedState,
    },
  });
};

describe('MultiQuestionSurveyPage', () => {
  it('enables submission once non-QV questions are answered', async () => {
    const store = buildStore();
    const onSubmit = jest.fn();

    render(
      <Provider store={store}>
        <MultiQuestionSurveyPage onSubmit={onSubmit} />
      </Provider>,
    );

    const submitButton = screen.getByRole('button', { name: /submit responses/i });
    expect(submitButton).toBeDisabled();

    const likertOption = screen.getByLabelText('3');
    await act(async () => {
      fireEvent.click(likertOption);
    });

    const textInput = screen.getByPlaceholderText('Type your answer here...');
    await act(async () => {
      fireEvent.change(textInput, { target: { value: 'Looks great!' } });
    });

    expect(submitButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
