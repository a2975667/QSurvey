import { answeredQuestion } from '../../../test/participant-response.fixture';

const options = [{ optionId: 'optA' }, { optionId: 'optB' }];

describe('Participant answer filtering at write time', () => {
  it.each(['update', 'resume'] as const)(
    'filters foreign votes on %s using one question lookup',
    async (operation) => {
      const answer = await answeredQuestion(
        { type: 'qv', options },
        { votes: [] },
      );
      const getQuestion = jest.spyOn(answer.core, 'getQuestionById');
      await answer[operation]({
        votes: [
          { optionId: 'optA', votes: 3 },
          { optionId: 'foreign', votes: 5 },
          { optionId: 'optB', votes: -1 },
        ],
      });
      expect(getQuestion).toHaveBeenCalledTimes(1);
      expect(answer.storedContent().votes).toMatchObject([
        { optionId: 'optA', votes: 3 },
        { optionId: 'optB', votes: -1 },
      ]);
      expect(answer.storedContent()).not.toHaveProperty('followupAnswers');
    },
  );

  it('stores each permitted selection once', async () => {
    const answer = await answeredQuestion(
      { type: 'selection', selectionMode: 'multi', options },
      { selectedOptionIds: [] },
    );
    await answer.update({
      selectedOptionIds: ['optA', 'foreign', 'optB', 'optA'],
    });
    expect(answer.storedContent().selectedOptionIds).toEqual(['optA', 'optB']);
  });

  it('rejects excess approvals and preserves the initial answer', async () => {
    const answer = await answeredQuestion(
      { type: 'approval', maxApprovals: 1, unlimitedApprovals: false, options },
      { approvals: ['optA'] },
    );
    await expect(
      answer.update({ approvals: ['optA', 'optB'] }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('[URS0609]'),
    });
    expect(answer.storedContent().approvals).toEqual(['optA']);
  });

  it('permits approvals beyond the configured maximum in unlimited mode', async () => {
    const answer = await answeredQuestion(
      { type: 'approval', maxApprovals: 1, unlimitedApprovals: true, options },
      { approvals: [] },
    );
    await answer.update({ approvals: ['optA', 'optB'] });
    expect(answer.storedContent().approvals).toEqual(['optA', 'optB']);
  });

  it('rejects multiple selections for a single-select question with an exclusive option', async () => {
    const answer = await answeredQuestion(
      {
        type: 'selection',
        selectionMode: 'single',
        options: [{ optionId: 'optA', isExclusive: true }, options[1]],
      },
      { selectedOptionIds: [] },
    );
    await expect(
      answer.update({ selectedOptionIds: ['optA', 'optB'] }),
    ).rejects.toThrow('Too many selections');
  });
});
