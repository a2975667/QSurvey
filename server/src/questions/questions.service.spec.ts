import { Types } from 'mongoose';
import { QuestionsService } from './questions.service';

describe('QuestionsService.removeQuestionById', () => {
  it('updates survey.questions with filtered IDs (no regenerated ObjectIds)', async () => {
    const userId = new Types.ObjectId();
    const surveyId = new Types.ObjectId();
    const q1 = new Types.ObjectId();
    const q2 = new Types.ObjectId();
    const q3 = new Types.ObjectId();

    const questionModel = {
      findByIdAndRemove: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: q2 }),
      }),
    };

    let capturedQuestions: string[] = [];
    const surveysService = {
      updateSurveyQuestionsById: jest.fn(async (_user: any, _survey: any, dto: any) => {
        capturedQuestions = (dto?.questions || []).map((id: any) => id.toString());
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
        questions: [q1, q2, q3],
      }),
    };

    const coreLogicService = {
      validateSurveyOwnership: jest.fn().mockReturnValue(true),
      validateUserIsAdmin: jest.fn(),
      validateUserAccessBySurveyId: jest.fn(),
    };

    const service = new QuestionsService(
      questionModel as any,
      surveysService as any,
      coreService as any,
      coreLogicService as any,
    );

    const result = await service.removeQuestionById(userId, surveyId, q2);

    expect(surveysService.updateSurveyQuestionsById).toHaveBeenCalledTimes(1);
    const [calledUserId, calledSurveyId] =
      (surveysService.updateSurveyQuestionsById as jest.Mock).mock.calls[0];
    expect(calledUserId.toString()).toBe(userId.toString());
    expect(calledSurveyId.toString()).toBe(surveyId.toString());

    // The deleted question ID should be removed, others preserved
    expect(capturedQuestions).toEqual([q1.toString(), q3.toString()]);

    // Service returns the refreshed survey from coreService
    expect(result._id.toString()).toBe(surveyId.toString());
  });
});

