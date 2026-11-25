import { Types } from 'mongoose';
import { TextService } from './text.service';

describe('TextService.createTextQuestion', () => {
  it('saves the text question and updates the survey with the persisted _id', async () => {
    const userId = new Types.ObjectId();
    const surveyId = new Types.ObjectId();
    const savedId = new Types.ObjectId();

    const textModel = jest.fn().mockImplementation((data: any) => {
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

    const service = new TextService(
      textModel as any,
      surveysService as any,
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
    expect(surveysService.saveNewSurveyQuestion).toHaveBeenCalledWith(
      userId, surveyId, expect.objectContaining({ _id: savedId }),
    );
  });
});
