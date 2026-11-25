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

    const surveysService = {
      saveNewSurveyQuestion: jest.fn(async (_user, _survey, question) => question.save()),
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
    expect(surveysService.saveNewSurveyQuestion).toHaveBeenCalledWith(
      userId, surveyId, expect.objectContaining({ _id: savedId }),
    );
  });
});
