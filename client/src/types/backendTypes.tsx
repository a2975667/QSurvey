export interface IBackendQuestion {
    _id: string; // notsure if there are instances that is a ObjectId
    description: string;
    question: string;
    type: string;
    position?: number; // this should be fixed to not optional
    groupId?: string;
    
    // QS Question properties
    options?: IBackendQsOptions[];
    setting?: IBackendQVSetting | IBackendQVPlusSetting;
    sampledOptionIds?: string[];

    // Selection Question properties
    selectionMode?: string;
    displayControl?: string;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    randomizeOptions?: boolean;
    maxApprovals?: number;
    unlimitedApprovals?: boolean;
    controlRuleThresholds?: { singleToDropdownAt?: number };
    
    // Likert Question properties
    scale?: string[];
    minLabel?: string;
    maxLabel?: string;
    
    // Text Question properties
    multiline?: boolean;
    maxLength?: number;

    // Text block properties
    content?: string;
    newPage?: boolean;
    respondentResultsEnabled?: boolean;
}

export interface IBackendQVSetting {
    questionType: string;
    totalCredits: number;
    version: number;
    isAvailable: boolean;
    sampleOption?: number;
    showInstructions?: boolean;
    labelOverrides?: IBackendQvLabelOverrides;
}

export interface IBackendQvLabelOverrides {
    binLabels?: Partial<Record<'Positive' | 'Neutral' | 'Negative' | 'Undecided' | 'Skip', string>>;
    leanPrefix?: string;
    votePositive?: string;
    voteNegative?: string;
    voteNone?: string;
    sortByVotes?: string;
}

export interface IBackendQsOptions {
    optionId: string;
    description: string;
    optionName: string;
    isExclusive?: boolean;
}

// New question type: QV Plus (QV + Selection stages with followup questions)
// A single radio choice within a followup question
export interface IBackendQVPlusChoice {
  choiceId: string;
  label: string;
}

// Followup question structure
export interface IBackendQVPlusFollowup {
  followupId: string;
  prompt: string; // followup question text shown next to the dropdown
  choices: IBackendQVPlusChoice[]; // shown as a dropdown to the respondent
}

// A single round = one vote + the selection followups that follow it.
// QV Plus can have 1+ rounds, each rendered as a separate (vote, selection) pair
// in the respondent flow. Cards filter by `requiredVoteFilter` per round; the
// vote state from a previous round is pre-filled into the next round's vote.
export interface IBackendQVPlusRound {
  roundId: string;
  title?: string;          // header text shown at the top of this round's selection page
  description?: string;    // optional sub-description (e.g., the contextual prompt for this round)
  requiredVoteFilter: 'upvote' | 'downvote' | 'both' | 'none';  // which options appear in this round's selection page based on their vote
  followupQuestions: IBackendQVPlusFollowup[]; // 1-3 followups asked in this round's selection page
}

// QV Plus question settings
export interface IBackendQVPlusSetting extends IBackendQVSetting {
  rounds: IBackendQVPlusRound[]; // 1 or more (vote, selection) rounds
}

export interface IBackendSurvey {
    _id: string;
    title: string;
    description: string;
    tags: string[];
    questions: IBackendQuestion[];
    settings: IBackendSurveySettings;
    questionGroups?: IBackendQuestionGroup[];
    collaborators?: string[];
    __v: number;
}

export interface IBackendQuestionGroup {
    id: string;
    title: string;
    description?: string;
    questionIds: string[];
}

export interface IBackendSurveySettings {
    hasSKey: boolean;
    sKeyValue: string;
    hasUKey: boolean;
    isAvailable: boolean;
    respondentsCanViewResults?: boolean;
    locale?: 'en-US' | 'zh-TW';
}

export interface IBackendResponse {
    questionId: string;
    questionType: string;
    
    // QS Response properties
    selections?: {
        optionId: string;
        vote: number;
    }[];
    
    // Likert Response properties
    selection?: string;
    
    // Text Response properties
    text?: string;
}

export interface IBackendSurveyResponse {
    _id: string;
    userId: string;
    surveyId: string;
    responses: IBackendResponse[];
    startTime: Date;
    endTime?: Date;
    completed: boolean;
    metadata?: any;
}
