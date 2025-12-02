import { Types } from 'mongoose';
import { LikertService } from './likert.service';

describe('LikertService.createLikertQuestion', () => {
  it('saves the likert question and updates the survey with the persisted _id', async () => {
    const userId = new Types.ObjectId();
    const surveyId = new Types.ObjectId();
    const existingId = new Types.ObjectId();
    const savedId = new Types.ObjectId();

    const likertModel = jest.fn().mockImplementation((data: any) => {
      const doc = {
        ...data,
        _id: savedId,
        save: jest.fn().mockResolvedValue({ ...data, _id: savedId }),
      };
      return doc;
    });

    let capturedQuestions: string[] = [];
    const surveysService = {
      updateSurveyQuestionsById: jest.fn(async (_user: any, _survey: any, dto: any) => {
        capturedQuestions = (dto?.questions || []).map((q: any) => q.toString());
        return {
          _id: surveyId,
          questions: dto?.questions ?? [],
        };
      }),
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

    const service = new LikertService(
      questionModel as any,
      likertModel as any,
      surveysService as any,
      coreService as any,
      coreLogicService as any,
    );

    const dto: any = {
      type: 'likert',
      question: 'Likert 123',
      description: '',
      scale: ['1', '2', '3', '4', '5'],
      minLabel: 'Strongly Disagree',
      maxLabel: 'Strongly Agree',
      surveyId,
    };

    const result = await service.createLikertQuestion(userId, dto);

    expect(result._id.toString()).toBe(savedId.toString());
    expect(surveysService.updateSurveyQuestionsById).toHaveBeenCalledTimes(1);
    const [calledUserId, calledSurveyId] =
      surveysService.updateSurveyQuestionsById.mock.calls[0];
    expect(calledUserId.toString()).toBe(userId.toString());
    expect(calledSurveyId.toString()).toBe(surveyId.toString());

    // Expect both the existing question and the newly saved Likert ID to be present
    expect(capturedQuestions).toContain(existingId.toString());
    expect(capturedQuestions).toContain(savedId.toString());
  });
});

