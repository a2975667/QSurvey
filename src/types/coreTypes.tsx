import {Types} from 'mongoose';

export interface qvOption {
    questionId: string | Types.ObjectId,
    optionId: string;
    text: string;
    description: string;
    position: number;
    group: string;
    votes: number;
}


export interface question {
    questionId: string | Types.ObjectId;
    description: string;
    type: string;
    status: string;
    options?: qvOption[];
    totalCredits: number;
}


