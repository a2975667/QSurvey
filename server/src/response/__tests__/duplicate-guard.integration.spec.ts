import { ConflictException } from '@nestjs/common';
import { model, Types } from 'mongoose';
import { CoreService } from '../../core/core.service';
import { SurveySchema } from '../../schemas/survey.schema';
import {
  id,
  responseFixture as fixture,
} from '../../../test/participant-response.fixture';

describe('Anonymous response ownership and retryable writes', () => {
  it('creates, resumes, edits, batch-saves, removes and completes only its own answers', async () => {
    const f = fixture();
    const { context, questionResponse } = await f.start();
    expect(questionResponse.surveyResponseId).toBe(context.surveyResponseId);
    const resumed = await f.controller.getPreviousResponse(context);
    expect(resumed.questionResponses).toEqual([
      expect.objectContaining({ _id: questionResponse._id }),
    ]);
    const retry = await f.controller.createResponse({
      ...f.input(),
      ...context,
      navigator: { order: [f.first] },
    });
    expect(retry.questionResponse._id).toBe(questionResponse._id);
    expect(retry.surveyResponse.qvNavigator.order).toEqual([f.first]);
    const updated = await f.controller.updateResponse({
      ...f.input(f.first, 'edited'),
      ...context,
      questionResponseId: questionResponse._id,
    });
    expect(updated['responseContent']).toEqual({ text: 'edited' });
    const batch = await f.controller.createBatchResponses({
      ...context,
      responses: [f.input(), f.input(f.second), f.input(f.block)],
    });
    expect(batch.questionResponses).toHaveLength(2);
    expect(f.children.rows.size).toBe(2);
    await f.controller.deleteResponse({
      ...context,
      questionId: f.second,
      questionResponseId: batch.questionResponses[1]._id,
    });
    expect(f.children.rows.size).toBe(1);
    const completed = await f.controller.completeSurvey(context);
    expect(completed.status).toBe('Complete');
    expect(f.children.rows.get(questionResponse._id)).not.toHaveProperty(
      'expireCountdown',
    );
    expect(f.questions.rows.get(f.first).responses).toEqual([
      questionResponse._id,
    ]);
    await expect(f.controller.completeSurvey(context)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it.each([
    ['BSON ObjectId', (key: string) => new Types.ObjectId(key)],
    ['populated question', (key: string) => ({ _id: new Types.ObjectId(key) })],
  ] as const)(
    'accepts an authorized question stored as a %s',
    async (_shape, storedRef) => {
      const f = fixture();
      f.surveys.get(f.surveyId).questions = [storedRef(f.first) as any];
      const a = await f.start();
      expect(a.questionResponse.questionId).toBe(f.first);
      expect((await f.controller.completeSurvey(a.context)).status).toBe(
        'Complete',
      );
    },
  );

  it('resumes, edits and indexes a historical question ID while ignoring unrelated malformed survey references', async () => {
    const f = fixture();
    const historicalId = { $oid: f.first.toUpperCase() };
    const survey = f.surveys.get(f.surveyId);
    survey.questions = ['invalid-reference', historicalId as any, f.second];
    const surveyModel = model('ParticipantLegacySurveyRead', SurveySchema);
    const query = {
      exec: async () => surveyModel.hydrate(survey),
      lean: () => ({ exec: async () => survey }),
    };
    f.core.getSurveyById = CoreService.prototype.getSurveyById.bind({
      surveyModel: { findById: () => query },
    });
    expect((await f.core.getSurveyById(f.surveyId)).questions).toBeUndefined();
    const { context, questionResponse } = await f.start();
    const stored = f.children.rows.get(questionResponse._id);
    stored.questionId = historicalId;

    const resumed = await f.controller.getPreviousResponse(context);
    expect(resumed.questionResponses[0]).toMatchObject({ questionId: f.first });
    const batch = await f.controller.createBatchResponses({
      ...context,
      responses: [f.input(f.first, 'batch edit')],
    });
    expect(batch.questionResponses).toEqual([
      expect.objectContaining({
        _id: questionResponse._id,
        questionId: f.first,
        responseContent: { text: 'batch edit' },
      }),
    ]);
    stored.questionId = historicalId;
    const edited = await f.controller.updateResponse({
      ...context,
      ...f.input(f.first, 'single edit'),
      questionResponseId: questionResponse._id,
    });
    expect(edited).toMatchObject({
      questionId: f.first,
      responseContent: { text: 'single edit' },
    });

    stored.questionId = historicalId;
    expect((await f.controller.completeSurvey(context)).status).toBe(
      'Complete',
    );
    expect(f.questions.rows.get(f.first).responses).toEqual([
      questionResponse._id,
    ]);
    expect(String(stored.questionId)).toBe(f.first);

    // Existing completed rows may still contain the historical spelling.
    stored.questionId = historicalId;
    f.questions.rows.get(f.first).type = 'likert';
    const params = { uuid: context.uuid };
    const queryParams = { surveyId: f.surveyId };
    const receipt = await f.controller.getCompletedSurveyResponse(
      params,
      queryParams,
    );
    expect(receipt.questionResponses[0].questionId).toBe(f.first);
    const catalog = await f.controller.getCompletedSurveyResultsQuestions(
      params,
      queryParams,
    );
    expect(catalog.questions).toEqual([
      expect.objectContaining({ questionId: f.first, position: 1 }),
    ]);
  });

  it('preserves text-block-only entry, add, update and batch behavior', async () => {
    const f = fixture();
    const { context, questionResponse } = await f.start(f.block);
    expect(questionResponse).toBeNull();
    expect(
      (await f.controller.createResponse({ ...f.input(f.block), ...context }))
        .questionResponse,
    ).toBeNull();
    expect(
      await f.controller.updateResponse({
        ...f.input(f.block),
        ...context,
        questionResponseId: id(),
      }),
    ).toBeNull();
    const batch = await f.controller.createBatchResponses({
      ...context,
      responses: [f.input(f.block)],
    });
    expect(batch.questionResponses).toEqual([]);
    expect(f.children.rows.size).toBe(0);
  });

  it('rejects mismatched parent, survey, question and child even when another participant exists', async () => {
    const f = fixture();
    const a = await f.start();
    const b = await f.start();
    const foreignChild = b.questionResponse._id;
    const before = f.snapshot();
    const mixedParent = {
      ...a.context,
      surveyResponseId: b.context.surveyResponseId,
    };
    for (const attempt of [
      () => f.controller.createResponse({ ...f.input(), ...mixedParent }),
      () =>
        f.controller.createBatchResponses({
          ...mixedParent,
          responses: [f.input()],
        }),
      () => f.controller.completeSurvey(mixedParent),
      () =>
        f.controller.completeSurvey({
          ...a.context,
          surveyId: f.otherSurveyId,
        }),
      () =>
        f.controller.updateResponse({
          ...f.input(),
          ...a.context,
          questionResponseId: foreignChild,
        }),
      () =>
        f.controller.deleteResponse({
          ...a.context,
          questionId: f.first,
          questionResponseId: foreignChild,
        }),
      () =>
        f.controller.updateResponse({
          ...f.input(f.second),
          ...a.context,
          questionResponseId: a.questionResponse._id,
        }),
      () =>
        f.controller.deleteResponse({
          ...a.context,
          questionId: f.second,
          questionResponseId: a.questionResponse._id,
        }),
      () =>
        f.controller.createResponse({ ...f.input(f.foreign), ...a.context }),
      () => f.controller.createResponse(f.input(f.foreign)),
      () =>
        f.controller.createBatchResponses({
          ...a.context,
          responses: [f.input(f.first, 'changed'), f.input(f.foreign)],
        }),
      () =>
        f.controller.createBatchResponses({
          surveyId: f.surveyId,
          responses: [f.input(), f.input(f.foreign)],
        } as any),
      () =>
        f.controller.createBatchResponses({
          surveyId: f.surveyId,
          surveyResponseId: b.context.surveyResponseId,
          responses: [f.input()],
        } as any),
    ]) {
      await expect(attempt()).rejects.toThrow();
      expect(f.snapshot()).toEqual(before);
    }
  });

  it('rejects a later invalid answer without writing an earlier valid answer', async () => {
    const f = fixture();
    const a = await f.start();
    Object.assign(f.questions.rows.get(f.second), {
      type: 'approval',
      maxApprovals: 1,
      unlimitedApprovals: false,
      options: [{ optionId: 'a' }, { optionId: 'b' }],
    });
    const before = f.snapshot();
    const responses = [
      f.input(f.first, 'revised'),
      { questionId: f.second, responseContent: { approvals: ['a', 'b'] } },
    ];
    await expect(
      f.controller.createBatchResponses({ ...a.context, responses }),
    ).rejects.toThrow('Too many approvals');
    await expect(
      f.controller.createBatchResponses({
        surveyId: f.surveyId,
        responses,
      } as any),
    ).rejects.toThrow('Too many approvals');
    expect(f.snapshot()).toEqual(before);
  });

  it('restores the parent link when deleting an owned child fails before deletion', async () => {
    const f = fixture();
    const a = await f.start();
    const before = f.snapshot();
    f.children.model.deleteOne.mockReturnValueOnce({
      exec: async () => {
        throw new Error('temporary deletion failure');
      },
    });
    const dto = {
      ...a.context,
      questionId: f.first,
      questionResponseId: a.questionResponse._id,
    };
    await expect(f.controller.deleteResponse(dto)).rejects.toThrow(
      'temporary deletion failure',
    );
    expect(f.snapshot()).toEqual(before);
    await f.controller.deleteResponse(dto);
    expect(f.children.rows.size).toBe(0);
  });

  it('can start an answer list on a legacy response with a missing array', async () => {
    const f = fixture();
    const a = await f.start(f.block);
    delete f.parents.rows.get(a.context.surveyResponseId).questionResponses;
    const result = await f.controller.createResponse({
      ...a.context,
      ...f.input(),
    });
    expect(
      f.parents.rows.get(a.context.surveyResponseId).questionResponses,
    ).toEqual([result.questionResponse._id]);
  });

  it('completes after a question is detached without writing to its remaining survey', async () => {
    const f = fixture();
    const { context, questionResponse } = await f.start();
    f.surveys.get(f.otherSurveyId).questions.push(f.first);
    const current = await f.controller.createResponse({
      ...context,
      ...f.input(f.second),
    });
    f.surveys.get(f.surveyId).questions = [f.second];
    f.parents.rows.get(context.surveyResponseId).questionResponses.push(id());
    expect(
      (await f.controller.getPreviousResponse(context)).questionResponses,
    ).toHaveLength(2);
    const completed = await f.controller.completeSurvey(context);
    expect(completed.status).toBe('Complete');
    expect(completed.questionResponses).toEqual([
      questionResponse._id,
      current.questionResponse._id,
    ]);
    expect(f.children.rows.get(questionResponse._id)).not.toHaveProperty(
      'expireCountdown',
    );
    expect(f.questions.rows.get(f.first).responses).toEqual([]);
    expect(f.questions.rows.get(f.second).responses).toEqual([
      current.questionResponse._id,
    ]);
  });

  it('can remove its own detached answer while new answers and edits still require membership', async () => {
    const f = fixture();
    const { context, questionResponse } = await f.start();
    f.surveys.get(f.surveyId).questions = [f.second];
    const dto = {
      ...f.input(),
      ...context,
      questionResponseId: questionResponse._id,
    };
    await expect(f.controller.createResponse(dto)).rejects.toThrow();
    await expect(f.controller.updateResponse(dto)).rejects.toThrow();
    await f.controller.deleteResponse(dto);
    expect(f.children.rows.size).toBe(0);
  });

  it('resumes and changes a valid answer beside missing, foreign and ambiguous children', async () => {
    const f = fixture();
    const a = await f.start();
    const b = await f.start(f.second);
    const legacyId = id();
    f.children.rows.set(legacyId, { _id: legacyId, questionId: f.second });
    f.parents.rows
      .get(b.context.surveyResponseId)
      .questionResponses.push(legacyId.toUpperCase());
    f.parents.rows
      .get(a.context.surveyResponseId)
      .questionResponses.push(
        'malformed-reference',
        id(),
        b.questionResponse._id,
        legacyId,
      );
    const otherRows = structuredClone(
      [...f.children.rows].filter(([key]) => key !== a.questionResponse._id),
    );

    expect(
      (await f.controller.getPreviousResponse(a.context)).questionResponses,
    ).toEqual([expect.objectContaining({ _id: a.questionResponse._id })]);
    const dto = {
      ...a.context,
      ...f.input(),
      questionResponseId: a.questionResponse._id,
    };
    await f.controller.updateResponse(dto);
    const batch = await f.controller.createBatchResponses({
      ...a.context,
      responses: [f.input(f.first, 'revised')],
    });
    expect(batch.questionResponses[0]._id).toBe(a.questionResponse._id);
    expect(f.children.model.find.mock.calls.at(-1)[0]._id.$in).not.toContain(
      'malformed-reference',
    );
    await expect(
      f.controller.createBatchResponses({
        ...a.context,
        responses: [f.input(f.second)],
      }),
    ).rejects.toThrow();
    await f.controller.deleteResponse(dto);
    expect([...f.children.rows]).toEqual(otherRows);
  });

  it('withholds a stale foreign link from a completed receipt and its question catalog', async () => {
    const f = fixture();
    const a = await f.start();
    const b = await f.start(f.second);
    await f.controller.completeSurvey(b.context);
    f.questions.rows.get(f.first).type = 'likert';
    f.questions.rows.get(f.second).type = 'likert';
    const edit = {
      ...a.context,
      ...f.input(f.first, 'revised'),
      questionResponseId: a.questionResponse._id,
    };
    await f.controller.updateResponse(edit);
    const legacyId = id();
    f.children.rows.set(legacyId, { _id: legacyId, questionId: f.first });
    f.parents.rows
      .get(a.context.surveyResponseId)
      .questionResponses.push(legacyId);
    f.parents.rows
      .get(b.context.surveyResponseId)
      .questionResponses.push(legacyId);
    f.parents.rows
      .get(b.context.surveyResponseId)
      .questionResponses.push(a.questionResponse._id);
    await expect(f.controller.updateResponse(edit)).rejects.toThrow(
      'ownership',
    );
    await expect(f.controller.completeSurvey(a.context)).rejects.toThrow(
      'ownership',
    );
    expect(
      (await f.controller.getPreviousResponse(a.context)).questionResponses,
    ).toHaveLength(1);
    const params = { uuid: b.context.uuid };
    const query = { surveyId: f.surveyId };
    const receipt = await f.controller.getCompletedSurveyResponse(
      params,
      query,
    );
    expect(receipt.questionResponses.map((answer) => answer._id)).toEqual([
      b.questionResponse._id,
    ]);
    const catalog = await f.controller.getCompletedSurveyResultsQuestions(
      params,
      query,
    );
    expect(catalog.questions.map((question) => question.questionId)).toEqual([
      f.second,
    ]);
  });

  it.each(['answer', 'text block'])(
    'returns the resume credential for a confirmed initial %s save',
    async (mode) => {
      const f = fixture();
      Object.assign(f.surveys.get(f.surveyId).settings, { hasUKey: true });
      const save = f.parents.model.prototype.save;
      jest
        .spyOn(f.parents.model.prototype, 'save')
        .mockImplementationOnce(async function (this: any) {
          await save.call(this);
          throw new Error('acknowledgement lost');
        });
      const dto = {
        ...f.input(mode === 'answer' ? f.first : f.block),
        uKey: 'invitation',
      };
      const created = await f.controller.createResponse(dto);
      expect(created.surveyResponse.uuid).toEqual(expect.any(String));
      expect(f.parents.rows.size).toBe(1);
      expect(f.children.rows.size).toBe(mode === 'answer' ? 1 : 0);
      const resumed = await f.controller.getPreviousResponse({
        uuid: created.surveyResponse.uuid,
        surveyId: f.surveyId,
        uKey: dto.uKey,
      } as any);
      expect(resumed._id).toBe(created.surveyResponse._id);
      await expect(f.controller.createResponse(dto)).rejects.toThrow();
    },
  );

  it('keeps staged children when an unconfirmed initial write can still commit', async () => {
    const f = fixture();
    let delayedWrite: () => Promise<any>;
    const save = f.parents.model.prototype.save;
    jest
      .spyOn(f.parents.model.prototype, 'save')
      .mockImplementationOnce(async function (this: any) {
        delayedWrite = () => save.call(this);
        throw new Error('acknowledgement lost');
      });
    await expect(f.controller.createResponse(f.input())).rejects.toThrow(
      'acknowledgement lost',
    );
    const persisted = await delayedWrite();
    expect(
      f.children.rows.get(persisted.questionResponses[0]).surveyResponseId,
    ).toBe(persisted._id);
  });

  it('validates the original survey entry and resume keys', async () => {
    const f = fixture();
    Object.assign(f.surveys.get(f.surveyId).settings, {
      hasSKey: true,
      sKeyValue: 'cohort',
      hasUKey: true,
    });
    const entry = { ...f.input(), sKey: 'cohort', uKey: 'invite' };
    await expect(
      f.controller.createResponse({ ...entry, sKey: 'wrong' }),
    ).rejects.toThrow();
    const { surveyResponse } = await f.controller.createResponse(entry);
    const before = f.snapshot();
    await expect(
      f.controller.createResponse({
        ...entry,
        uuid: surveyResponse.uuid,
        surveyResponseId: surveyResponse._id,
        uKey: 'wrong',
      }),
    ).rejects.toThrow();
    expect(f.snapshot()).toEqual(before);
  });

  it('uses and backfills an unambiguous legacy answer without creating another child', async () => {
    const f = fixture();
    const { context, questionResponse } = await f.start();
    delete f.children.rows.get(questionResponse._id).surveyResponseId;
    const result = await f.controller.createBatchResponses({
      ...context,
      responses: [f.input(f.first, 'old answer revised')],
    });
    expect(result.questionResponses[0]._id).toBe(questionResponse._id);
    expect(
      f.parents.rows.get(context.surveyResponseId).questionResponses,
    ).toEqual([questionResponse._id]);
    expect(f.children.rows.get(questionResponse._id).surveyResponseId).toBe(
      context.surveyResponseId,
    );
  });

  it.each(['conflicting back-reference', 'shared legacy reference'])(
    'rejects %s before any answer or completion write',
    async (mode) => {
      const f = fixture();
      const a = await f.start();
      const b = await f.start();
      if (mode === 'conflicting back-reference') {
        f.children.rows.get(a.questionResponse._id).surveyResponseId =
          b.context.surveyResponseId;
      } else {
        delete f.children.rows.get(a.questionResponse._id).surveyResponseId;
        f.parents.rows
          .get(b.context.surveyResponseId)
          .questionResponses.push(a.questionResponse._id);
      }
      const before = f.snapshot();
      expect(
        (await f.controller.getPreviousResponse(a.context)).questionResponses,
      ).toEqual([]);
      await expect(
        f.controller.createBatchResponses({
          ...a.context,
          responses: [f.input(f.second), f.input()],
        }),
      ).rejects.toThrow();
      await expect(f.controller.completeSurvey(a.context)).rejects.toThrow();
      expect(f.snapshot()).toEqual(before);
    },
  );

  it('cleans up an unlinked child if another save wins the parent update', async () => {
    const f = fixture();
    const a = await f.start();
    f.parents.model.findOneAndUpdate.mockReturnValueOnce({
      exec: async () => null,
    });
    const before = f.snapshot();
    await expect(
      f.controller.createResponse({ ...f.input(f.second), ...a.context }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(f.snapshot()).toEqual(before);
  });

  it('allows retry after a partial completion without duplicating the question answer index', async () => {
    const f = fixture();
    const a = await f.start();
    await f.controller.createResponse({ ...f.input(f.second), ...a.context });
    f.parents.model.findOneAndUpdate.mockReturnValueOnce({
      exec: async () => {
        throw new Error('temporary write failure');
      },
    });
    await expect(f.controller.completeSurvey(a.context)).rejects.toThrow(
      'temporary write failure',
    );
    expect(f.parents.rows.get(a.context.surveyResponseId).status).toBe(
      'Incomplete',
    );
    await f.controller.completeSurvey(a.context);
    expect(f.questions.rows.get(f.first).responses).toEqual([
      a.questionResponse._id,
    ]);
    expect(f.questions.rows.get(f.second).responses).toHaveLength(1);
  });
});
