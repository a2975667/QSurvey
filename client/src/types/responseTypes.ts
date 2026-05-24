// Discriminated union for response content per question type
export type ResponseKind = 'qv' | 'qvplus' | 'likert' | 'text' | 'approval' | 'selection';

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

// New question type: QV Plus (QV + Selection stages with followup questions)
// Per-stage answer bundle for a single QV option.
// Each stage has its own followup answers AND its own unlock state,
// since stages may ask completely different followup questions.
export interface QvPlusStageAnswers {
  followupAnswers: { [followupId: string]: string | null }; // followupId -> selected choiceId (null = unanswered)
  manuallyUnlocked: boolean; // true if respondent opted-in to answer this option in this stage
}

// All answers for a single QV option across every selection stage.
export interface QvPlusOptionAnswers {
  byStage: { [stageId: string]: QvPlusStageAnswers };
}

// The entire response state for a QV Plus question, including the base QV fields and the followup answers for each option
export interface QvPlusQuestionState extends Omit<QvQuestionState, 'type'> {
  type: 'qvplus';
  optionAnswers: { [optionId: string]: QvPlusOptionAnswers };
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

export interface ApprovalOptionState {
  optionId: string;
  optionName?: string;
  description?: string;
}

export type ApprovalInteractionEvent =
  | { type: 'toggle'; optionId: string; action: 'approve' | 'unapprove'; at: number }
  | { type: 'reorder'; order: string[]; at: number };

export interface ApprovalQuestionState {
  type: 'approval';
  questionId: string;
  approvals: string[];
  options: { [optionId: string]: ApprovalOptionState };
  order: string[];
  maxApprovals?: number;
  unlimitedApprovals?: boolean;
  history?: {
    events?: ApprovalInteractionEvent[];
    lastEventAt?: number;
    revision?: number;
    initialOrder?: string[];
  };
}

export interface SelectionQuestionState {
  type: 'selection';
  questionId: string;
  selectedOptionIds: string[];
  history?: {
    lastEventAt?: number;
    changes?: Array<{ at: number; selectedOptionIds: string[] }>;
  };
}

export interface ApprovalNavigatorState {
  order: string[];
  activeQuestionId?: string | null;
  completed: { [questionId: string]: boolean };
}

export type QuestionResponseState =
  | QvQuestionState
  | LikertQuestionState
  | TextQuestionState
  | ApprovalQuestionState
  | SelectionQuestionState
  | QvPlusQuestionState;        // QV Plus

export interface UnifiedResponsesState {
  surveyId?: string;
  surveyResponseId?: string | null;
  uuid?: string;
  questionResponseIds: { [questionId: string]: string };
  status: 'idle' | 'in_progress' | 'submitting' | 'completed' | 'error' | 'duplicate';
  error?: any;
  // Per-question state keyed by questionId
  byQuestionId: { [questionId: string]: QuestionResponseState };
  qvNavigator: QvNavigatorState;
  approvalNavigator: ApprovalNavigatorState;
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
