export type SurveyLocale = 'en-US' | 'zh-TW';

export type QvCanonicalBin =
  | 'Positive'
  | 'Neutral'
  | 'Negative'
  | 'Undecided'
  | 'Skip';

export interface QvLabelOverrides {
  binLabels?: Partial<Record<QvCanonicalBin, string>>;
  votePositive?: string;
  voteNegative?: string;
  voteNone?: string;
  sortByVotes?: string;
}

export interface QvAliases {
  binLabels: Record<QvCanonicalBin, string>;
  votePositive: string;
  voteNegative: string;
  voteNone: string;
  sortByVotes: string;
}

export interface QvStaticLabels {
  quadraticSurvey: string;
  welcomeTitle: string;
  instructionsPhase: string;
  organizationPhase: string;
  votingPhase: string;
  organizeBackToInstructions: string;
  voteBackToWelcome: string;
  voteBackToOrganization: string;
  beginSurvey: string;
  votingNext: string;
  nextQuestion: string;
  submit: string;
  submitting: string;
  remainingCredits: string;
  creditNotSufficient: string;
  unorganizedOptions: string;
  duplicateSubmitted: string;
  submitNewResponse: string;
  closeSurvey: string;
  exitSurvey: string;
  loadingSurvey: string;
  surveyCompleteTitle: string;
  surveyCompleteHeading: string;
  surveySubmitted: string;
  returnHome: string;
  seeResults: string;
  hideResults: string;
  resultsUuidUnavailable: string;
  goToHomepage: string;
  systemName: string;
  insufficientCreditsError: string;
  organizeInstructionLead: string;
  organizeInstructionBody: string;
  votingInstruction: (totalCredits: number) => string;
  leanPrefix: string;
  skippedOrUndecided: string;
  allOptions: string;
  noMoreOptionsToRate: string;
  moreOptionsToRate: (count: number) => string;
  lastOptionToRate: string;
  skippedOptionsCount: (count: number) => string;
  showSkippedOptions: string;
  hideSkippedOptions: string;
  emptyGroupLine1: string;
  emptyGroupLine2: string;
  skipThisOption: string;
  returnToUndecided: string;
  reassign: string;
  resultsSubmission: string;
  resultsQuestion: string;
  refreshResults: string;
  loadingAvailableResults: string;
  loadingAggregatedResults: string;
  resultsUnsupported: string;
  resultsGroupSums: string;
  results: string;
  chart: string;
  table: string;
  dots: string;
  optionTotalsView: string;
  showChartView: string;
  showTableView: string;
  showDotsView: string;
  orderBy: string;
  orderOptionsBy: string;
  orderResultsBy: string;
  total: string;
  variance: string;
  range: string;
  noGroupResponses: string;
  noVotesRecorded: string;
  option: string;
  totalVotes: string;
  yourVote: string;
  othersVote: string;
  resetFilters: string;
  filteredCount: (count: number) => string;
}

export interface ResolvedQvLabels {
  locale: SurveyLocale;
  aliases: QvAliases;
  text: QvStaticLabels;
}

export const DEFAULT_SURVEY_LOCALE: SurveyLocale = 'en-US';
export const SUPPORTED_SURVEY_LOCALES: SurveyLocale[] = ['en-US', 'zh-TW'];

export const DEFAULT_QV_ALIASES_BY_LOCALE: Record<SurveyLocale, QvAliases> = {
  'en-US': {
    binLabels: {
      Positive: 'Positive',
      Neutral: 'Neutral',
      Negative: 'Negative',
      Undecided: 'Undecided',
      Skip: 'Skip',
    },
    votePositive: 'upvote',
    voteNegative: 'downvote',
    voteNone: 'No votes',
    sortByVotes: 'Sort by Votes',
  },
  'zh-TW': {
    binLabels: {
      Positive: '正向',
      Neutral: '中立',
      Negative: '負向',
      Undecided: '尚未決定',
      Skip: '暫時略過',
    },
    votePositive: '支持票',
    voteNegative: '反對票',
    voteNone: '未投票',
    sortByVotes: '依票數排序',
  },
};

