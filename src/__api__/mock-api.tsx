export const sampleSurvey = {
    metadata: {
        surveyStatus: "Incomplete",
    },    
    questions: {
        byId: {
            "q001": {
                questionID: "q001",
                questionDescription: "this is a question description",
                type: "QV",
                status: "Incomplete",
                qvOptions: ["qvoid11", "mc12", "mc23", "tf14", "tf25"],
                remainingCredit: 30
            }
        },
        allIds: ["q001"]
    },
    qvOptions: {
        byId: {
            "qvoid11": {
                questionID: "q001",
                optionID: "qvoid11",
                text: "mc12 -- text",
                description: "description",
                position: 1,
                group: "Positive",
                votes: 4
            },
            "mc12": {
                questionID: "q001",
                optionID: "mc12",
                text: "mc12 -- text",
                description: "description 1",
                position: 2,
                group: "Neutral",
                votes: -2
            },
            "mc23": {
                questionID: "q001",
                optionID: "mc23",
                text: "mc23 -- text",
                description: "description 2",
                position: 3,
                group: "Negative",
                votes: 2
            },
            "tf14": {
                questionID: "q001",
                optionID: "tf14",
                text: "tf14 -- text",
                description: "",
                position: 4,
                group: "",
                votes: -3
            },
            "tf25": {
                questionID: "q001",
                optionID: "tf25",
                text: "tf25 -- text",
                description: "",
                position: 5,
                group: "",
                votes: 5
            }
        },
    },
    user: {
        userid: ""
    }
}

export const mockApi = (data: any) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data);
      }, 1000);
    });
  };