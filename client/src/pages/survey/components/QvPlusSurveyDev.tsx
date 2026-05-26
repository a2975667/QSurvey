import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import QuadraticSurveyPage from './QuadraticSurveyPage';
import { bootstrapMockQvPlusSurvey } from './qvPlusMockData';
import type { AppDispatch } from '../../../app/store';

// Dev-only host that bypasses SurveyView. On mount, it pre-populates Redux
// with mock survey data (one QV + one QVPlus question) and then renders
// QuadraticSurveyPage so we can validate the full organize → vote → selection
// flow without touching any backend.
const QvPlusSurveyDev: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    bootstrapMockQvPlusSurvey(dispatch);
  }, [dispatch]);

  return (
    <div>
      <div
        style={{
          padding: '0.5rem 1.5rem',
          background: '#e8eaf0',
          fontSize: '0.85rem',
          color: '#555',
        }}
      >
        Dev survey · mock QV + QVPlus pipeline (no backend)
      </div>
      <QuadraticSurveyPage style="interactive" />
    </div>
  );
};

export default QvPlusSurveyDev;
