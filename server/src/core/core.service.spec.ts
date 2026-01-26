import { CoreService } from './core.service';
import { Types } from 'mongoose';

const createExec = (value: any) => jest.fn().mockResolvedValue(value);

const createModelMock = (result: any[] = []) => ({
  find: jest.fn().mockReturnValue({ exec: createExec(result) }),
  findById: jest.fn().mockReturnValue({ exec: createExec(null) }),
  findOne: jest.fn().mockReturnValue({ exec: createExec(null) }),
  findOneAndUpdate: jest.fn().mockReturnValue({ exec: createExec(null) }),
  updateOne: jest.fn().mockReturnValue({ exec: createExec(null) }),
});

describe('CoreService getQuestionsByManyIds', () => {
  const buildService = (overrides?: {
    base?: any;
    likert?: any;
    text?: any;
    qv?: any;
    approval?: any;
    textBlock?: any;
    selection?: any;
  }) => {
    const questionModel = overrides?.base ?? createModelMock();
    const surveyModel = createModelMock();
    const surveyResponseModel = createModelMock();
    const questionResponseModel = createModelMock();
    const userModel = createModelMock();
    const likertModel = overrides?.likert ?? createModelMock();
    const textModel = overrides?.text ?? createModelMock();
    const qvModel = overrides?.qv ?? createModelMock();
    const approvalModel = overrides?.approval ?? createModelMock();
    const textBlockModel = overrides?.textBlock ?? createModelMock();
    const selectionModel = overrides?.selection ?? createModelMock();

    return new CoreService(
      questionModel as any,
      surveyModel as any,
      surveyResponseModel as any,
      questionResponseModel as any,
      userModel as any,
      likertModel as any,
      textModel as any,
      qvModel as any,
      approvalModel as any,
      textBlockModel as any,
      selectionModel as any,
    );
  };

  it('returns [] when all IDs are invalid', async () => {
    const service = buildService();
    const result = await service.getQuestionsByManyIds(['not-an-id'] as any);
    expect(result).toEqual([]);
  });

  it('normalizes ID inputs and preserves order across question models', async () => {
    const textId = new Types.ObjectId();
    const qvId = new Types.ObjectId();
    const textDoc = { _id: textId, type: 'text', question: 'Text question' };
    const qvDoc = { _id: qvId, type: 'qv', question: 'QV question' };

    const textModel = createModelMock([textDoc]);
    const qvModel = createModelMock([qvDoc]);

    const service = buildService({
      text: textModel,
      qv: qvModel,
    });

    const result = await service.getQuestionsByManyIds([
      textId.toHexString(),
      qvId,
    ] as any);

    expect(result.map((doc) => doc._id.toString())).toEqual([
      textId.toHexString(),
      qvId.toHexString(),
    ]);
    expect(textModel.find).toHaveBeenCalledWith({
      _id: { $in: expect.any(Array) },
    });
    const passedIds = textModel.find.mock.calls[0][0]._id.$in;
    expect(passedIds).toHaveLength(2);
    expect(passedIds[0]).toBeInstanceOf(Types.ObjectId);
  });

  it('returns selection question when present', async () => {
    const selectionId = new Types.ObjectId();
    const selectionDoc = { _id: selectionId, type: 'selection', options: [] };
    const selectionModel = {
      find: jest.fn().mockReturnValue({ exec: createExec([selectionDoc]) }),
      findById: jest.fn().mockReturnValue({ exec: createExec(selectionDoc) }),
      findOne: jest.fn().mockReturnValue({ exec: createExec(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: createExec(null) }),
      updateOne: jest.fn().mockReturnValue({ exec: createExec(null) }),
    };

    const service = buildService({
      selection: selectionModel,
    });

    const result = await service.getQuestionById(selectionId as any);

    expect((result as any)?._id.toString()).toBe(selectionId.toHexString());
    expect(selectionModel.findById).toHaveBeenCalled();
  });
});
