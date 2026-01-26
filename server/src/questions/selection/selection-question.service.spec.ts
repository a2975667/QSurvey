import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SelectionQuestionService } from './selection-question.service';

describe('SelectionQuestionService', () => {
  const createService = () => {
    const selectionQuestionModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...data }),
    }));
    selectionQuestionModel.findById = jest.fn();
    selectionQuestionModel.findByIdAndUpdate = jest.fn();

    const coreService: any = {
      getUserById: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      getSurveyById: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        questions: [],
      }),
    };
    const coreLogicService: any = {
      validateSurveyOwnership: jest.fn(),
      fixQVOptionID: jest.fn((options: any[]) => options),
    };
    const surveysService: any = {
      updateSurveyQuestionsById: jest.fn(),
    };

    const questionModel: any = {};

    const service = new SelectionQuestionService(
      questionModel,
      selectionQuestionModel,
      surveysService,
      coreService,
      coreLogicService,
    );

    return { service, selectionQuestionModel };
  };

  it('rejects multi-select when minSelections exceeds maxSelections', async () => {
    const { service } = createService();
    const surveyId = new Types.ObjectId();

    await expect(
      service.createSelectionQuestion(new Types.ObjectId(), {
        surveyId,
        question: 'Pick some',
        options: [{ optionName: 'A' }, { optionName: 'B' }],
        selectionMode: 'multi',
        displayControl: 'checkbox',
        minSelections: 3,
        maxSelections: 1,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects auto displayControl without threshold', async () => {
    const { service } = createService();
    const surveyId = new Types.ObjectId();

    await expect(
      service.createSelectionQuestion(new Types.ObjectId(), {
        surveyId,
        question: 'Pick one',
        options: [{ optionName: 'A' }, { optionName: 'B' }],
        selectionMode: 'single',
        displayControl: 'auto',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forces checkbox control for multi-select questions', async () => {
    const { service } = createService();
    const surveyId = new Types.ObjectId();

    const saved = await service.createSelectionQuestion(new Types.ObjectId(), {
      surveyId,
      question: 'Pick many',
      options: [{ optionName: 'A' }, { optionName: 'B' }],
      selectionMode: 'multi',
      displayControl: 'dropdown',
    } as any);

    expect(saved.displayControl).toBe('checkbox');
  });
});
