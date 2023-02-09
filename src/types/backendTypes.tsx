export interface IBackendQuestion {
    _id: string; // notsure if there are instances that is a ObjectId
    description: string;
    options: IBackendQVOptions[];
    question: string;
    setting: IBackendQVSetting;
    type: string;
    position?: number; // this should be fixed to not optional
}

export interface IBackendQVSetting {
    questionType: string;
    totalCredits: number;
    version: number;
}

export interface IBackendQVOptions {
    optionId: string;
    description: string;
    optionName: string;
}