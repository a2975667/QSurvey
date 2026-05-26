import { IBackendQuestion, IBackendQVPlusSetting } from '../../../types/backendTypes';
import { QvPlusQuestionState } from '../../../types/responseTypes';
import { fetchSampleQuestions } from '../../../features/questionsSlice';
import { setMetadataFromSurvey } from '../../../features/metadataSlice';
import {
  startSurveySession,
  syncQvNavigator,
  seedQvQuestion,
  qvSetBinsConfig,
  seedQvPlusQuestion,
} from '../../../features/unifiedResponsesSlice';
import type { AppDispatch } from '../../../app/store';



// Mock QVPlus question, pretending it came from the backend.
// Used by SelectionView during Phase A (UI prototype) before Redux/backend wiring exists.
export const MOCK_QVPLUS_QUESTION: IBackendQuestion = {
  _id: 'mock-qvplus-q1',
  question: '在烹飪過程中，哪些動作你會希望有 AI 助手幫忙？',
  description: '對以下烹飪動作進行排序投票，然後針對你支持/反對的項目補充原因',
  type: 'qvplus',
  position: 1,
  options: [
    {
      optionId: 'opt-1',
      optionName: '拿',
      description: '拿起 / 取出（餐具廚具、食材、雜物），舀（食材、液體、粉末）、聚集（細碎食材）',
    },
    {
      optionId: 'opt-2',
      optionName: '加入 / 混合',
      description: '倒入 / 加入（水、油、醬料、食材下鍋），混合 / 攪拌 / 沾 / 醃（食材、醬料、醃料）',
    },
    {
      optionId: 'opt-3',
      optionName: '開 / 拆封',
      description: '打開（櫃子抽屜、冰箱、蓋子罐子），開啟（水龍頭、開關、家電），拆開 / 拆封（食材包裝、袋子）',
    },
    {
      optionId: 'opt-4',
      optionName: '放 / 掛',
      description: '放下 / 放進（餐具、食材、雜物），掛（抹布、雜物）',
    },
    {
      optionId: 'opt-5',
      optionName: '塗 / 撒',
      description: '塗抹（奶油、醬料）、撒（調味料、麵粉、起司）',
    },
    {
      optionId: 'opt-6',
      optionName: '感知',
      description: '輕敲 / 輕拍（肉類、麵團），摸 / 吃 / 喝 / 聞',
    },
  ],
  setting: {
    questionType: 'qvplus',
    totalCredits: 100,
    version: 1,
    isAvailable: true,
    showInstructions: true,
    rounds: [
      {
        roundId: 'round-1',
        title: '一般情境下',
        description: '針對你支持或反對的動作，請描述你預期 AI 助手該怎麼介入',
        requiredVoteFilter: 'both',
        followupQuestions: [
          {
            followupId: 'fu-1',
            prompt: '預期的幫助形式',
            choices: [
              { choiceId: 'c-1a', label: '畫面幫助' },
              { choiceId: 'c-1b', label: '實體幫助' },
            ],
          },
          {
            followupId: 'fu-2',
            prompt: '預期的主動程度',
            choices: [
              { choiceId: 'c-2a', label: '被動等待' },
              { choiceId: 'c-2b', label: '主動確認' },
              { choiceId: 'c-2c', label: '主動幫助' },
            ],
          },
        ],
      },
      {
        roundId: 'round-2',
        title: '時間有限的情境下',
        description: '同樣的動作，但你正在趕時間完成烹飪，預期會有什麼不同？',
        requiredVoteFilter: 'both',
        followupQuestions: [
          {
            followupId: 'fu-3',
            prompt: '預期的幫助形式',
            choices: [
              { choiceId: 'c-3a', label: '畫面幫助' },
              { choiceId: 'c-3b', label: '實體幫助' },
            ],
          },
          {
            followupId: 'fu-4',
            prompt: '預期的主動程度',
            choices: [
              { choiceId: 'c-4a', label: '被動等待' },
              { choiceId: 'c-4b', label: '主動確認' },
              { choiceId: 'c-4c', label: '主動幫助' },
            ],
          },
        ],
      },
    ],
  } as IBackendQVPlusSetting,
};


// Mock Redux state at the moment the respondent finishes voting and enters Stage 3.
// Designed to exercise multiple UI states in SelectionView:
//   opt-1 (Positive +3)  -> required, long name
//   opt-2 (Positive  0)  -> grayed-out (organized into Positive but no votes spent)
//   opt-3 (Negative -2)  -> required, long name
//   opt-4 (Neutral  +1)  -> required (slight positive vote), medium name
//   opt-5 (Skip      0)  -> grayed-out, short name
//   opt-6 (Skip      0)  -> grayed-out, short name
export const MOCK_QVPLUS_STATE: QvPlusQuestionState = {
  type: 'qvplus',
  questionId: 'mock-qvplus-q1',
  totalCredits: 100,
  options: {
    'opt-1': { optionId: 'opt-1', optionName: '拿',          group: 'Positive', groupPosition: 0, globalPosition: 0, votes:  3 },
    'opt-2': { optionId: 'opt-2', optionName: '加入 / 混合', group: 'Positive', groupPosition: 1, globalPosition: 1, votes:  0 },
    'opt-3': { optionId: 'opt-3', optionName: '開 / 拆封',   group: 'Negative', groupPosition: 0, globalPosition: 2, votes: -2 },
    'opt-4': { optionId: 'opt-4', optionName: '放 / 掛',     group: 'Neutral',  groupPosition: 0, globalPosition: 3, votes:  1 },
    'opt-5': { optionId: 'opt-5', optionName: '塗 / 撒',     group: 'Skip',     groupPosition: 0, globalPosition: 4, votes:  0 },
    'opt-6': { optionId: 'opt-6', optionName: '感知',        group: 'Skip',     groupPosition: 1, globalPosition: 5, votes:  0 },
  },
  positionsByGroup: {
    Positive: ['opt-1', 'opt-2'],
    Negative: ['opt-3'],
    Neutral:  ['opt-4'],
    Skip:     ['opt-5', 'opt-6'],
  },
  categoriesOrder: ['Positive', 'Negative', 'Neutral', 'Skip'],
  bins: { hasUndecided: false, hasSkip: true, userDefined: [] },
  // Simulates the moment the respondent has just voted and is entering round-1's selection page.
  // No voteSnapshot yet (snapshot happens on Next from vote stage); no followup answers yet.
  rounds: {
    'round-1': {
      followupAnswers: {},
    },
  },
  activeRoundId: 'round-1',
};

