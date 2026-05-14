import { Types } from 'mongoose';
import { TextService } from './text.service';

describe('TextService.createTextQuestion', () => {
  it('saves the text question and updates the survey with the persisted _id', async () => {
    const userId = new Types.ObjectId();
    const surveyId = new Types.ObjectId();
    const existingId = new Types.ObjectId();
    const savedId = new Types.ObjectId();

    const textModel = jest.fn().mockImplementation((data: any) => {
      const doc = {
        ...data,
        _id: savedId,
        save: jest.fn().mockResolvedValue({ ...data, _id: savedId }),
      };
      return doc;
    });

    let capturedQuestions: string[] = [];
    const surveysService = {
      updateSurveyQuestionsById: jest.fn(
        async (_user: any, _survey: any, dto: any) => {
          capturedQuestions = (dto?.questions || []).map((q: any) =>
            q.toString(),
          );
          return {
            _id: surveyId,
            questions: dto?.questions ?? [],
          };
        },
      ),
    };

    const coreService = {
      getUserById: jest.fn().mockResolvedValue({ _id: userId }),
      getSurveyById: jest.fn().mockResolvedValue({
        _id: surveyId,
        questions: [existingId],
      }),
    };

    const coreLogicService = {
      validateSurveyOwnership: jest.fn().mockReturnValue(true),
    };

    const questionModel = {} as any;

    const service = new TextService(
      questionModel as any,
      textModel as any,
      surveysService as any,
      coreService as any,
      coreLogicService as any,
    );

    const dto: any = {
      type: 'text',
      question: 'text111',
      description: 'qqq123',
      multiline: false,
      maxLength: 500,
      surveyId,
    };

    const result = await service.createTextQuestion(userId, dto);

    expect(result._id.toString()).toBe(savedId.toString());
    expect(surveysService.updateSurveyQuestionsById).toHaveBeenCalledTimes(1);
    const [calledUserId, calledSurveyId] =
      surveysService.updateSurveyQuestionsById.mock.calls[0];
    expect(calledUserId.toString()).toBe(userId.toString());
    expect(calledSurveyId.toString()).toBe(surveyId.toString());
    // We at least propagated two question IDs into the survey update (existing + newly saved)
    expect(capturedQuestions.length).toBeGreaterThanOrEqual(2);
  });
});
