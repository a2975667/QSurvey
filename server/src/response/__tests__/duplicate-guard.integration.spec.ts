jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: {
    createForClass: jest.fn().mockReturnValue({
      index: jest.fn(),
    }),
  },
}));

jest.mock('mongoose', () => ({
  Schema: class {},
  SchemaFactory: { createForClass: jest.fn() },
  model: jest.fn(),
  connection: { on: jest.fn() },
  Types: { ObjectId: jest.fn() },
}));

import { ConflictException } from '@nestjs/common';
import { UserResponseService } from '../user-response.service';
import { UserResponseController } from '../user-response.controller';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

type SurveyDoc = {
  _id: string;
  uuid: string;
  uKey?: string;
  surveyId: string;
  status: 'Incomplete' | 'Complete';
  questionResponses: string[];
  qvNavigator?: any;
  startTime?: string;
  lastUpdate?: string;
  endTime?: Date | string | null;
};

type QuestionDoc = {
  _id: string;
  surveyResponseId: string;
  questionId: string;
  responseContent: any;
  expireCountdown?: number;
  createdTime: string;
};

const applyUpdate = (doc: any, update: any) => {
  const updated = { ...doc };

  Object.entries(update || {})
    .filter(([key]) => !key.startsWith('$'))
    .forEach(([key, value]) => {
      updated[key] = value;
    });

  if (update?.$set) {
    Object.entries(update.$set).forEach(([key, value]) => {
      updated[key] = value;
    });
  }

  if (update?.$unset) {
    Object.keys(update.$unset).forEach((key) => {
      delete updated[key];
    });
  }

  if (update?.$push) {
    Object.entries(update.$push).forEach(([field, pushValue]) => {
      const values =
        pushValue && typeof pushValue === 'object' && '$each' in pushValue
          ? (pushValue as any).$each
          : [pushValue];
      const current = Array.isArray(updated[field]) ? [...updated[field]] : [];
      updated[field] = current.concat(values);
    });
  }

  return updated;
};

const createQuestionResponseModel = (store: Map<string, QuestionDoc>) => {
  let sequence = 0;

  const ctor: any = function QuestionResponse(
    this: any,
    doc: Partial<QuestionDoc>,
  ) {
    Object.assign(this, doc);
    this.save = async () => {
      const _id = doc._id ?? `qr-${++sequence}`;
      const saved: QuestionDoc = {
        _id,
        surveyResponseId: doc.surveyResponseId!,
        questionId: doc.questionId!,
        responseContent: clone(doc.responseContent),
        expireCountdown: doc.expireCountdown,
        createdTime: doc.createdTime ?? new Date().toISOString(),
      };
      store.set(_id, saved);
      return clone(saved);
    };
  };

  ctor.findOne = jest.fn((filter: any) => ({
    exec: async () => {
      for (const doc of store.values()) {
        if (
          doc.surveyResponseId === filter.surveyResponseId &&
          doc.questionId === filter.questionId
        ) {
          return clone(doc);
        }
      }
      return null;
    },
  }));

  ctor.findById = jest.fn((id: string) => ({
    exec: async () => {
      const doc = store.get(id);
      return doc ? clone(doc) : null;
    },
  }));

  ctor.findByIdAndUpdate = jest.fn((id: string, update: any) => ({
    exec: async () => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = applyUpdate(existing, update);
      store.set(id, updated);
      return clone(updated);
    },
  }));

  ctor.findByIdAndRemove = jest.fn((id: string) => ({
    exec: async () => {
      const existing = store.get(id);
      store.delete(id);
      return existing ? clone(existing) : null;
    },
  }));

  return ctor;
};

