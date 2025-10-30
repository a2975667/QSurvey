// Discriminated union for response content per question type
export type ResponseKind = 'qv' | 'likert' | 'text';

// Canonical per-option state for QV
export interface QvOptionState {
  optionId: string;
  optionName?: string;
  group: string;
  groupPosition: number;
  globalPosition: number;
  votes: number;
}

export interface QvBinsConfig {
  hasUndecided: boolean;
  hasSkip: boolean;
  userDefined: string[];
}

export interface QvQuestionState {
  type: 'qv';
  questionId: string;
  totalCredits: number;
  // Canonical store: optionId -> option state
  options: { [optionId: string]: QvOptionState };
  // Fast access for UI: group -> ordered list of optionIds
  positionsByGroup: { [group: string]: string[] };
  categoriesOrder: string[];
  bins: QvBinsConfig;
  history?: {
    lastEventAt?: number;
    lastAction?: string;
    revision?: number;
  };
}

export interface QvNavigatorState {
  order: string[];
  activeQuestionId?: string | null;
  completed: { [questionId: string]: boolean };
}

export interface LikertQuestionState {
  type: 'likert';
  questionId: string;
  selection?: string; // the selected value, e.g., '5'
  optionName?: string; // optional label for analytics
  history?: {
    lastEventAt?: number;
    changes?: Array<{ from?: string; to: string; at: number }>;
  };
}

export interface TextQuestionState {
  type: 'text';
  questionId: string;
  text: string;
  history?: {
    lastEventAt?: number;
    length?: number;
  };
}

export type QuestionResponseState = QvQuestionState | LikertQuestionState | TextQuestionState;

export interface UnifiedResponsesState {
  surveyId?: string;
  surveyResponseId?: string | null;
  uuid?: string;
  questionResponseIds: { [questionId: string]: string };
  status: 'idle' | 'in_progress' | 'submitting' | 'completed' | 'error';
  error?: any;
  // Per-question state keyed by questionId
  byQuestionId: { [questionId: string]: QuestionResponseState };
  qvNavigator: QvNavigatorState;
  // Submission queue for idempotent incremental submission
  submitQueue: Array<{
    questionId: string;
    op: 'create' | 'update';
    payloadHash: string;
    correlationId: string;
    createdAt: number;
    status: 'pending' | 'sent' | 'ack' | 'error';
    error?: any;
  }>;
}
