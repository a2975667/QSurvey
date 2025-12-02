import React, { useEffect, useState } from 'react';
import './likertQuestion.css';

interface LikertQuestionProps {
  question: {
    _id: string;
    question: string;
    description?: string;
    scale: string[];
    minLabel?: string;
    maxLabel?: string;
  };
  onAnswer: (questionId: string, selection: string) => void;
  initialSelection?: string;
  disabled?: boolean;
}

const LikertQuestion: React.FC<LikertQuestionProps> = ({ 
  question, 
  onAnswer, 
  initialSelection = '',
  disabled = false 
}) => {
  const [selection, setSelection] = useState<string>(initialSelection);
  
  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const handleSelectionChange = (value: string) => {
    if (disabled) return;
    setSelection(value);
    onAnswer(question._id, value);
  };

  return (
    <div className="likert-question">
      <div className="likert-question__header">
        <h3 className="likert-question__title">{question.question}</h3>
        {question.description && (
          <p className="likert-question__description">{question.description}</p>
        )}
      </div>

      <div className="likert-question__body">
        <div
          className="likert-scale"
          role="radiogroup"
          aria-label={question.question}
        >
          {question.scale.map((value) => {
            const isSelected = selection === value;
            return (
              <label 
                key={value} 
                className={`likert-option ${isSelected ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`likert-${question._id}`}
                  value={value}
                  checked={isSelected}
                  onChange={() => handleSelectionChange(value)}
                  disabled={disabled}
                />
                <span className="likert-option__value">{value}</span>
              </label>
            );
          })}
        </div>

        <div className="likert-dropdown">
          <label className="likert-dropdown__label" htmlFor={`likert-select-${question._id}`}>
            Select an option
          </label>
          <select
            id={`likert-select-${question._id}`}
            className="likert-dropdown__select"
            value={selection}
            onChange={(e) => handleSelectionChange(e.target.value)}
            disabled={disabled}
            aria-label={question.question}
          >
            <option value="" disabled>
              Choose...
            </option>
            {question.scale.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="likert-scale-labels">
          <span className="likert-label likert-label--min">{question.minLabel || ''}</span>
          <span className="likert-label likert-label--max">{question.maxLabel || ''}</span>
        </div>
      </div>
    </div>
  );
};

export default LikertQuestion;
