import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoreLogicService } from '../../core/core-logic.service';
import { UserResponseController } from '../user-response.controller';
import { UserResponseService } from '../user-response.service';

const id = () => new Types.ObjectId().toHexString();
const clone = <T>(doc: T): T => JSON.parse(JSON.stringify(doc));
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

// Execute the service's read/conditional-write predicates against synthetic documents.
// Record snapshots on read so concurrent mutations cannot modify previously read arrays.
function collection() {
  const rows = new Map<string, any>();
  function matches(row: any, filter: any) {
    return Object.entries(filter).every(([key, expression]: [string, any]) => {
      if (key === '$or')
        return expression.some((condition) => matches(row, condition));
      const value = row[key];
      if (expression?.$in) {
        const candidates = Array.isArray(value) ? value : [value];
        return candidates.some((candidate) =>
          expression.$in.some((item) => equal(item, candidate)),
        );
      }
      if (expression?.$ne !== undefined) return !equal(value, expression.$ne);
      if (expression === null) return value == null;
      return equal(value, expression);
    });
  }
  const find = (filter: any) =>
    [...rows.values()].find((row) => matches(row, filter));
  function update(filter: any, patch: any) {
    const row = find(filter);
    if (!row) return null;
    for (const key of Object.keys(patch)) {
      if (!key.startsWith('$')) row[key] = patch[key];
    }
    Object.assign(row, patch.$set);
    for (const key of Object.keys(patch.$unset ?? {})) delete row[key];
    for (const [key, values] of Object.entries<any>(patch.$push ?? {}))
      row[key].push(...values.$each);
    for (const [key, value] of Object.entries(patch.$addToSet ?? {})) {
      if (!row[key].includes(value)) row[key].push(value);
    }
    return clone(row);
  }
  const query = (read: () => unknown) => ({ exec: async () => read() });
  const model: any = class {
    _id = id();
    constructor(value: any) {
      Object.assign(this, value);
    }
    async save() {
      rows.set(this._id, clone(this));
      return clone(this);
    }
  };
  model.findOne = jest.fn((filter) => query(() => clone(find(filter) ?? null)));
  model.findById = jest.fn((key) => query(() => clone(rows.get(key) ?? null)));
  model.exists = jest.fn(async (filter) => Boolean(find(filter)));
  model.findOneAndUpdate = jest.fn((filter, patch) =>
    query(() => update(filter, patch)),
  );
  model.updateOne = jest.fn((filter, patch) =>
    query(() => update(filter, patch)),
  );
  model.findByIdAndUpdate = jest.fn(async (key, patch) =>
    update({ _id: key }, patch),
  );
  model.deleteOne = jest.fn((filter) =>
    query(() => {
      const row = find(filter);
      return { deletedCount: row && rows.delete(row._id) ? 1 : 0 };
    }),
  );
  model.deleteMany = jest.fn((filter) =>
    query(() => {
      for (const row of rows.values())
        if (matches(row, filter)) rows.delete(row._id);
    }),
  );
  return { model, rows };
}

function fixture() {
  const parents = collection();
  const children = collection();
  const questions = collection();
  const surveyId = id();
  const otherSurveyId = id();
  const first = id();
  const second = id();
  const block = id();
  const foreign = id();
  for (const q of [first, second, block, foreign]) {
    questions.rows.set(q, {
      _id: q,
      type: q === block ? 'text_block' : 'text',
      responses: [],
    });
  }
  const surveys = new Map([
    [
      surveyId,
      { questions: [first, second, block], settings: { isAvailable: true } },
    ],
    [otherSurveyId, { questions: [foreign], settings: { isAvailable: true } }],
  ]);
  const core: any = {
    getSurveyById: async (key) => surveys.get(String(key)),
    getQuestionById: async (key) => questions.rows.get(String(key)),
    getSurveyResponseByUUID: async (uuid) =>
      parents.model.findOne({ uuid }).exec(),
    getQuestionResponsesByManyIds: async (ids) =>
      [...children.rows.values()]
        .filter((answer) => ids.includes(answer._id))
        .map(clone),
  };
  const service = new UserResponseService(
    parents.model,
    children.model,
    questions.model,
    core,
    new CoreLogicService(core, {} as any),
    {} as any,
  );
  const controller = new UserResponseController(service);
  const input = (questionId = first, answer = 'first answer'): any => ({
    surveyId,
    questionId,
    responseContent: { text: answer },
  });
  const start = async (questionId = first) => {
    const { surveyResponse, questionResponse } =
      await controller.createResponse(input(questionId));
    const context: any = {
      uuid: surveyResponse.uuid,
      surveyId,
      surveyResponseId: surveyResponse._id,
    };
    return { context, questionResponse };
  };
  const snapshot = () =>
    clone([[...parents.rows], [...children.rows], [...questions.rows]]);
  return {
    controller,
    parents,
    children,
    questions,
    surveys,
    surveyId,
    otherSurveyId,
    first,
    second,
    block,
    foreign,
    start,
    input,
    snapshot,
  };
}

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
    ['string ID', (key: string) => key],
    ['extended JSON ID', (key: string) => ({ $oid: key })],
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
      await expect(
        f.controller.getPreviousResponse(a.context),
      ).rejects.toThrow();
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
