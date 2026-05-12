export interface IBackendQuestion {
    _id: string; // notsure if there are instances that is a ObjectId
    description: string;
    question: string;
    type: string;
    position?: number; // this should be fixed to not optional
    groupId?: string;
    
    // QS Question properties
    options?: IBackendQsOptions[];
    setting?: IBackendQVSetting;
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
}

export interface IBackendQsOptions {
    optionId: string;
    description: string;
    optionName: string;
    isExclusive?: boolean;
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
