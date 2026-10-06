import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { SurveysService } from './surveys.service';
import { SURVEY_TEMPLATE_IDS } from './survey-template.config';

describe('survey creation quota', () => {
  const userId = new Types.ObjectId();
  const sourceId = new Types.ObjectId();
  let service: SurveysService;
  let surveyModel: any;
  let coreService: any;
  let save: jest.Mock;
  let count: jest.Mock;

  beforeEach(() => {
    save = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });
    count = jest.fn().mockResolvedValue([{ total: 49 }]);
    surveyModel = jest.fn().mockImplementation(() => ({ save }));
    surveyModel.aggregate = jest.fn().mockReturnValue({ exec: count });
    surveyModel.findById = jest.fn().mockReturnValue({
      lean: () => ({ exec: async () => ({ collaborators: [userId], questions: [] }) }),
    });
    surveyModel.db = { startSession: jest.fn() };
    coreService = { getUserById: jest.fn().mockResolvedValue({ roles: [Role.Designer] }) };
    service = new (SurveysService as any)(
      surveyModel, ...Array(8).fill({}), {}, coreService, {},
    );
  });

  it('allows the fiftieth project for an ordinary designer', async () => {
    await service.createNewSurvey(userId, { title: 'New', description: 'Description' } as any);
    expect(save).toHaveBeenCalledTimes(1);
    expect(surveyModel).toHaveBeenCalledWith(expect.objectContaining({ collaborators: [userId] }));
  });

  it.each([50, 51, 500])('rejects an ordinary account with %i projects before writing', async (total) => {
    count.mockResolvedValue([{ total }]);
    await expect(service.createNewSurvey(userId, {} as any)).rejects.toBeInstanceOf(ConflictException);
    expect(surveyModel).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('counts the same collaborator membership as the designer, including legacy string IDs', async () => {
    await service.createNewSurvey(userId, {} as any);
    expect(surveyModel.aggregate).toHaveBeenCalledWith([
      { $match: { $or: [
        { collaborators: userId },
        { $expr: { $in: [userId.toString(), '$collaborators'] } },
      ] } },
      { $count: 'total' },
    ]);
  });

  it('allows an empty account', async () => {
    count.mockResolvedValue([]);
    await service.createNewSurvey(userId, {} as any);
    expect(save).toHaveBeenCalled();
  });

  it.each([{ roles: [Role.Admin] }, { roles: [Role.Designer, Role.Admin] }])('exempts persisted admin roles $roles', async ({ roles }) => {
    coreService.getUserById.mockResolvedValue({ roles });
    await service.createNewSurvey(userId, {} as any);
    expect(surveyModel.aggregate).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it.each(['survey', 'template'])('allows persisted admins to clone a %s above the quota', async (kind) => {
    coreService.getUserById.mockResolvedValue({ roles: [Role.Admin] });
    coreService.getQuestionsByManyIds = jest.fn().mockResolvedValue([]);
    const clonedId = new Types.ObjectId();
    surveyModel.create = jest.fn().mockResolvedValue([{ _id: clonedId }]);
    const session = { withTransaction: async (work: () => Promise<void>) => work(), endSession: jest.fn() };
    surveyModel.db.startSession.mockResolvedValue(session);
    count.mockResolvedValue([{ total: 75 }]);
    const result = kind === 'survey'
      ? await service.cloneSurvey(userId, [Role.Admin], sourceId.toString())
      : await service.cloneSurveyTemplate(userId, [Role.Admin], Array.from(SURVEY_TEMPLATE_IDS)[0]);
    expect(result._id).toEqual(clonedId);
    expect(surveyModel.aggregate).not.toHaveBeenCalled();
    expect(surveyModel.create).toHaveBeenCalledTimes(1);
  });

  it.each([{ roles: undefined }, { roles: [] }, { roles: ['Admin'] }, { roles: ['super-admin'] }])('does not exempt absent or unrecognized roles $roles', async ({ roles }) => {
    coreService.getUserById.mockResolvedValue({ roles });
    count.mockResolvedValue([{ total: 50 }]);
    await expect(service.createNewSurvey(userId, {} as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a nonexistent persisted account', async () => {
    coreService.getUserById.mockResolvedValue(null);
    await expect(service.createNewSurvey(userId, {} as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects cloning at the limit even when the JWT still claims admin', async () => {
    count.mockResolvedValue([{ total: 50 }]);
    await expect(service.cloneSurvey(userId, [Role.Admin], sourceId.toString())).rejects.toBeInstanceOf(ConflictException);
    expect(surveyModel.db.startSession).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects template cloning at the limit before creating questions or a survey', async () => {
    count.mockResolvedValue([{ total: 50 }]);
    await expect(service.cloneSurveyTemplate(userId, [Role.Designer], Array.from(SURVEY_TEMPLATE_IDS)[0])).rejects.toBeInstanceOf(ConflictException);
    expect(surveyModel.db.startSession).not.toHaveBeenCalled();
  });

  it('preserves clone authorization before checking quota', async () => {
    surveyModel.findById.mockReturnValue({ lean: () => ({ exec: async () => ({ collaborators: [], questions: [] }) }) });
    await expect(service.cloneSurvey(userId, [Role.Designer], sourceId.toString())).rejects.toBeInstanceOf(ForbiddenException);
    expect(coreService.getUserById).not.toHaveBeenCalled();
  });
});
