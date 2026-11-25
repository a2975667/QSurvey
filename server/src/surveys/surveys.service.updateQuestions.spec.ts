import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { isDeepStrictEqual } from 'node:util';
import { Role } from 'src/auth/roles/role.enum';
import { SurveysService } from './surveys.service';

describe('survey-scoped question operations', () => {
  const designer = new Types.ObjectId();
  const collaborator = new Types.ObjectId();
  const otherDesigner = new Types.ObjectId();
  const surveyId = new Types.ObjectId();
  const first = new Types.ObjectId();
  const second = new Types.ObjectId();

  const setup = () => {
    const survey = { _id: surveyId, questions: [first, second], collaborators: [designer, collaborator] };
    const collection = {
      findOne: jest.fn().mockResolvedValue(survey),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const questions = { deleteOne: jest.fn().mockReturnValue({ exec: jest.fn() }) };
    const core = {
      getUserById: jest.fn().mockResolvedValue({ roles: [Role.Designer] }),
      getSurveyById: jest.fn().mockResolvedValue(survey),
      getQuestionsByManyIds: jest.fn(),
    };
    const service: SurveysService = new (SurveysService as any)(
      {
        collection,
        db: { collection: () => collection },
        hydrate: (doc) => doc,
      },
      questions,
      ...Array(8).fill({}),
      core,
      {},
    );
    return { service, collection, questions, core, survey };
  };

  it('allows a collaborator to reorder historical references without hydrating them', async () => {
    const { service, collection, core } = setup();
    const previous = [first.toHexString(), { $oid: second.toHexString() }];
    collection.findOne.mockResolvedValueOnce({ _id: surveyId, questions: previous });
    await service.updateSurveyQuestionsById(collaborator, surveyId, {
      questions: [{ _id: second }, first.toHexString()],
    } as any);
    expect(collection.updateOne).toHaveBeenCalledWith(
      {
        _id: surveyId,
        collaborators: { $in: [collaborator, collaborator.toHexString()] },
        questions: previous,
      },
      { $set: { questions: [second, first] } },
    );
    expect(core.getQuestionsByManyIds).not.toHaveBeenCalled();
  });

  it('never treats global existence as permission to append, replace, duplicate or omit', async () => {
    const { service, collection } = setup();
    for (const ids of [[first, second, otherDesigner], [first, otherDesigner], [first, first], [second]]) {
      await expect(service.updateSurveyQuestionsById(designer, surveyId, { questions: ids }))
        .rejects.toBeInstanceOf(ConflictException);
    }
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a concurrent membership change after reading the original order', async () => {
    const { service, collection } = setup();
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    await expect(service.updateSurveyQuestionsById(designer, surveyId, { questions: [second, first] }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('checks both the actor and the stored question on scoped reads and edits', async () => {
    const { service, collection } = setup();
    collection.findOne.mockResolvedValue(null);
    for (const mode of ['read', 'edit'] as const) {
      await expect(service.authorizeSurveyQuestion(otherDesigner, surveyId, first, mode))
        .rejects.toBeInstanceOf(NotFoundException);
    }
    expect(collection.findOne).toHaveBeenCalledWith(expect.objectContaining({
      _id: surveyId, collaborators: { $in: [otherDesigner, otherDesigner.toHexString()] },
      $or: expect.arrayContaining([{ questions: { $in: [first, first.toHexString()] } }]),
    }), expect.anything());
  });

  it('allows a shared question to be read but refuses an ambiguous in-place edit, including an admin edit', async () => {
    const { service, core, collection } = setup();
    await service.authorizeSurveyQuestion(collaborator, surveyId, first, 'read');
    await expect(service.authorizeSurveyQuestion(collaborator, surveyId, first, 'edit'))
      .rejects.toBeInstanceOf(ConflictException);
    core.getUserById.mockResolvedValue({ roles: [Role.Admin] });
    collection.findOne.mockImplementation(async (filter) =>
      filter.$or && !filter.collaborators ? { _id: surveyId } : null,
    );
    await expect(service.authorizeSurveyQuestion(designer, surveyId, first, 'edit'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it.each([true, false])(
    'removes every form of the target and preserves a concurrent append (shared=%s)',
    async (shared) => {
      const { service, collection, questions } = setup();
      const hex = first.toHexString();
      const raw = [
        hex,
        { $oid: hex },
        { _id: first, question: 'old' },
        'broken sibling',
        second,
      ];
      collection.findOne
        .mockResolvedValueOnce({ questions: raw })
        .mockResolvedValueOnce(shared ? { _id: new Types.ObjectId() } : null);
      const concurrent = new Types.ObjectId();
      collection.findOneAndUpdate.mockImplementation(async (filter, update) => {
        expect(filter).toEqual(collection.findOne.mock.calls[0][0]);
        expect(filter).not.toHaveProperty('questions', raw);
        const removals = update.$pullAll.questions;
        // Another author has appended a question and normalized one old reference.
        const current = [first, ...raw, concurrent];
        return {
          questions: current.filter(
            (ref) => !removals.some((target) => isDeepStrictEqual(target, ref)),
          ),
        };
      });
      const updated = await service.removeSurveyQuestion(
        designer,
        surveyId,
        first,
      );
      expect(updated.questions).toEqual(['broken sibling', second, concurrent]);
      if (shared) expect(questions.deleteOne).not.toHaveBeenCalled();
      else expect(questions.deleteOne).toHaveBeenCalledWith({ _id: first });
    },
  );

  it('preserves the question if the authorized membership disappears before the pull', async () => {
    const { service, collection, questions } = setup();
    collection.findOne.mockResolvedValueOnce(null);
    await expect(service.removeSurveyQuestion(otherDesigner, surveyId, first)).rejects.toBeInstanceOf(NotFoundException);
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
    collection.findOneAndUpdate.mockResolvedValueOnce(null);
    await expect(
      service.removeSurveyQuestion(designer, surveyId, first),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(questions.deleteOne).not.toHaveBeenCalled();
  });

  it('validates access before saving a typed document', async () => {
    const { service, collection } = setup();
    const question = { set: jest.fn(), save: jest.fn() };
    collection.findOne.mockResolvedValueOnce(null);
    await expect(
      service.saveNewSurveyQuestion(otherDesigner, surveyId, question as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(question.save).not.toHaveBeenCalled();
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('appends two independent creates atomically without replacing the order', async () => {
    const { service, collection } = setup();
    // Both reads see the same revision. Neither append advances it.
    collection.findOne.mockResolvedValue({ __v: 1 });
    const ids = new Set([first.toHexString()]);
    collection.updateOne.mockImplementation(async (filter, update) => {
      expect(filter).toEqual({
        _id: surveyId,
        collaborators: { $in: [designer, designer.toHexString()] },
        __v: 1,
      });
      expect(Object.keys(update)).toEqual(['$addToSet']);
      ids.add(update.$addToSet.questions.toHexString());
      return { matchedCount: 1 };
    });
    const created = await Promise.all(
      [1, 2].map(() =>
        service.saveNewSurveyQuestion(designer, surveyId, {
          set: jest.fn(),
          save: jest.fn(),
        } as any),
      ),
    );
    expect(ids).toEqual(
      new Set([
        first.toHexString(),
        ...created.map((q) => q._id.toHexString()),
      ]),
    );
    expect(ids.size).toBe(3);
    expect(collection.findOne).toHaveBeenCalledWith(expect.anything(), {
      projection: { __v: 1 },
    });
  });

  it.each([
    [2, 1],
    [0, -1],
  ])(
    'attaches the fresh ID at one-based position %s',
    async (position, index) => {
      const { service, collection } = setup();
      const question = { _id: first, set: jest.fn(), save: jest.fn() };
      const result = await service.saveNewSurveyQuestion(
        designer,
        surveyId,
        question as any,
        position,
      );
      const expected = { $each: [result._id], $position: index };
      expect(collection.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: surveyId, questions: [first, second] }),
        { $push: { questions: expected } },
      );
    },
  );
  it('recalculates the requested insertion position after a concurrent membership change', async () => {
    const { service, collection } = setup();
    collection.findOne
      .mockResolvedValueOnce({ questions: [first] })
      .mockResolvedValueOnce({ questions: [first, second] });
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    const question = await service.saveNewSurveyQuestion(
      designer,
      surveyId,
      { set: jest.fn(), save: jest.fn() } as any,
      1.5,
    );
    const calls = collection.updateOne.mock.calls;
    expect(calls[0][1].$push.questions).toEqual({
      $each: [question._id],
      $position: 1,
    });
    expect(calls[1][1].$push.questions).toEqual({
      $each: [question._id],
      $position: 0,
    });
  });

  it('removes the new document if access disappears before attachment', async () => {
    const { service, collection, questions, survey } = setup();
    collection.findOne
      .mockResolvedValueOnce(survey)
      .mockResolvedValueOnce(null);
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    const doc = { _id: first, set: jest.fn(), save: jest.fn() };
    await expect(
      service.saveNewSurveyQuestion(designer, surveyId, doc as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(doc._id).not.toEqual(first);
    expect(doc.set).toHaveBeenCalledWith('responses', []);
    expect(doc.save).toHaveBeenCalled();
    expect(questions.deleteOne).toHaveBeenCalledWith({ _id: doc._id });
  });

  it.each([true, false])('reconciles an interrupted attachment before cleanup (committed=%s)', async (committed) => {
    const { service, collection, questions } = setup();
    const question = { _id: first, set: jest.fn(), save: jest.fn() };
    const failure = new Error('connection interrupted');
    collection.updateOne.mockRejectedValue(failure);
    collection.findOneAndUpdate.mockImplementation(async () => ({
      questions: committed ? [question._id] : [],
    }));
    const result = service.saveNewSurveyQuestion(designer, surveyId, question as any);
    if (committed) {
      await expect(result).resolves.toBe(question);
      expect(questions.deleteOne).not.toHaveBeenCalled();
    } else {
      await expect(result).rejects.toBe(failure);
      expect(questions.deleteOne).toHaveBeenCalledWith({ _id: question._id });
    }
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: surveyId }, { $inc: { __v: 1 } }, expect.objectContaining({ returnDocument: 'after' }),
    );
  });

  it('does not destroy an answerable question when the attachment outcome remains unknown', async () => {
    const { service, collection, questions } = setup();
    collection.updateOne.mockRejectedValue(new Error('attachment result unavailable'));
    collection.findOneAndUpdate.mockRejectedValue(new Error('primary unavailable'));
    await expect(service.saveNewSurveyQuestion(designer, surveyId, { set: jest.fn(), save: jest.fn() } as any))
      .rejects.toThrow('primary unavailable');
    expect(questions.deleteOne).not.toHaveBeenCalled();
  });
});
