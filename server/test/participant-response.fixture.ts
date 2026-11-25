import { Types } from 'mongoose';
import { CoreLogicService } from '../src/core/core-logic.service';
import { UserResponseController } from '../src/response/user-response.controller';
import { UserResponseService } from '../src/response/user-response.service';

export const id = () => new Types.ObjectId().toHexString();
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
      if (expression?.$eq !== undefined) return equal(value, expression.$eq);
      if (expression?.$oid !== undefined)
        throw new Error('Unknown query operator $oid');
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
  model.find = jest.fn(({ _id, $expr }, _projection, options) =>
    query(() => {
      const requested = $expr.$in[1].$literal;
      return [...rows.values()]
        .filter(
          (row) =>
            matches(row, { _id }) &&
            requested.some((key) => {
              const ref = row.questionId?._id ?? row.questionId;
              return options?.collation?.strength === 2
                ? JSON.stringify(key).toLowerCase() ===
                    JSON.stringify(ref).toLowerCase()
                : equal(key, ref);
            }),
        )
        .map(clone);
    }),
  );
  model.distinct = jest.fn((field, filter) => ({
    collation: ({ strength }) =>
      query(() =>
        [...rows.values()]
          .filter(
            (row) =>
              row._id !== filter._id.$ne &&
              row[field]?.some((value) =>
                filter[field].$in.some((target) =>
                  strength === 2
                    ? String(target).toLowerCase() ===
                      String(value).toLowerCase()
                    : equal(target, value),
                ),
              ),
          )
          .flatMap((row) => row[field]),
      ),
  }));
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

export function responseFixture() {
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
    getQuestionsByManyIds: async (keys) =>
      keys.map((key) => questions.rows.get(String(key))),
    getSurveyResponseByUUID: async (uuid) =>
      parents.model.findOne({ uuid }).exec(),
    getQuestionResponsesByManyIds: async (ids) => {
      if (ids.some((key) => !Types.ObjectId.isValid(key)))
        throw new Error('Invalid child _id');
      return [...children.rows.values()]
        .filter((answer) =>
          ids.some((key) => String(key).toLowerCase() === answer._id),
        )
        .map(clone);
    },
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
    core,
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

export async function answeredQuestion(
  question: Record<string, unknown>,
  initialContent: Record<string, unknown>,
) {
  const f = responseFixture();
  Object.assign(f.questions.rows.get(f.first), question);
  const input = f.input();
  const { surveyResponse, questionResponse } =
    await f.controller.createResponse({
      ...input,
      responseContent: initialContent,
    });
  const dto = {
    ...input,
    surveyResponseId: surveyResponse._id,
    uuid: surveyResponse.uuid,
  };
  return {
    core: f.core,
    update: (responseContent: Record<string, unknown>) =>
      f.controller.updateResponse({
        ...dto,
        questionResponseId: questionResponse._id,
        responseContent,
      }),
    resume: (responseContent: Record<string, unknown>) =>
      f.controller.createResponse({ ...dto, responseContent }),
    storedContent: () =>
      f.children.rows.get(questionResponse._id).responseContent,
  };
}
