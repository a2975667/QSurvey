export interface OptionTotal {
  optionId: string;
  optionName: string;
  sum: number;
}

export interface ResultsCounts {
  responses: number;
  votes: number;
  statusFilter: string;
}

export interface ResultsMeta {
  surveyId: string;
  questionId: string;
  optionTotals: OptionTotal[];
  grandTotal: number;
  counts: ResultsCounts;
  asOf?: string | null;
}

export interface RawVoteRow {
  respondentId: string;
  responseId: string;
  optionId: string;
  vote: number;
  at: string | null;
}

export interface SurveyResultsResponse {
  meta: ResultsMeta;
  raw: RawVoteRow[];
  nextCursor?: string | null;
}
