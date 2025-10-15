export interface SubmitterQuestionResponse {
  _id: string;
  questionId: string;
  createdTime: string | null;
  responseContent: any;
}

export interface SubmitterSnapshot {
  surveyResponseId: string;
  uuid: string;
  uKey?: string | null;
  surveyId: string;
  status: string;
  endTime: string | null;
  submittedAt: string | null;
  respondentId: string | null;
  questionResponses: SubmitterQuestionResponse[];
}
