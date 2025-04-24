import { ISurvey } from "../types/coreTypes";

export const sampleSurvey = {
    metadata: {
        isAvailable: true,
        uuid: "",
        startTime: "",
        endTime: "",
    },
    description: "This is a sample survey", // no need to care now
    questionOrder: ["q001"],
    questions: {
        "q001": {
            questionId: "q001",
            description: "this is a question description",
            type: "qv",
            status: "Incomplete",
            options: ["qvoid11", "mc12", "mc23", "tf14", "tf25"],
            totalCredits: 100
        }
    },
    qsOptions: {
        "qvoid11": {
            questionId: "q001",
            optionId: "qvoid11",
            optionName: "mc12 -- text",
            description: "description",
            position: 1,
            group: "Positive",
            votes: 4
        },
        "mc12": {
            questionId: "q001",
            optionId: "mc12",
            optionName: "mc12 -- text",
            description: "description 1",
            position: 2,
            group: "Neutral",
            votes: -2
        },
        "mc23": {
            questionId: "q001",
            optionId: "mc23",
            optionName: "mc23 -- text",
            description: "description 2",
            position: 3,
            group: "Negative",
            votes: 2
        },
        "tf14": {
            questionId: "q001",
            optionId: "tf14",
            optionName: "tf14 -- text",
            description: "",
            position: 4,
            group: "",
            votes: -3
        },
        "tf25": {
            questionId: "q001",
            optionId: "tf25",
            optionName: "tf25 -- text",
            description: "",
            position: 5,
            group: "",
            votes: 5
        }
    },
    surveyResponses: {
        "q001": "responseId"
    }
}

export const mockApi = (data: ISurvey): Promise<ISurvey> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 1000);
    });
};