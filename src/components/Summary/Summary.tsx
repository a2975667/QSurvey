import { useDispatch } from 'react-redux';
import { clearAllOptionVotesByOptionKeys, regroupAndOrderOptions } from '../../features/qvOptionsSlice';
import { IQvOption } from '../../types/coreTypes';
import { CustomButton } from '../Button/Button';
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

export const Summary = ({ totalCredits, currCost, optionList }: SummaryProps) => {
  const dispatch = useDispatch();

  const reorderSurvey = () => {
    dispatch(regroupAndOrderOptions({}));
  };



  return (
    <div className="summary-box">
      <div className="summary-header">
        <h3>Credit Summary</h3>
      </div>
      <div className="summary-content top">
        <span className="summary-left">Total Credit</span>
        <span className="summary-right">${totalCredits}</span>
      </div>
      <div className="summary-content">
        <span className="summary-left">Credits Spent</span>
        <span className="summary-right">-${currCost}</span>
      </div>
      <div className="line"></div>
      <div className="summary-content top">
        <span className="summary-left">Remaining Credit</span>
        <span className="summary-right">${totalCredits - currCost}</span>
      </div>
      <div className="summary-footer">
        <div>
          <ResetSurvey optionList={optionList} />
          {/* <CustomButton className={"reset"} label="Reset" onClick={()=>resetSurvey(questionId.toString())} /> */}
          <CustomButton className={"submit"} label="Submit" onClick={reorderSurvey} />
        </div>
      </div>
    </div>

  );

}
