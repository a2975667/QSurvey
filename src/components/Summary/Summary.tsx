import { useDispatch } from 'react-redux';
import { clearAllOptionVotesByOptionKeys, addOneVoteToAllOptionsByOptionKeys } from '../../features/qvOptionsSlice';
import { IQvOption } from '../../types/coreTypes';
import { CustomButton } from '../Button/Button';
import React, { useState } from 'react';
import './Summary.css';

interface SummaryProps {
  totalCredits: number;
  currCost: number;
  optionList: { [key: string]: IQvOption };
}

const handleClick = () => {
  console.log('Button clicked!');
};

// const resetSurvey = (questionId: string) => {
//   const dispatch = useDispatch();
//   dispatch({ type: 'clearAllOptionVotesByQuestionId', payload: questionId });
// };


const ResetSurvey = ({ optionList }: { optionList: { [key: string]: IQvOption } }) => {
  const dispatch = useDispatch();

  const resetSurvey = () => {
    console.log(Object.keys(optionList));
    dispatch(clearAllOptionVotesByOptionKeys({ optionKeys: Object.keys(optionList) }))
  };

  return (
    <CustomButton className={"reset"} label="Reset" onClick={resetSurvey} />
  );
};

const AddOneVoteEachOption = ({ totalCredits, currCost, optionList }: SummaryProps) => {
  const dispatch = useDispatch();
  const addOneVoteEachOption = () => {
    var totalCreditsNeed = 0
    const sumTotalCreditsNeed = () => {
      // Sum the votes for all options in the optionList
      totalCreditsNeed = Object.values(optionList).reduce((acc, option) => acc + (option.votes + 1) * (option.votes + 1), 0);
      console.log("totalCreditsNeed = ", totalCreditsNeed)
    };
    if (totalCreditsNeed <= (totalCredits - currCost)) {
      dispatch(addOneVoteToAllOptionsByOptionKeys({ optionKeys: Object.keys(optionList) }))
    }
  };

  return (
    <CustomButton className={"addOneVote"} label="All +1 Vote" onClick={addOneVoteEachOption} />
  );
};

// const ReduceOneVoteEachOption = ({ totalCredits, currCost, optionList }: SummaryProps) => {
//   const dispatch = useDispatch();
//   const addOneVoteEachOption = () => {
//     var totalCreditsNeed = 0
//     const sumTotalCreditsNeed = () => {
//       // Sum the votes for all options in the optionList
//       totalCreditsNeed = Object.values(optionList).reduce((acc, option) => acc + (option.votes + 1) * (option.votes + 1), 0);
//       console.log("totalCreditsNeed = ", totalCreditsNeed)
//     };
//     if (totalCreditsNeed <= (totalCredits - currCost)) {
//       dispatch(addOneVoteToAllOptionsByOptionKeys({ optionKeys: Object.keys(optionList) }))
//     }
//   };

//   return (
//     <CustomButton className={"addOneVote"} label="All +1 Vote" onClick={addOneVoteEachOption} />
//   );
// };


export const Summary = ({ totalCredits, currCost, optionList }: SummaryProps) => {
  return (
    <div className="summary-box">
      <div className="summary-header">
        <h3>Credit Summary</h3>
      </div>
      {/* <div className="summary-content top">
        <span className="summary-left">Total Credit</span>
        <span className="summary-right">${totalCredits}</span>
      </div>
      <div className="summary-content">
        <span className="summary-left">Credits Spent</span>
        <span className="summary-right">-${currCost}</span>
      </div> */}
      {/* <div className="line"></div> */}
      <div className="summary-content top">
        <span className="summary-left">Remaining Credit</span>
        <span className="summary-right">${totalCredits - currCost}</span>
      </div>
      <div className="summary-footer">
        <div>
          <ResetSurvey optionList={optionList} />
          {/* <CustomButton className={"reset"} label="Reset" onClick={()=>resetSurvey(questionId.toString())} /> */}
          <CustomButton className={"submit"} label="Submit" onClick={handleClick} />
          {/* <AddOneVoteEachOption totalCredits={totalCredits} currCost={currCost} optionList={optionList}/> */}
          {/* <ReduceOneVoteEachOption totalCredits={totalCredits} currCost={currCost} optionList={optionList}/> */}
        </div>
      </div>
    </div>

  );

}
