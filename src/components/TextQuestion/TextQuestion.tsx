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

  const charCount = text.length;
  const maxLength = question.maxLength || null;
  const showCounter = maxLength !== null;

  return (
    <div className="text-question-container">
      <div className="text-question-header">
        <h3 className="text-question-title">{question.question}</h3>
        {question.description && (
          <p className="text-question-description">{question.description}</p>
        )}
      </div>

      <div className="text-input-container">
        {question.multiline ? (
          <textarea
            className="text-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Type your answer here..."
            rows={5}
            maxLength={maxLength || undefined}
            disabled={disabled}
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
          />
        )}
        
        {showCounter && (
          <div className="text-character-counter">
            <span className={charCount >= (maxLength || 0) ? 'text-counter-limit' : ''}>
              {charCount} / {maxLength} characters
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextQuestion;