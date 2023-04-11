import {Types} from 'mongoose';
import { IBackendQVOptions } from './backendTypes';


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
    options?: string[];
    totalCredits: number;
    position?: number; // this should be fixed to not optional
    rawOptions?: IBackendQVOptions[];
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
    },
    categorySequence: [string],
}

export interface ISurvey{
    metadata: IMetadata;
    description: string;
    questionOrder: string[];
    questions: {
        loaded: boolean;
        byId: {
            [key: string]: IQuestion
        }
    };
    qvOptions: IQvOptionsSlice;
    surveyResponses: {
        [key: string]: string
    }
}


