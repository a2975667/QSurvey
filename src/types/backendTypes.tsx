export interface IBackendQuestion {
    _id: string; // notsure if there are instances that is a ObjectId
    description: string;
    options: IBackendQVOptions[];
    questions: string[];
    setting: IBackendQVSetting;
    type: string;
    position?: number; // this should be fixed to not optional
}

export interface IBackendQVSetting {
    questionType: string;
    totalCredits: number;
    version: number;
    isAvailable: boolean;
}

export interface IBackendQVOptions {
    optionId: string;
    description: string;
    optionName: string;
}

export interface IBackendSurvey {
    _id: string;
    title: string;
    description: string;
    tags: string[];
    questions: IBackendQuestion[];
    settings: IBackendSurveySettings;
    __v: number;
  }

export interface IBackendSurveySettings {
    hasSKey: boolean;
    sKeyValue: string;
    hasUKey: boolean;
    isAvailable: boolean;
  }
