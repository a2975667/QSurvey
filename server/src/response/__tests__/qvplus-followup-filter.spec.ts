import { answeredQuestion } from '../../../test/participant-response.fixture';

const plainQuestion = { type: 'qv', options: [{ optionId: 'opt-1' }] };
const plusQuestion = {
  type: 'qvplus',
  options: [{ optionId: 'opt-1' }, { optionId: 'opt-2' }],
  setting: {
    rounds: [
      {
        roundId: 'round-1',
        followupQuestions: [
          {
            followupId: 'fu-1',
            choices: [{ choiceId: 'c-1a' }, { choiceId: 'c-1b' }],
          },
        ],
      },
      {
        roundId: 'round-2',
        followupQuestions: [
          { followupId: 'fu-2', choices: [{ choiceId: 'c-2a' }] },
        ],
      },
    ],
  },
};

const votes = [{ optionId: 'opt-1', votes: 2 }];

describe('QVPlus followup filtering at write time', () => {
  it('keeps valid and unanswered followups and discards foreign options, followups and choices', async () => {
    const answer = await answeredQuestion(plusQuestion, { votes: [] });
    const selected = {
      roundId: 'round-1',
      optionId: 'opt-1',
      followupId: 'fu-1',
      choiceId: 'c-1a',
    };
    const unanswered = { ...selected, optionId: 'opt-2', choiceId: null };
    await answer.update({
      votes,
      followupAnswers: [
        selected,
        unanswered,
        { ...selected, optionId: 'missing-option' },
        { ...selected, followupId: 'fu-2', choiceId: 'c-2a' },
        { ...selected, choiceId: 'missing-choice' },
      ],
    });
    expect(answer.storedContent().followupAnswers).toEqual([
      selected,
      unanswered,
    ]);
  });

  it('strips QVPlus fields from a plain QV response and preserves the vote', async () => {
    const answer = await answeredQuestion(plainQuestion, { votes: [] });
    await answer.update({
      votes,
      rounds: [{ roundId: 'round-1', voteSnapshot: { foo: 'bar' } }],
      followupAnswers: [
        {
          roundId: 'round-1',
          optionId: 'opt-1',
          followupId: 'fu-1',
          choiceId: 'c-1a',
        },
      ],
      activeRoundId: 'round-1',
    });
    const stored = answer.storedContent();
    for (const field of ['rounds', 'followupAnswers', 'activeRoundId']) {
      expect(stored).not.toHaveProperty(field);
    }
    expect(stored.votes).toMatchObject(votes);
  });

  it('strips a lone active round from a plain QV answer', async () => {
    const answer = await answeredQuestion(plainQuestion, { votes: [] });
    await answer.update({ votes, activeRoundId: 'round-1' });
    expect(answer.storedContent().activeRoundId).toBeUndefined();
  });

  it('keeps the active round on a genuine QVPlus answer', async () => {
    const answer = await answeredQuestion(plusQuestion, { votes: [] });
    await answer.update({ votes, activeRoundId: 'round-2' });
    expect(answer.storedContent().activeRoundId).toBe('round-2');
  });
});
