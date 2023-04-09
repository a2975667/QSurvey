import React from 'react';
import './eos.css';

interface EosProps {
  show: boolean;
}

export const Eos: React.FC<EosProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="eos">
      <div className="eos-background"></div>
      <div className="eos-content">
        <h2>Thank you for submitting. Please meet with the researcher in the room.</h2>
      </div>
    </div>
  );
};
