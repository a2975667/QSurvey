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
  questionType?: string;
  asOf?: string | null;
}

export interface RawVoteRow {
  respondentId: string;
  responseId: string;
  optionId?: string;
  optionName?: string;
  vote?: number;
  selection?: string;
  text?: string;
  at: string | null;
}

export interface SurveyResultsResponse {
  meta: ResultsMeta;
  raw: RawVoteRow[];
  nextCursor?: string | null;
}
