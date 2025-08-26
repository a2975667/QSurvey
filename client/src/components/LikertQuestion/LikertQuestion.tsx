import React, { useState } from 'react';
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

  const handleSelectionChange = (value: string) => {
    if (disabled) return;
    setSelection(value);
    onAnswer(question._id, value);
  };

  return (
    <div className="likert-question-container">
      <div className="likert-question-header">
        <h3 className="likert-question-title">{question.question}</h3>
        {question.description && (
          <p className="likert-question-description">{question.description}</p>
        )}
      </div>

      <div className="likert-scale-container">
        <div className="likert-scale-labels">
          <span className="likert-min-label">{question.minLabel || ''}</span>
          <span className="likert-max-label">{question.maxLabel || ''}</span>
        </div>
        
        <div className="likert-scale-options">
          {question.scale.map((value) => (
            <div 
              key={value} 
              className="likert-option"
            >
              <label className="likert-option-label">
                <input
                  type="radio"
                  name={`likert-${question._id}`}
                  value={value}
                  checked={selection === value}
                  onChange={() => handleSelectionChange(value)}
                  disabled={disabled}
                />
                <span className="likert-option-text">{value}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LikertQuestion;