import {Types} from 'mongoose';


export interface IMetadata {
    isAvailable: Boolean;
    uuid: string;
    startTime: string;
    endTime: string;
}

export interface IQuestion {
    questionId: string | Types.ObjectId;
    description: string;
    type: string;
    status: string;
    options?: string[];
    totalCredits: number;
    position?: number; // this should be fixed to not optional
}

export interface IQvOption {
    questionId: string,
    optionId: string;
    optionName: string;
    description: string;
    position: number;
    group: string;
    votes: number;
    groupPosition?: number;
}

export interface IQvOptionsSlice {
    loaded: boolean;
    byId: {
        [key: string]: IQvOption
    },
    positions: {
        [key: string]: string[]
    }
}

export interface ISurvey{
    metadata: IMetadata;
    description: string;
    questionOrder: string[];
    questions: {
        loaded: boolean;
        byId: {
            [key: string]: IQuestion
        },
        positions: {
            [key: string]: string[]
        }
    };
    qvOptions: IQvOptionsSlice;
    surveyResponses: {
        [key: string]: string
    }
}