const createSurveyResponseModel = (store: Map<string, SurveyDoc>) => {
  const model: any = {
    findOne: jest.fn((filter: any) => ({
      exec: async () => {
        for (const doc of store.values()) {
          if (filter.uuid && doc.uuid === filter.uuid) {
            return clone(doc);
          }
        }
        return null;
      },
    })),
    findById: jest.fn((id: string) => ({
      exec: async () => {
        const doc = store.get(id);
        return doc ? clone(doc) : null;
      },
    })),
    findByIdAndUpdate: jest.fn((id: string, update: any) => ({
      exec: async () => {
        const existing = store.get(id);
        if (!existing) return null;
        const updated = applyUpdate(existing, update);
        store.set(id, updated);
        return clone(updated);
      },
    })),
    findOneAndUpdate: jest.fn((filter: any, update: any) => ({
      exec: async () => {
        const existing = store.get(filter._id);
        if (!existing) return null;
        if (
          filter.status &&
          filter.status.$ne === 'Complete' &&
          existing.status === 'Complete'
        ) {
          return null;
        }
        const updated = applyUpdate(existing, update);
        store.set(filter._id, updated);
        return clone(updated);
      },
    })),
  };

  return model;
};

const createQuestionModel = (store: Map<string, any>) => ({
  findByIdAndUpdate: jest.fn(async (id: string, update: any) => {
    const existing = store.get(id) ?? { _id: id };
    const updated = applyUpdate(existing, update);
    store.set(id, updated);
    return clone(updated);
  }),
});

const buildFixture = () => {
  const surveyStore = new Map<string, SurveyDoc>();
  const questionStore = new Map<string, QuestionDoc>();
  const questionMetaStore = new Map<string, any>();

  const surveyResponse: SurveyDoc = {
    _id: 'sr-1',
    uuid: 'uuid-1',
    surveyId: 'survey-1',
    status: 'Incomplete',
    questionResponses: [],
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  };

  surveyStore.set(surveyResponse._id, clone(surveyResponse));
  questionMetaStore.set('question-1', { _id: 'question-1', responses: [] });

  const surveyResponseModel = createSurveyResponseModel(surveyStore);
  const questionResponseModel = createQuestionResponseModel(questionStore);
  const questionModel = createQuestionModel(questionMetaStore);

  const coreService = {
    getSurveyById: jest.fn(async () => ({
      settings: {
        isAvailable: true,
        hasSKey: false,
        hasUKey: false,
      },
    })),
    getQuestionById: jest.fn(async () => ({ type: 'qv' })),
  };

  const service = new UserResponseService(
    surveyResponseModel,
    questionResponseModel,
    questionModel as any,
    coreService as any,
    {} as any,
    {} as any,
  );

  const controller = new UserResponseController(service);

  return {
    service,
    controller,
    surveyStore,
    questionStore,
    questionMetaStore,
    surveyResponse,
  };
};

describe('Duplicate submission guard integration', () => {
  it('does not write duplicate question responses for repeated create calls', async () => {
    const { service, surveyStore, questionStore, surveyResponse } =
      buildFixture();

    const dto: any = {
      uuid: surveyResponse.uuid,
      surveyResponseId: surveyResponse._id,
      surveyId: surveyResponse.surveyId,
      questionId: 'question-1',
      responseContent: { votes: [] },
    };

    const first = await service.CreateQuestionAndUpdateSurveyResponse(dto);
    expect(first.questionResponse._id).toBeDefined();
    expect(questionStore.size).toBe(1);
    expect(surveyStore.get(surveyResponse._id)?.questionResponses).toHaveLength(
      1,
    );

    const second = await service.CreateQuestionAndUpdateSurveyResponse(dto);
    expect(questionStore.size).toBe(1);
    expect(surveyStore.get(surveyResponse._id)?.questionResponses).toHaveLength(
      1,
    );
    expect(second.questionResponse._id).toBe(first.questionResponse._id);
  });

  it('returns a 409 via the controller when a survey is completed twice', async () => {
    const { service, controller, surveyStore, questionStore, surveyResponse } =
      buildFixture();

    await service.CreateQuestionAndUpdateSurveyResponse({
      uuid: surveyResponse.uuid,
      surveyResponseId: surveyResponse._id,
      surveyId: surveyResponse.surveyId,
      questionId: 'question-1',
      responseContent: { votes: [] },
    } as any);

    const completeDto: any = {
      uuid: surveyResponse.uuid,
      surveyResponseId: surveyResponse._id,
      surveyId: surveyResponse.surveyId,
    };

    await controller.completeSurvey(completeDto);
    expect(surveyStore.get(surveyResponse._id)?.status).toBe('Complete');
    expect(questionStore.size).toBe(1);

    await expect(controller.completeSurvey(completeDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(questionStore.size).toBe(1);
  });
});
