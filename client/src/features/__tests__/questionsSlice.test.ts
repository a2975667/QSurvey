import questionsSlice, { fetchSampleQuestions } from '../questionsSlice';

describe('questionsSlice fetch lifecycle', () => {
  it('clears loadedSurveyId when fetchSampleQuestions is rejected', () => {
    const surveyId = 'survey-1';
    const requestId = 'req-1';

    const pendingState = questionsSlice.reducer(
      undefined,
      fetchSampleQuestions.pending(requestId, surveyId),
    );

    expect(pendingState.loaded).toBe(false);
    expect(pendingState.loadedSurveyId).toBe(surveyId);

    const rejectedState = questionsSlice.reducer(
      pendingState,
      fetchSampleQuestions.rejected(new Error('network fail'), requestId, surveyId),
    );

    expect(rejectedState.loaded).toBe(false);
    expect(rejectedState.loadedSurveyId).toBeUndefined();
  });
});
