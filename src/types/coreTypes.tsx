import {Types} from 'mongoose';
import { IBackendQsOptions } from './backendTypes';


export interface IMetadata {
    isAvailable: Boolean;
    uuid: string;
    startTime: string;
    endTime: string;
}

export interface IQuestion {
    question: string;
    questionId: string | Types.ObjectId;
    description: string;
    type: string;
    status: string;
    position?: number; // this should be fixed to not optional
    
    options?: string[];
    totalCredits?: number;
    rawOptions?: IBackendQsOptions[];
    
    // Likert specific properties
    scale?: string[];
    minLabel?: string;
    maxLabel?: string;
    
    // Text specific properties
    multiline?: boolean;
    maxLength?: number;
    
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

export interface IQsOptionsSlice {
    loaded: boolean;
    byId: {
        [key: string]: IQsOption
    };
    positions: {
        [key: string]: string[]
    };
    categorySequence: {
        hasUndecided: boolean;
        hasSkip: boolean;
        userDefinedCategories: string[];
        currentViewCategories: string[];
    };
    metadata: {
        onHoverOptionId: string | null;
    };
    responseStatus?: {
        submitted: boolean;
        surveyResponseId: string | null;
        uuid?: string;
        questionResponseIds: {
            [key: string]: string;
        };
        error: any | null;
    }
}

export interface IqsOptionsSlice extends IQsOptionsSlice {} // Alias for backward compatibility

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
    QsOptions: IqsOptionsSlice; // Keeping this as QsOptions for backward compatibility
    qsOptions?: IQsOptionsSlice; // New property for QS options
    surveyResponses: {
        [key: string]: string
    };
    questionGroups?: IQuestionGroup[];
}