export const QV_STATIC_LABELS_BY_LOCALE: Record<SurveyLocale, QvStaticLabels> = {
  'en-US': {
    quadraticSurvey: 'Quadratic Survey',
    welcomeTitle: 'Welcome to the Survey',
    instructionsPhase: 'Instructions',
    organizationPhase: 'Organization Phase',
    votingPhase: 'Voting',
    organizeBackToInstructions: '← Instructions',
    voteBackToWelcome: '← Welcome',
    voteBackToOrganization: '← Organization',
    beginSurvey: 'Begin Survey →',
    votingNext: 'Voting →',
    nextQuestion: 'Next Question →',
    submit: 'Submit',
    submitting: 'Submitting...',
    remainingCredits: 'Remaining Credits',
    creditNotSufficient: 'Credit not sufficient',
    unorganizedOptions: 'There are still unorganized options',
    duplicateSubmitted: 'It seems like you have submitted the survey somewhere else',
    submitNewResponse: 'Submit new response to the survey',
    closeSurvey: 'Close this survey',
    exitSurvey: 'Exit survey',
    loadingSurvey: 'Loading survey...',
    surveyCompleteTitle: 'Survey Complete - QSurvey System',
    surveyCompleteHeading: 'Thank you for completing the survey!',
    surveySubmitted: 'Your responses have been submitted successfully.',
    returnHome: 'Return to Home',
    seeResults: 'See Results',
    hideResults: 'Hide Results',
    resultsUuidUnavailable:
      'Submitted results become available once your submission UUID is available.',
    goToHomepage: 'Go to homepage',
    systemName: 'Quadratic Survey System',
    insufficientCreditsError: "You don't have enough credits. Please reduce some votes.",
    organizeInstructionLead: 'organize your thoughts',
    organizeInstructionBody:
      'we ask your preference toward each option. Your indication does not affect the final submitted result. You can alter your selection as you wish. Options within groups are draggable. Click Next to proceed to the voting phase.',
    votingInstruction: (totalCredits: number) =>
      `You have ${totalCredits} credits to distribute. You can vote on each option by clicking the dropdown menu when you hover over the option.`,
    leanPrefix: 'Lean',
    skippedOrUndecided: 'Skipped or Undecided',
    allOptions: 'All Options',
    noMoreOptionsToRate: 'No more options to rate',
    moreOptionsToRate: (count: number) =>
      `There are ${count} more options, rating the next option:`,
    lastOptionToRate: 'Last option to rate:',
    skippedOptionsCount: (count: number) => `You skipped ${count} options`,
    showSkippedOptions: 'Show Skipped Options',
    hideSkippedOptions: 'Hide Skipped Options',
    emptyGroupLine1: 'No options in this group.',
    emptyGroupLine2: 'Rate your next option.',
    skipThisOption: 'Skip this option for now',
    returnToUndecided: 'Return to undecided list',
    reassign: 'Reassign',
    resultsSubmission: 'Submission',
    resultsQuestion: 'Question',
    refreshResults: 'Refresh Results',
    loadingAvailableResults: 'Loading available results...',
    loadingAggregatedResults: 'Loading aggregated results...',
    resultsUnsupported:
      'Visualization for this question type is not supported yet. Only Quadratic Survey, Likert, Selection, and Approval questions are currently available.',
    resultsGroupSums: 'Results: Group Sums and your influence',
    results: 'Results',
    chart: 'Chart',
    table: 'Table',
    dots: 'Dots',
    optionTotalsView: 'Option totals view',
    showChartView: 'Show chart view',
    showTableView: 'Show table view',
    showDotsView: 'Show dots view',
    orderBy: 'Order by',
    orderOptionsBy: 'Order options by',
    orderResultsBy: 'Order results by',
    total: 'Total',
    variance: 'Variance',
    range: 'Range',
    noGroupResponses: 'No group responses yet.',
    noVotesRecorded: 'No votes have been recorded yet for this question.',
    option: 'Option',
    totalVotes: 'Total votes',
    yourVote: 'Your vote',
    othersVote: "Others' vote",
    resetFilters: 'Reset Filters',
    filteredCount: (count: number) => `Filtered: ${count}`,
  },
  'zh-TW': {
    quadraticSurvey: '平方問卷',
    welcomeTitle: '歡迎填寫問卷',
    instructionsPhase: '說明',
    organizationPhase: '組織想法',
    votingPhase: '投票',
    organizeBackToInstructions: '← 說明',
    voteBackToWelcome: '← 歡迎頁',
    voteBackToOrganization: '← 組織想法',
    beginSurvey: '開始問卷 →',
    votingNext: '前往投票 →',
    nextQuestion: '下一題 →',
    submit: '送出',
    submitting: '送出中...',
    remainingCredits: '剩餘點數',
    creditNotSufficient: '點數不足',
    unorganizedOptions: '仍有尚未分類的選項',
    duplicateSubmitted: '你似乎已經在其他地方送出這份問卷',
    submitNewResponse: '重新填寫一份回覆',
    closeSurvey: '關閉問卷',
    exitSurvey: '離開問卷',
    loadingSurvey: '正在載入問卷...',
    surveyCompleteTitle: '問卷完成 - QSurvey System',
    surveyCompleteHeading: '感謝你完成問卷！',
    surveySubmitted: '你的回覆已成功送出。',
    returnHome: '回到首頁',
    seeResults: '查看結果',
    hideResults: '隱藏結果',
    resultsUuidUnavailable: '送出識別碼可用後，即可查看已送出的結果。',
    goToHomepage: '前往首頁',
    systemName: '平方問卷系統',
    insufficientCreditsError: '你的點數不足。請降低部分投票數。',
    organizeInstructionLead: '組織你的想法',
    organizeInstructionBody:
      '請先表示你對每個選項的初步偏好。這個分類不會影響最後送出的結果，你稍後仍可拖曳選項調整位置。完成後請按下一步前往投票階段。',
    votingInstruction: (totalCredits: number) =>
      `你有 ${totalCredits} 點可分配。將滑鼠移到選項上，並點選下拉選單即可調整投票數。`,
    leanPrefix: '偏向',
    skippedOrUndecided: '暫時略過或尚未決定',
    allOptions: '所有選項',
    noMoreOptionsToRate: '沒有更多選項需要評估',
    moreOptionsToRate: (count: number) => `還有 ${count} 個選項，請評估下一個選項：`,
    lastOptionToRate: '最後一個要評估的選項：',
    skippedOptionsCount: (count: number) => `你已暫時略過 ${count} 個選項`,
    showSkippedOptions: '顯示略過的選項',
    hideSkippedOptions: '隱藏略過的選項',
    emptyGroupLine1: '此群組目前沒有選項。',
    emptyGroupLine2: '請評估下一個選項。',
    skipThisOption: '暫時略過此選項',
    returnToUndecided: '回到尚未決定清單',
    reassign: '重新分類',
    resultsSubmission: '送出紀錄',
    resultsQuestion: '題目',
    refreshResults: '重新整理結果',
    loadingAvailableResults: '正在載入可檢視的結果...',
    loadingAggregatedResults: '正在載入彙整結果...',
    resultsUnsupported: '此題型尚不支援視覺化。目前可檢視平方問卷、李克特量表、選擇題與同意投票題。',
    resultsGroupSums: '結果：群組總和與你的影響',
    results: '結果',
    chart: '圖表',
    table: '表格',
    dots: '點圖',
    optionTotalsView: '選項總和檢視',
    showChartView: '顯示圖表檢視',
    showTableView: '顯示表格檢視',
    showDotsView: '顯示點圖檢視',
    orderBy: '排序依據',
    orderOptionsBy: '排序選項',
    orderResultsBy: '排序結果',
    total: '總和',
    variance: '變異',
    range: '範圍',
    noGroupResponses: '目前沒有群組回覆。',
    noVotesRecorded: '此題目前尚未記錄任何投票。',
    option: '選項',
    totalVotes: '總票數',
    yourVote: '你的投票',
    othersVote: '其他人的投票',
    resetFilters: '重設篩選',
    filteredCount: (count: number) => `已篩選：${count}`,
  },
};

const trimToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeSurveyLocale = (raw: unknown): SurveyLocale => {
  return SUPPORTED_SURVEY_LOCALES.includes(raw as SurveyLocale)
    ? (raw as SurveyLocale)
    : DEFAULT_SURVEY_LOCALE;
};

export const resolveQvLabels = (
  localeInput?: unknown,
  overrides?: QvLabelOverrides,
): ResolvedQvLabels => {
  const locale = normalizeSurveyLocale(localeInput);
  const defaults = DEFAULT_QV_ALIASES_BY_LOCALE[locale];
  const enDefaults = DEFAULT_QV_ALIASES_BY_LOCALE[DEFAULT_SURVEY_LOCALE];

  const binLabels = (Object.keys(enDefaults.binLabels) as QvCanonicalBin[]).reduce(
    (acc, binId) => {
      acc[binId] =
        trimToUndefined(overrides?.binLabels?.[binId]) ||
        defaults.binLabels[binId] ||
        enDefaults.binLabels[binId];
      return acc;
    },
    {} as Record<QvCanonicalBin, string>,
  );

  return {
    locale,
    aliases: {
      binLabels,
      votePositive:
        trimToUndefined(overrides?.votePositive) ||
        defaults.votePositive ||
        enDefaults.votePositive,
      voteNegative:
        trimToUndefined(overrides?.voteNegative) ||
        defaults.voteNegative ||
        enDefaults.voteNegative,
      voteNone:
        trimToUndefined(overrides?.voteNone) ||
        defaults.voteNone ||
        enDefaults.voteNone,
      sortByVotes:
        trimToUndefined(overrides?.sortByVotes) ||
        defaults.sortByVotes ||
        enDefaults.sortByVotes,
    },
    text: QV_STATIC_LABELS_BY_LOCALE[locale] || QV_STATIC_LABELS_BY_LOCALE[DEFAULT_SURVEY_LOCALE],
  };
};

