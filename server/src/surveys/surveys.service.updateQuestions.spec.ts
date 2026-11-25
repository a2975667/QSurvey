import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
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
      getQuestionsByManyIds: jest.fn().mockResolvedValue([{ _id: first }, { _id: second }]),
    };
    const service: SurveysService = new (SurveysService as any)(
      { collection }, questions, ...Array(8).fill({}), core, {},
    );
    return { service, collection, questions, core, survey };
  };

  it.each([designer, collaborator])('authorizes each project collaborator and preserves ID forms', async (actor) => {
    const { service, collection } = setup();
    const previous = [first.toHexString(), { $oid: second.toHexString() }];
    collection.findOne.mockResolvedValueOnce({ _id: surveyId, questions: previous });
    await service.updateSurveyQuestionsById(actor, surveyId, {
      questions: [{ _id: second }, first.toHexString()],
    } as any);
    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: surveyId, collaborators: { $in: [actor, actor.toHexString()] }, questions: previous },
      { $set: { questions: [second, first] } },
    );
  });

  it('never treats global existence as permission to append, replace, duplicate or omit', async () => {
    const { service, collection, core } = setup();
    for (const ids of [[first, second, otherDesigner], [first, otherDesigner], [first, first], [second]]) {
      await expect(service.updateSurveyQuestionsById(designer, surveyId, { questions: ids }))
        .rejects.toBeInstanceOf(ConflictException);
    }
    expect(core.getQuestionsByManyIds).not.toHaveBeenCalled();
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a concurrent membership change after reading the original order', async () => {
    const { service, collection } = setup();
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    await expect(service.updateSurveyQuestionsById(designer, surveyId, { questions: [second, first] }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(collection.updateOne.mock.calls[0][0].questions).toEqual([first, second]);
  });

  it('still rejects an unresolved existing reference without writing', async () => {
    const { service, collection, core } = setup();
    core.getQuestionsByManyIds.mockResolvedValueOnce([{ _id: first }]);
    await expect(service.updateSurveyQuestionsById(designer, surveyId, { questions: [first, second] }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(collection.updateOne).not.toHaveBeenCalled();
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
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('allows a shared question to be read but refuses an ambiguous in-place edit, including an admin edit', async () => {
    const { service, core, collection } = setup();
    await service.authorizeSurveyQuestion(collaborator, surveyId, first, 'read');
    await expect(service.authorizeSurveyQuestion(collaborator, surveyId, first, 'edit'))
      .rejects.toBeInstanceOf(ConflictException);
    core.getUserById.mockResolvedValue({ roles: [Role.Admin] });
    await expect(service.authorizeSurveyQuestion(designer, surveyId, first, 'edit'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(collection.findOne.mock.calls[3][0]).not.toHaveProperty('collaborators');
    expect(collection.findOne.mock.calls[3][0]).toHaveProperty('$or');
  });

  it.each([true, false])('detaches before checking whether the last reference disappeared (shared=%s)', async (shared) => {
    const { service, collection, questions, survey } = setup();
    collection.findOne.mockResolvedValueOnce(survey).mockResolvedValueOnce(shared ? { _id: new Types.ObjectId() } : null);
    await service.removeSurveyQuestion(designer, surveyId, first);
    expect(collection.updateOne).toHaveBeenCalledWith(expect.objectContaining({
      questions: [first, second],
    }), { $set: { questions: [second] } });
    if (shared) expect(questions.deleteOne).not.toHaveBeenCalled();
    else expect(questions.deleteOne).toHaveBeenCalledWith({ _id: first });
  });

  it('never deletes a question when the selected survey does not reference it or detachment loses a race', async () => {
    const { service, collection, questions } = setup();
    collection.findOne.mockResolvedValueOnce(null);
    await expect(service.removeSurveyQuestion(otherDesigner, surveyId, first)).rejects.toBeInstanceOf(NotFoundException);
    expect(collection.updateOne).not.toHaveBeenCalled();
    collection.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    await expect(service.removeSurveyQuestion(designer, surveyId, first)).rejects.toBeInstanceOf(ConflictException);
    expect(questions.deleteOne).not.toHaveBeenCalled();
  });

  it.each([[undefined, null], [1, 0], [3, null], [2.5, null], [0, -1]])(
    'attaches the fresh ID at one-based position %s', async (position, index) => {
    const { service, collection } = setup();
    const question = { _id: first, set: jest.fn(), save: jest.fn() };
    const result = await service.saveNewSurveyQuestion(designer, surveyId, question as any, position);
    expect(result._id).not.toEqual(first);
    expect(question.save).toHaveBeenCalledTimes(1);
    expect(question.set).toHaveBeenCalledWith('responses', []);
    const expected = index === null ? result._id : { $each: [result._id], $position: index };
    expect(collection.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: surveyId }), { $push: { questions: expected }, $inc: { __v: 1 } },
    );
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
