import { completeSurveySubmission } from '../submission';

describe('completeSurveySubmission 409 handling', () => {
  it('propagates duplicate submission metadata on 409', async () => {
    const dispatch = jest.fn().mockResolvedValue({
      type: 'options/completeSurveyResponse/rejected',
      payload: {
        status: 409,
        code: 'DUPLICATE_SUBMISSION',
        message: 'Duplicate submission',
      },
    });

    await expect(
      completeSurveySubmission({
        dispatch: dispatch as any,
        surveyId: 'survey-1',
        surveyResponseId: 'resp-1',
        uuid: 'uuid-1',
        metadata: { stateMetadata: { totalCredits: 10, remainingCredits: 0 } },
      }),
    ).rejects.toMatchObject({
      message: 'Duplicate submission',
      code: 'DUPLICATE_SUBMISSION',
    });

    // Thunk dispatched (function); exact action object type is not available here
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
