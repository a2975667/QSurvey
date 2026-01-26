import React, { useEffect, useMemo, useState } from 'react';
import './selectionQuestion.css';

type SelectionOption = {
  optionId?: string;
  optionName: string;
  description?: string;
  isExclusive?: boolean;
};

type SelectionControl = 'checkbox' | 'radio' | 'dropdown' | 'auto';

interface SelectionQuestionProps {
  question: {
    _id: string;
    question: string;
    description?: string;
    options: SelectionOption[];
    selectionMode?: 'single' | 'multi';
    displayControl?: SelectionControl;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    randomizeOptions?: boolean;
    controlRuleThresholds?: { singleToDropdownAt?: number };
  };
  selectedOptionIds?: string[];
  onAnswer: (questionId: string, selectedOptionIds: string[]) => void;
  disabled?: boolean;
}

const SelectionQuestion: React.FC<SelectionQuestionProps> = ({
  question,
  selectedOptionIds = [],
  onAnswer,
  disabled = false,
}) => {
  const [currentSelections, setCurrentSelections] = useState<string[]>(selectedOptionIds);

  useEffect(() => {
    setCurrentSelections(selectedOptionIds);
  }, [selectedOptionIds]);

  const normalizedOptions = useMemo(() => {
    const base = Array.isArray(question.options) ? question.options : [];
    return base.map((option, index) => ({
      ...option,
      optionId: option.optionId || `option-${index}`,
      isExclusive: option.isExclusive === true,
    }));
  }, [question.options]);

  const orderedOptions = useMemo(() => {
    const exclusive = normalizedOptions.filter((opt) => opt.isExclusive);
    const regular = normalizedOptions.filter((opt) => !opt.isExclusive);
    if (question.randomizeOptions) {
      const shuffled = [...regular];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return [...shuffled, ...exclusive];
    }
    return [...regular, ...exclusive];
  }, [normalizedOptions, question.randomizeOptions]);

  const selectionMode = question.selectionMode === 'multi' ? 'multi' : 'single';
  const rawControl = (question.displayControl || '').toLowerCase() as SelectionControl;

  const effectiveControl = useMemo(() => {
    if (selectionMode === 'multi') return 'checkbox';
    if (rawControl === 'checkbox') return 'radio';
    if (rawControl === 'auto') {
      const threshold = question.controlRuleThresholds?.singleToDropdownAt;
      if (typeof threshold === 'number' && threshold > 0) {
        return orderedOptions.length > threshold ? 'dropdown' : 'radio';
      }
      return 'radio';
    }
    if (rawControl === 'dropdown' || rawControl === 'radio') {
      return rawControl;
    }
    return 'radio';
  }, [
    rawControl,
    selectionMode,
    question.controlRuleThresholds,
    orderedOptions.length,
  ]);

  const exclusiveSet = useMemo(() => {
    return new Set(
      orderedOptions
        .filter((opt) => opt.isExclusive && opt.optionId)
        .map((opt) => opt.optionId as string),
    );
  }, [orderedOptions]);

  const activeExclusive = currentSelections.find((id) => exclusiveSet.has(id));
  const maxSelections =
    selectionMode === 'multi' && typeof question.maxSelections === 'number'
      ? question.maxSelections
      : undefined;
  const maxReached =
    selectionMode === 'multi' &&
    typeof maxSelections === 'number' &&
    currentSelections.length >= maxSelections;

  const helperText = useMemo(() => {
    if (selectionMode === 'single') {
      return question.required ? 'Select 1 option.' : 'Select 1 option (optional).';
    }
    if (typeof question.minSelections === 'number' && typeof question.maxSelections === 'number') {
      return `Select ${question.minSelections}-${question.maxSelections} options.`;
    }
    if (typeof question.minSelections === 'number') {
      return `Select at least ${question.minSelections} option${question.minSelections === 1 ? '' : 's'}.`;
    }
    if (typeof question.maxSelections === 'number') {
      return `Select up to ${question.maxSelections} option${question.maxSelections === 1 ? '' : 's'}.`;
    }
    return question.required ? 'Select at least 1 option.' : 'Optional.';
  }, [
    selectionMode,
    question.minSelections,
    question.maxSelections,
    question.required,
  ]);

  const applySelections = (next: string[]) => {
    setCurrentSelections(next);
    onAnswer(question._id, next);
  };

  const handleSingleSelect = (optionId: string) => {
    if (disabled) return;
    applySelections([optionId]);
  };

  const handleDropdownChange = (value: string) => {
    if (disabled) return;
    if (!value) {
      applySelections([]);
      return;
    }
    applySelections([value]);
  };

  const handleToggle = (optionId: string, isExclusive?: boolean) => {
    if (disabled) return;

    if (isExclusive) {
      const next = currentSelections.includes(optionId) ? [] : [optionId];
      applySelections(next);
      return;
    }

    const withoutExclusive = activeExclusive
      ? currentSelections.filter((id) => !exclusiveSet.has(id))
      : currentSelections;
    const isSelected = withoutExclusive.includes(optionId);

    if (isSelected) {
      applySelections(withoutExclusive.filter((id) => id !== optionId));
      return;
    }

    if (maxReached) {
      return;
    }

    applySelections([...withoutExclusive, optionId]);
  };

  return (
    <div className="selection-question">
      <div className="selection-question__header">
        <h3 className="selection-question__title">{question.question}</h3>
        {question.description && (
          <p className="selection-question__description">{question.description}</p>
        )}
      </div>

      {effectiveControl === 'dropdown' ? (
        <div className="selection-question__dropdown">
          <label className="selection-question__label" htmlFor={`selection-${question._id}`}>
            {helperText}
          </label>
          <select
            id={`selection-${question._id}`}
            className="selection-question__select"
            value={currentSelections[0] || ''}
            onChange={(e) => handleDropdownChange(e.target.value)}
            disabled={disabled}
            aria-label={question.question}
          >
            <option value="">{question.required ? 'Select an option' : 'Optional'}</option>
            {orderedOptions.map((option) => {
              const label = option.description
                ? `${option.optionName} — ${option.description}`
                : option.optionName;
              return (
                <option key={option.optionId} value={option.optionId}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      ) : (
        <>
          <p className="selection-question__helper">{helperText}</p>
          <div
            className={`selection-question__options selection-question__options--${effectiveControl}`}
            role={selectionMode === 'single' ? 'radiogroup' : undefined}
            aria-label={question.question}
          >
            {orderedOptions.map((option) => {
              const optionId = option.optionId || '';
              const isSelected = currentSelections.includes(optionId);
              const isExclusive = option.isExclusive === true;
              const shouldDisable =
                disabled ||
                (activeExclusive && !isSelected && !isExclusive) ||
                (!isSelected && maxReached && !isExclusive);

              return (
                <label
                  key={optionId}
                  className={`selection-option ${isSelected ? 'is-selected' : ''} ${
                    isExclusive ? 'is-exclusive' : ''
                  }`}
                >
                  <input
                    type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                    name={`selection-${question._id}`}
                    value={optionId}
                    checked={isSelected}
                    onChange={() =>
                      selectionMode === 'single'
                        ? handleSingleSelect(optionId)
                        : handleToggle(optionId, isExclusive)
                    }
                    disabled={shouldDisable}
                  />
                  <span className="selection-option__label">{option.optionName}</span>
                  {option.description && (
                    <span className="selection-option__description">{option.description}</span>
                  )}
                </label>
              );
            })}
          </div>
          {maxReached && (
            <p className="selection-question__max-note">Maximum selections reached.</p>
          )}
        </>
      )}
    </div>
  );
};

export default SelectionQuestion;
