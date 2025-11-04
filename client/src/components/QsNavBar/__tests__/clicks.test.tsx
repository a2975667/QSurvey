import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';
import QsNavBar from '../QsNavBar';
import { surveyTelemetry } from '../../../app/store';

function buildStore() {
  return configureStore({
    reducer: { unifiedResponses: unifiedResponsesReducer },
    middleware: (getDefault) => getDefault(),
  });
}

describe('QsNavBar click telemetry', () => {
  it('emits click events for begin, next, prev, and primary', async () => {
    surveyTelemetry.reset();
    const store = buildStore();

    const onNext = jest.fn();
    const onPrev = jest.fn();
    const onPrimary = jest.fn();

    // Welcome view: Begin Survey →
    const { rerender } = render(
      <Provider store={store}>
        <QsNavBar totalCredits={10} currCost={0} optionList={{}} currentView="welcome" onNextClick={onNext} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));
    expect(onNext).toHaveBeenCalled();

    // Organize view: Voting → and ← Instructions
    rerender(
      <Provider store={store}>
        <QsNavBar totalCredits={10} currCost={0} optionList={{}} currentView="organize" onNextClick={onNext} onPreviousClick={onPrev} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /voting/i }));
    expect(onNext).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /instructions/i }));
    expect(onPrev).toHaveBeenCalled();

    // Vote view: Submit button (with onPrimaryAction)
    rerender(
      <Provider store={store}>
        <QsNavBar
          totalCredits={10}
          currCost={0}
          optionList={{}}
          currentView="vote"
          voteCtaMode="submit"
          onPrimaryAction={onPrimary}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onPrimary).toHaveBeenCalled();

    // Check that some telemetry has been recorded
    const summaries = surveyTelemetry.getAllSummaries();
    // Clicks are global (questionId unknown), aggregator groups under "__global__"
    expect(summaries.length).toBeGreaterThan(0);
  });
});
