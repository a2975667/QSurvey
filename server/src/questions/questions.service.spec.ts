import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ApprovalQuestionService } from './approval/approval-question.service';
import { LikertService } from './likert/likert.service';
import { QuestionsService } from './questions.service';
import { QvService } from './qv/qv.service';
import { QvPlusService } from './qvplus/qvplus.service';
import { SelectionQuestionService } from './selection/selection-question.service';
import { TextService } from './text/text.service';
import { TextBlockService } from './textBlock/text-block.service';

describe('project-scoped question handlers', () => {
  const userId = new Types.ObjectId();
  const surveyId = new Types.ObjectId();
  const id = new Types.ObjectId();

  it('returns project metadata without the shared response ID list', async () => {
    const surveys = { authorizeSurveyQuestion: jest.fn() };
    const doc = { _id: id, question: 'Prompt', responses: ['foreign-answer'] };
    const core = { getQuestionById: jest.fn().mockResolvedValue({ toObject: () => ({ ...doc }) }) };
    const service = new QuestionsService({} as any, surveys as any, core as any, {} as any);
    expect(await service.getQuestionById(userId, surveyId, id)).toEqual({ _id: id, question: 'Prompt' });
    expect(doc.responses).toEqual(['foreign-answer']);
    expect(surveys.authorizeSurveyQuestion).toHaveBeenCalledWith(userId, surveyId, id, 'read');
    surveys.authorizeSurveyQuestion.mockRejectedValue(new NotFoundException());
    await expect(service.getQuestionById(userId, surveyId, id)).rejects.toBeInstanceOf(NotFoundException);
    expect(core.getQuestionById).toHaveBeenCalledTimes(1);
  });

  it('routes deletion through guarded detachment', async () => {
    const surveys = { removeSurveyQuestion: jest.fn().mockResolvedValue({ _id: surveyId }) };
    const service = new QuestionsService({} as any, surveys as any, {} as any, {} as any);
    expect(await service.removeQuestionById(userId, surveyId, id)).toEqual({ _id: surveyId });
    expect(surveys.removeSurveyQuestion).toHaveBeenCalledWith(userId, surveyId, id);
  });

  const cases = [
    [QvService, 'updateQVQuestionById'],
    [QvService, 'updateQVOptionsbyId'],
    [QvService, 'updateQVSettingsbyId'],
    [QvPlusService, 'updateQVPlusQuestionById'],
    [TextService, 'updateTextQuestionById'],
    [LikertService, 'updateLikertQuestionById'],
    [ApprovalQuestionService, 'updateApprovalQuestionById'],
    [SelectionQuestionService, 'updateSelectionQuestionById'],
    [TextBlockService, 'updateTextBlockQuestionById'],
  ] as const;

  it.each(cases)(
    'enforces the common edit boundary in %p.%s',
    async (Service, method) => {
      const model = { findByIdAndUpdate: jest.fn(), findById: jest.fn() };
      const surveys = {
        authorizeSurveyQuestion: jest
          .fn()
          .mockRejectedValue(new ConflictException()),
      };
      const logic = { fixQVOptionID: jest.fn().mockReturnValue([]) };
      const service = new (Service as any)(model, surveys, logic);
      await expect(
        service[method](userId, id, { surveyId, options: [] }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(surveys.authorizeSurveyQuestion).toHaveBeenCalledWith(
        userId,
        surveyId,
        id,
        'edit',
      );
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(model.findById).not.toHaveBeenCalled();
    },
  );
  it.each(cases)(
    'omits cross-project answer references from the edit result in %p.%s',
    async (Service, method) => {
      const stored = {
        _id: id,
        question: 'Prompt',
        responses: ['answer-from-detached-project'],
      };
      const model = {
        findById: () => ({
          exec: async () => ({
            ...stored,
            selectionMode: 'single',
            options: [],
          }),
        }),
        findByIdAndUpdate: jest.fn((_id, _update, options) => {
          const result =
            options.projection?.responses === 0
              ? { _id: id, question: 'Prompt' }
              : stored;
          const promise = Promise.resolve(result);
          return Object.assign(promise, { exec: () => promise });
        }),
      };
      const surveys = { authorizeSurveyQuestion: jest.fn() };
      const logic = { fixQVOptionID: (options) => options };
      const service = new (Service as any)(model, surveys, logic);
      const result = await service[method](userId, id, {
        surveyId,
        options: [],
      });
      expect(result).toEqual({ _id: id, question: 'Prompt' });
      expect(stored.responses).toEqual(['answer-from-detached-project']);
    },
  );

  const creators = [
    [QvService, 'createQVQuestion', true],
    [QvPlusService, 'createQVPlusQuestion', true],
    [TextService, 'createTextQuestion', false],
    [LikertService, 'createLikertQuestion', false],
    [ApprovalQuestionService, 'createApprovalQuestion', false],
    [SelectionQuestionService, 'createSelectionQuestion', false],
    [TextBlockService, 'createTextBlockQuestion', false],
  ] as const;

  it.each(creators)(
    'uses trusted creation in %p.%s',
    async (Service, method, positional) => {
      const model = jest.fn().mockImplementation((fields) => ({ ...fields }));
      const surveys = {
        saveNewSurveyQuestion: jest.fn(
          async (_user, _survey, question) => question,
        ),
      };
      const logic = { fixQVOptionID: (options) => options };
      const service = new (Service as any)(model, surveys, logic);
      const dto = {
        surveyId,
        question: 'Prompt',
        insertPosition: 2,
        options: [{ optionName: 'One' }],
      };
      await service[method](userId, dto);
      expect(surveys.saveNewSurveyQuestion).toHaveBeenCalledWith(
        userId,
        surveyId,
        expect.anything(),
        ...(positional ? [2] : []),
      );
    },
  );
});