// A second mock question — a plain QV (no rounds/selection). Used together with
// MOCK_QVPLUS_QUESTION to exercise the "QV → QVPlus" transition in the dev survey.
export const MOCK_QV_QUESTION: IBackendQuestion = {
  _id: 'mock-qv-q1',
  question: '哪些料理類型你最有興趣 AI 幫忙？',
  description: '對以下料理類型進行排序投票（QV 純粹版）',
  type: 'qv',
  position: 0,
  options: [
    { optionId: 'qv-opt-1', optionName: '中式炒菜', description: '快炒、燴煮' },
    { optionId: 'qv-opt-2', optionName: '烘焙',     description: '烤箱料理、麵包甜點' },
    { optionId: 'qv-opt-3', optionName: '義式料理', description: '義大利麵、披薩' },
    { optionId: 'qv-opt-4', optionName: '日式料理', description: '丼飯、湯品' },
  ],
  setting: {
    questionType: 'qv',
    totalCredits: 100,
    version: 1,
    isAvailable: true,
    showInstructions: true,
  },
};

// Mock survey containing both questions (QV first, QVPlus second). The dev page
// uses this to simulate the SurveyView entry without hitting any backend API.
export const MOCK_SURVEY = {
  _id: 'mock-survey-1',
  title: 'QVPlus dev survey',
  description: 'A dev-only survey with one QV question followed by one QVPlus question.',
  tags: ['dev'],
  questions: [MOCK_QV_QUESTION, MOCK_QVPLUS_QUESTION],
  settings: {
    hasSKey: false,
    sKeyValue: '',
    hasUKey: false,
    isAvailable: true,
  },
  __v: 0,
};


// Bootstrap helper — call this from the dev container's useEffect to populate
// the Redux store with mock data, mimicking what SurveyView does on mount but
// without making any backend API calls.
export const bootstrapMockQvPlusSurvey = (dispatch: AppDispatch) => {
  const surveyId = MOCK_SURVEY._id;
  const userDefined = ['Positive', 'Neutral', 'Negative'];
  const categoriesOrder = ['Undecided', ...userDefined, 'Skip'];

  // (1) Populate state.questions by faking the fetch's fulfilled action.
  dispatch(
    fetchSampleQuestions.fulfilled(
      MOCK_SURVEY.questions,
      'mock-bootstrap',
      surveyId,
    ),
  );

  // (2) Populate state.metadata (surveyId, title).
  dispatch(setMetadataFromSurvey(MOCK_SURVEY));

  // (3) Open the survey session — sets state.unifiedResponses.surveyId and status.
  dispatch(startSurveySession({ surveyId, surveyResponseId: null }));

  // (4) Set up QV navigator — both QV and QVPlus questions go through this navigator
  //     because QVPlus reuses QV's organize+vote flow.
  dispatch(
    syncQvNavigator({
      order: [MOCK_QV_QUESTION._id, MOCK_QVPLUS_QUESTION._id],
      activeQuestionId: MOCK_QV_QUESTION._id,
    }),
  );

  // (5) Seed the QV question's initial state.
  dispatch(
    seedQvQuestion({
      questionId: MOCK_QV_QUESTION._id,
      totalCredits: (MOCK_QV_QUESTION.setting as { totalCredits: number }).totalCredits,
      categories: categoriesOrder,
      options: (MOCK_QV_QUESTION.options ?? []).map((opt, idx) => ({
        optionId: opt.optionId,
        optionName: opt.optionName,
        groupPosition: idx,
        globalPosition: idx,
        votes: 0,
      })),
    }),
  );
  // (6) Set the QV question's bins config (organize stage needs this).
  dispatch(
    qvSetBinsConfig({
      questionId: MOCK_QV_QUESTION._id,
      bins: { hasUndecided: true, hasSkip: true, userDefined },
      categoriesOrder,
    }),
  );

  // (7) Seed the QVPlus question's initial state, including all rounds and followups.
  const qvPlusSetting = MOCK_QVPLUS_QUESTION.setting as IBackendQVPlusSetting;
  dispatch(
    seedQvPlusQuestion({
      questionId: MOCK_QVPLUS_QUESTION._id,
      totalCredits: qvPlusSetting.totalCredits,
      categories: categoriesOrder,
      options: (MOCK_QVPLUS_QUESTION.options ?? []).map((opt, idx) => ({
        optionId: opt.optionId,
        optionName: opt.optionName,
        groupPosition: idx,
        globalPosition: idx,
        votes: 0,
      })),
      rounds: qvPlusSetting.rounds.map((r) => ({
        roundId: r.roundId,
        followupIds: r.followupQuestions.map((fu) => fu.followupId),
      })),
    }),
  );
  // (8) Set the QVPlus question's bins (same as QV).
  dispatch(
    qvSetBinsConfig({
      questionId: MOCK_QVPLUS_QUESTION._id,
      bins: { hasUndecided: true, hasSkip: true, userDefined },
      categoriesOrder,
    }),
  );
};
