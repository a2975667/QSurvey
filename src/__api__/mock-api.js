export const sampleSurvey = {
    status: "Incomplete",
    questions: [                                              
        {
            questionID: "q001",
            questionDescription: "this is a question description",
            type: "QV",
            status: "Incomplete",
            options:[                                         
                {
                    optionID: "qvoid11",
                    text: "mc12 -- text",
                    description: "description",
                    position: 1,
                    group: "Positive",
                    votes: 4
                },
                {
                    optionID: "mc12",
                    text: "mc12 -- text",
                    description: "description 1",
                    position: 2,
                    group: "Neutral",
                    votes: -2
                },
                {
                    optionID: "mc23",
                    text: "mc23 -- text",
                    description: "description 2",
                    position: 3,
                    group: "Negative",
                    votes: 2
                },
                {
                    optionID: "tf14",
                    text: "tf14 -- text",
                    description: "",
                    position: 4,
                    group: "",
                    votes: -3
                },
                {
                    optionID: "tf25",
                    text: "tf25 -- text",
                    description: "",
                    position: 5,
                    group: "",
                    votes: 5
                }
            ],
            remainingCredit: 30
        }
    ],
    user: {
        userid: ""
    }
}