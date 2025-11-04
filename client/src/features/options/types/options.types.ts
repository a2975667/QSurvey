import { IQuestion, IQsOption } from "../../../types/coreTypes";

// State interfaces
export interface IOptionsState {
  loaded: boolean;
  byId: {
    [key: string]: IQsOption;
  };
  positions: {
    [key: string]: string[];
  };
  categorySequence: ICategorySequence;
  metadata: IOptionsMetadata;
  responseStatus: IResponseStatus;
}

export interface ICategorySequence {
  hasUndecided: boolean;
  hasSkip: boolean;
  userDefinedCategories: string[];
  currentViewCategories: string[];
}

export interface IOptionsMetadata {
  onHoverOptionId: string | null;
}

export interface IResponseStatus {
  submitted: boolean;
  surveyResponseId: string | null;
  uuid?: string;
  questionResponseIds: {
    [key: string]: string;
  };
  error: any;
}

// Slice-specific states - use index signature to avoid TS errors
export interface IPositionsState {
  byId: {
    [key: string]: IQsOption;
  };
  positions: {
    [key: string]: string[];
  };
  categorySequence: ICategorySequence;
  [key: string]: any; // Allow additional keys
}

export interface IVotesState {
  byId: {
    [key: string]: IQsOption;
  };
  [key: string]: any; // Allow additional keys
}

export interface IMetadataState {
  onHoverOptionId: string | null;
  [key: string]: any; // Allow additional keys
}

export interface IResponsesState {
  responseStatus: IResponseStatus;
  [key: string]: any; // Allow additional keys
}

// Action payload types
export interface IUpdateOptionPositionPayload {
  optionId: string;
  originalCategory: string;
  newCategory: string;
  newPosition: number;
}

export interface IUpdateOptionVotesPayload {
  optionId: string;
  newVote: number;
}

export interface IOptionKeysPayload {
  optionKeys: string[];
}

export interface IUpdateOptionGroupPayload {
  optionId: string;
  newGroup: string;
}

export interface ISetPositionGroupsPayload {
  userDefinedCategories: string[];
  categoryiesHasSkip: boolean;
  page: 'organize' | 'vote';
}

export interface IMergeOptionGroupsPayload {
  target: string;
  source: string;
}

export interface IReorderOptionsPayload {
  curCategory: string;
}

export interface IRegroupAndOrderOptionsPayload {
  curCategory: string;
}

export interface IQvNavigatorSnapshotPayload {
  order: string[];
  activeQuestionId?: string;
  completed?: string[];
}

// API types
export interface IInitialQuestionResponsePayload {
  surveyId: string;
  questionId: string;
  responseContent: any;
  sKey?: string;
  uKey?: string;
  IsNewSurveyResponse?: boolean;
  navigator?: IQvNavigatorSnapshotPayload;
}

export interface IAdditionalQuestionResponsePayload {
  uuid: string;
  surveyResponseId: string;
  surveyId: string;
  questionId: string;
  responseContent: any;
  sKey?: string;
  uKey?: string;
  navigator?: IQvNavigatorSnapshotPayload;
}

export interface IUpdateQuestionResponsePayload {
  uuid: string;
  surveyResponseId: string;
  questionResponseId: string;
  surveyId: string;
  questionId: string;
  responseContent: any;
  sKey?: string;
  uKey?: string;
  navigator?: IQvNavigatorSnapshotPayload;
}

export interface ICompleteSurveyResponsePayload {
  uuid: string;
  surveyResponseId: string;
  surveyId: string;
  sKey?: string;
  uKey?: string;
  metadata?: any;
}

export interface IFetchSurveyResponseByUUIDPayload {
  uuid: string;
  surveyId: string;
  sKey?: string;
  uKey?: string;
}

export interface IBatchQuestionResponsesPayload {
  surveyId: string;
  responses: Array<{
    questionId: string;
    responseContent: any;
    navigator?: IQvNavigatorSnapshotPayload;
  }>;
  uuid?: string;
  surveyResponseId?: string;
  sKey?: string;
  uKey?: string;
}
