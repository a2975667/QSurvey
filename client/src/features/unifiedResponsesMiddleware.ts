import { Middleware } from '@reduxjs/toolkit';
import qsOptionsSlice from './qsOptionsSlice';
import {
  qvCalibratePositions,
  qvMergeGroups,
  qvMoveOption,
  qvRegroupAndOrder,
  qvSetBinsConfig,
  qvSetVotes,
  seedQvQuestion,
} from './unifiedResponsesSlice';

const { actions } = qsOptionsSlice;

const ENABLE_UNIFIED_QV = process.env.REACT_APP_ENABLE_UNIFIED_QV !== 'false';

function findQvQuestionIds(state: any): string[] {
  const questionEntries = Object.values(state.questions?.byId || {});
  return questionEntries
    .filter((question: any) => question?.type === 'qv')
    .map((question: any) => question?.questionId || question?._id)
    .filter((questionId: string | undefined) => Boolean(questionId)) as string[];
}

function buildCategoryOrder(state: any, baseOrder?: string[]): string[] {
  const hasUndecided = state.qsOptions.categorySequence?.hasUndecided ?? true;
  const hasSkip = state.qsOptions.categorySequence?.hasSkip ?? true;
  const order = Array.isArray(baseOrder) ? [...baseOrder] : [];

  const ensureAtFront = (category: string) => {
    if (!order.includes(category)) {
      order.unshift(category);
    }
  };

  const ensureAtEnd = (category: string) => {
    if (!order.includes(category)) {
      order.push(category);
    }
  };

  if (hasUndecided) {
    ensureAtFront('Undecided');
  }

  if (hasSkip) {
    ensureAtEnd('Skip');
  }

  return order;
}

const unifiedResponsesMiddleware: Middleware = ({ getState, dispatch }) => (next) => (action) => {
  const prevState = getState();
  const result = next(action);

  if (!ENABLE_UNIFIED_QV) {
    return result;
  }

  const state = getState();

  try {
    switch (action.type) {
      case actions.initQsOptions.type: {
        const questionIds = findQvQuestionIds(state);
        questionIds.forEach((questionId) => {
          const options = Object.values(state.qsOptions.byId || {})
            .filter((option: any) => option?.questionId === questionId)
            .map((option: any) => ({
              optionId: option.optionId,
              optionName: option.optionName,
              group: option.group,
              groupPosition: option.groupPosition ?? 0,
              globalPosition: option.position ?? 0,
              votes: option.votes ?? 0,
            }));

          const rawCategories = state.qsOptions.categorySequence?.currentViewCategories?.length
            ? state.qsOptions.categorySequence.currentViewCategories
            : Object.keys(state.qsOptions.positions || {});
          const categories = buildCategoryOrder(state, rawCategories);

          if (options.length > 0) {
            dispatch(
              seedQvQuestion({
                questionId,
                totalCredits: state.questions.byId?.[questionId]?.totalCredits ?? 0,
                categories,
                options,
              }),
            );

            dispatch(
              qvSetBinsConfig({
                questionId,
                bins: {
                  hasUndecided: state.qsOptions.categorySequence?.hasUndecided ?? true,
                  hasSkip: state.qsOptions.categorySequence?.hasSkip ?? true,
                  userDefined: state.qsOptions.categorySequence?.userDefinedCategories || [],
                },
                categoriesOrder: categories,
              }),
            );
          }
        });
        break;
      }
      case actions.setPositionGroups.type: {
        const questionIds = findQvQuestionIds(state);
        const rawCategories = state.qsOptions.categorySequence?.currentViewCategories || Object.keys(state.qsOptions.positions || {});
        const categories = buildCategoryOrder(state, rawCategories);
        questionIds.forEach((questionId) => {
          dispatch(
            qvSetBinsConfig({
              questionId,
              bins: {
                hasUndecided: state.qsOptions.categorySequence?.hasUndecided ?? true,
                hasSkip: state.qsOptions.categorySequence?.hasSkip ?? true,
                userDefined: state.qsOptions.categorySequence?.userDefinedCategories || [],
              },
              categoriesOrder: categories,
            }),
          );
        });
        break;
      }
      case actions.mergeOptionGroups.type: {
        const { source, target } = action.payload;
        const questionIds = findQvQuestionIds(state);
        questionIds.forEach((questionId) => {
          dispatch(qvMergeGroups({ questionId, source, target }));
        });
        break;
      }
      case actions.calPosition.type: {
        const questionIds = findQvQuestionIds(state);
        questionIds.forEach((questionId) => {
          dispatch(qvCalibratePositions({ questionId }));
        });
        break;
      }
      case actions.updateOptionPosition.type: {
        const { optionId, newCategory, newPosition } = action.payload;
        const option = state.qsOptions.byId?.[optionId];
        const questionId = option?.questionId;
        if (questionId) {
          dispatch(qvMoveOption({ questionId, optionId, toGroup: newCategory, toIndex: newPosition }));
        }
        break;
      }
      case actions.updateOptionGroup.type: {
        const { optionId, newGroup } = action.payload;
        const option = state.qsOptions.byId?.[optionId];
        const questionId = option?.questionId;
        if (questionId) {
          const targetIndex = (state.qsOptions.positions?.[newGroup] || []).indexOf(optionId);
          dispatch(qvMoveOption({ questionId, optionId, toGroup: newGroup, toIndex: Math.max(targetIndex, 0) }));
        }
        break;
      }
      case actions.updateOptionVotes.type: {
        const { optionId, newVote } = action.payload;
        const option = state.qsOptions.byId?.[optionId];
        const questionId = option?.questionId;
        if (questionId) {
          dispatch(qvSetVotes({ questionId, optionId, votes: newVote }));
        }
        break;
      }
      case actions.clearAllOptionVotesByOptionKeys.type: {
        const { optionKeys } = action.payload || {};
        if (Array.isArray(optionKeys)) {
          optionKeys.forEach((optionId: string) => {
            const option = state.qsOptions.byId?.[optionId];
            const questionId = option?.questionId;
            if (questionId) {
              dispatch(qvSetVotes({ questionId, optionId, votes: 0 }));
            }
          });
        }
        break;
      }
      case actions.addOneVoteToAllOptionsByOptionKeys.type: {
        const { optionKeys } = action.payload || {};
        if (Array.isArray(optionKeys)) {
          optionKeys.forEach((optionId: string) => {
            const option = state.qsOptions.byId?.[optionId];
            const questionId = option?.questionId;
            if (questionId) {
              const currentVotes = option?.votes ?? 0;
              dispatch(qvSetVotes({ questionId, optionId, votes: currentVotes + 1 }));
            }
          });
        }
        break;
      }
      case actions.reorderOptions.type: {
        const { curCategory } = action.payload || {};
        const questionIds = findQvQuestionIds(state);
        questionIds.forEach((questionId) => {
          dispatch(qvRegroupAndOrder({ questionId, strategy: 'byVotes' }));
          dispatch(qvCalibratePositions({ questionId }));
        });
        break;
      }
      case actions.regroupAndOrderOptions.type: {
        const questionIds = findQvQuestionIds(state);
        questionIds.forEach((questionId) => {
          dispatch(qvRegroupAndOrder({ questionId, strategy: 'bySign' }));
        });
        break;
      }
      default: {
        break;
      }
    }
  } catch (error) {
    console.error('[UnifiedResponsesMiddleware] Failed to mirror action', action.type, error);
  }

  return result;
};

export default unifiedResponsesMiddleware;
