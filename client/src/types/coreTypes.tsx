import { IBackendQsOptions } from './backendTypes';

export type ObjectId = string;

export interface IMetadata {
    isAvailable: Boolean;
    uuid: string;
    startTime: string;
    endTime: string;
}

export interface IQuestion {
    question: string;
    questionId: ObjectId;
    description: string;
    type: string;
    status: string;
    position?: number; // this should be fixed to not optional
    
    options?: Array<string | IBackendQsOptions>;
    totalCredits?: number;
    rawOptions?: IBackendQsOptions[];
    setting?: any;
    
    // Likert specific properties
    scale?: string[];
    minLabel?: string;
    maxLabel?: string;
    
    // Text specific properties
    multiline?: boolean;
    maxLength?: number;

    // Text block properties
    content?: string;
    newPage?: boolean;

    // Selection properties
    selectionMode?: string;
    displayControl?: string;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    randomizeOptions?: boolean;
    maxApprovals?: number;
    unlimitedApprovals?: boolean;
    controlRuleThresholds?: { singleToDropdownAt?: number };
    respondentResultsEnabled?: boolean;
    
    // Grouping property
    groupId?: string;
}

// QS Types (formerly QV)
export interface IQsOption {
    questionId: string,
    optionId: string;
    optionName: string;
    description: string;
    position: number;
    group: string;
    votes: number;
    groupPosition?: number;
}

export interface IQuestionGroup {
    id: string;
    title: string;
    description?: string;
    questionIds: string[];
}

export interface ISurvey {
    metadata: IMetadata;
    description: string;
    questionOrder: string[];
    questions: {
        loaded: boolean;
        byId: {
            [key: string]: IQuestion
        }
    };
    surveyResponses: {
        [key: string]: string
    };
    questionGroups?: IQuestionGroup[];
}
