import reducer, { seedQvQuestion } from '../unifiedResponsesSlice';

describe('resume placement hydration', () => {
  it('reconstructs groups and positions from server maps when available', () => {
    // Start with initial reducer state
    let state = reducer(undefined, { type: '@@INIT' } as any);

    // Seed categories for qv1 so incoming groups are recognized
    state = reducer(
      state,
      seedQvQuestion({
        questionId: 'qv1',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [
          { optionId: 'o1', optionName: 'Alpha', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 },
          { optionId: 'o2', optionName: 'Beta', group: 'Undecided', groupPosition: 1, globalPosition: 1, votes: 0 },
        ],
      }),
    );

    // Simulate fetchSurveyResponseByUUID.fulfilled with placement maps
    const action = {
      type: 'options/fetchSurveyResponseByUUID/fulfilled',
      payload: {
        surveyResponse: { _id: 'resp-1', uuid: 'uuid-1' },
        questionResponses: [
          {
            questionId: 'qv1',
            responseContent: {
              votes: [
                { optionId: 'o1', optionName: 'Alpha', votes: 2 },
                { optionId: 'o2', optionName: 'Beta', votes: -1 },
              ],
              group: { o1: 'Positive', o2: 'Skip' },
              position: { o1: 3, o2: 1 },
              bins: {
                hasUndecided: true,
                hasSkip: true,
                userDefined: ['Positive', 'Neutral', 'Negative'],
              },
              categoriesOrder: ['Undecided', 'Positive', 'Neutral', 'Negative', 'Skip'],
              navigator: {
                order: ['qv1'],
                activeQuestionId: 'qv1',
                completed: ['qv1'],
              },
            },
          },
        ],
      },
      meta: {},
    } as any;

    state = reducer(state, action);

    const qv = state.byQuestionId['qv1'];
    expect(qv).toBeDefined();
    if (!qv || qv.type !== 'qv') throw new Error('expected qv state');

    // Groups reflect maps
    expect(qv.options['o1'].group).toBe('Positive');
    expect(qv.options['o2'].group).toBe('Skip');

    // Votes applied
    expect(qv.options['o1'].votes).toBe(2);
    expect(qv.options['o2'].votes).toBe(-1);

    // Buckets reflect provided order and include empty neutral slot
    expect(qv.categoriesOrder).toEqual(['Undecided', 'Positive', 'Neutral', 'Negative', 'Skip']);
    expect(qv.positionsByGroup['Positive']).toEqual(['o1']);
    expect(qv.positionsByGroup['Skip']).toEqual(['o2']);
    expect(qv.positionsByGroup['Neutral']).toEqual([]);

    expect(qv.bins.userDefined).toEqual(['Positive', 'Neutral', 'Negative']);

    // Navigator snapshot applied
    expect(state.qvNavigator.order).toEqual(['qv1']);
    expect(state.qvNavigator.completed).toEqual({ qv1: true });
    expect(state.qvNavigator.activeQuestionId).toBeUndefined();
  });
});
