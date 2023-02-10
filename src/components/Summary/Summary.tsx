import React from 'react';
import { CustomButton } from '../Button/Button';
import './summary.css';

interface SummaryProps {
  totalCredits: number;
  currCost: number;
}

const handleClick = () => {
  console.log('Button clicked!');
};


export const Summary = ({ totalCredits, currCost }: SummaryProps) => {
  return (
    <div className="summary-box">
      <div className="summary-header">
        <h3>Credit Summary</h3>
      </div>
      <div className="summary-content top">
        <span className="summary-left">Given Credit</span>
        <span className="summary-right">${totalCredits}</span>
      </div>
      <div className="summary-content">
        <span className="summary-left">Voting Subtotal</span>
        <span className="summary-right">-${currCost}</span>
      </div>
      <div className="line"></div>
      <div className="summary-content top">
        <span className="summary-left">Remaining Credit</span>
        <span className="summary-right">${totalCredits - currCost}</span>
      </div>
      <div className="summary-footer">
        <div>
          <CustomButton className={"reset"} label="Reset" onClick={handleClick} />
          <CustomButton className={"submit"} label="Submit" onClick={handleClick} />
        </div>
      </div>
    </div>

  );

}