export const formatQvVote = (value: number, labels: QvAliases): string => {
  if (value > 0) {
    const unit = labels.votePositive;
    return value === 1 && unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].votePositive
      ? `1 ${unit}`
      : `${value} ${unit}${unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].votePositive && value !== 1 ? 's' : ''}`;
  }
  if (value < 0) {
    const count = Math.abs(value);
    const unit = labels.voteNegative;
    return count === 1 && unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].voteNegative
      ? `1 ${unit}`
      : `${count} ${unit}${unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].voteNegative && count !== 1 ? 's' : ''}`;
  }
  return labels.voteNone;
};

export const getQvBinLabel = (binId: string, labels: QvAliases): string => {
  return labels.binLabels[binId as QvCanonicalBin] || binId;
};

export const makeDefaultQvLabelOverrides = (
  localeInput?: unknown,
): QvLabelOverrides => {
  const locale = normalizeSurveyLocale(localeInput);
  const defaults = DEFAULT_QV_ALIASES_BY_LOCALE[locale];
  return {
    binLabels: { ...defaults.binLabels },
    votePositive: defaults.votePositive,
    voteNegative: defaults.voteNegative,
    voteNone: defaults.voteNone,
    sortByVotes: defaults.sortByVotes,
  };
};

export const isKnownDefaultQvAlias = (value: unknown): boolean => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return true;
  return Object.values(DEFAULT_QV_ALIASES_BY_LOCALE).some((defaults) => {
    const directValues = [
      defaults.votePositive,
      defaults.voteNegative,
      defaults.voteNone,
      defaults.sortByVotes,
    ];
    const binValues = Object.values(defaults.binLabels);
    return [...directValues, ...binValues].includes(trimmed);
  });
};

export const reseedQvLabelOverridesForLocale = (
  current: QvLabelOverrides | undefined,
  nextLocaleInput: unknown,
): QvLabelOverrides => {
  const next = makeDefaultQvLabelOverrides(nextLocaleInput);
  if (!current) return next;

  const binLabels = (Object.keys(next.binLabels || {}) as QvCanonicalBin[]).reduce(
    (acc, binId) => {
      const currentValue = current.binLabels?.[binId];
      acc[binId] = isKnownDefaultQvAlias(currentValue)
        ? next.binLabels?.[binId]
        : currentValue;
      return acc;
    },
    {} as Partial<Record<QvCanonicalBin, string>>,
  );

  return {
    binLabels,
    votePositive: isKnownDefaultQvAlias(current.votePositive)
      ? next.votePositive
      : current.votePositive,
    voteNegative: isKnownDefaultQvAlias(current.voteNegative)
      ? next.voteNegative
      : current.voteNegative,
    voteNone: isKnownDefaultQvAlias(current.voteNone)
      ? next.voteNone
      : current.voteNone,
    sortByVotes: isKnownDefaultQvAlias(current.sortByVotes)
      ? next.sortByVotes
      : current.sortByVotes,
  };
};
