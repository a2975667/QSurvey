import React, { useState } from 'react';
import './textQuestion.css';

interface TextQuestionProps {
  question: {
    _id: string;
    question: string;
    description?: string;
    multiline: boolean;
    maxLength?: number;
  };
  onAnswer: (questionId: string, text: string) => void;
  initialText?: string;
  disabled?: boolean;
}

const TextQuestion: React.FC<TextQuestionProps> = ({ 
  question, 
  onAnswer, 
  initialText = '',
  disabled = false 
}) => {
  const [text, setText] = useState<string>(initialText);
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (disabled) return;
    
    const newText = e.target.value;
    
    // Apply max length limitation if specified
    if (question.maxLength && newText.length > question.maxLength) {
      return;
    }

    setText(newText);
    onAnswer(question._id, newText);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const charCount = text.length;
  const maxLength = question.maxLength || null;
  const showCounter = maxLength !== null;

  const fieldClasses = [
    'text-field',
    question.multiline ? 'text-field--multiline' : 'text-field--singleline',
    isFocused ? 'is-focused' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="text-question">
      <div className="text-question__header">
        <h3 className="text-question__title">{question.question}</h3>
        {question.description && (
          <p className="text-question__description">{question.description}</p>
        )}
      </div>

      <div className={fieldClasses}>
        {question.multiline ? (
          <textarea
            className="text-input"
            value={text}
            onChange={handleTextChange}
            placeholder="Type your answer here..."
            rows={5}
            maxLength={maxLength || undefined}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={question.question}
          />
        ) : (
          <input
            type="text"
            className="text-input"
            value={text}
            onChange={handleTextChange}
            placeholder="Type your answer here..."
            maxLength={maxLength || undefined}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={question.question}
          />
        )}
        
        {showCounter && (
          <div className="text-question__meta-row">
            <span className={`text-character-counter ${charCount >= (maxLength || 0) ? 'text-counter-limit' : ''}`}>
              {charCount} / {maxLength} characters
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextQuestion;
