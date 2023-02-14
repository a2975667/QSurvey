// This page is for you to list your components and test its functionality like storybook

import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";
import { useEffect, useState } from "react";
import Summary from "../../components/Summary";
import Organizer from "../../components/Organizer";
import VoteSelection from "../../components/VoteSelection";
import { useDispatch } from "react-redux";
import { setPositionGroups, updateOptionGroup } from "../../features/qvOptionsSlice";

export const TestPage = () => {

  // initializing data used in this page from the store
  const survey = useAppSelector((state) => state);
  const question = Object.values(survey.questions.byId).find(obj => obj.position === 0)!;

  const options = Object.values(question.options!).reduce((acc, optionId) => {
    acc[optionId] = survey.qvOptions.byId[optionId];
    return acc;
  }, {} as { [key: string]: IQvOption });

  const totalCredits = question.totalCredits
  const [currCost, setCurrCost] = useState(0);

  useEffect(() => {
    setCurrCost(Object.values(options).reduce((acc, option) => acc + Math.pow(option.votes, 2), 0));
  }, [options]);

  //determining the view
  const [page, setPage] = useState("");

  // initialize new categories. This should be moved to redux when supporting user defined categories
  let selfDefinedCategories = ["Positive", "Neutral", "Negative"];
  const [isGroupInitialized, setIsGroupInitialized] = useState(false);
  const dispatch = useDispatch();
  // selfDefinedCategories = [];

  useEffect(() => {
    if (!isGroupInitialized) {
      dispatch(setPositionGroups({ positions: selfDefinedCategories }));
      setIsGroupInitialized(true);
    }
  }, []);

  const allCategories = selfDefinedCategories.concat(["Undecided"]);

  // if page is empty, return a welcome message and a begin button to start the survey, set stage to organize
  if (!page || page === "welcome" || page === "") {
    return (
      <div>
        <h1>Welcome to the survey!</h1>
        <button onClick={() => setPage("organize")}>Begin</button>
      </div>
    )
  } else if (page === "organize") {

    return <>
      <Category options={options} optionPosition={survey.qvOptions.positions} categories={allCategories} view={page}/>
      <button onClick={() => setPage("vote")}>Vote</button>
        {/* {Object.values(options).map((option: IQvOption) => (
          <DraggableItem option={option} totalCredits={totalCredits} currCost={currCost} draggableId={option.optionId} index={option.position} key={option.optionId} />
        ))} */}

      {/* <div>
        <div dangerouslySetInnerHTML={{ __html: question.description }} />
        <Organizer options={options}/>
        
      </div> */}
    </>

  } else if (page === "vote") {

    return <>
      <div dangerouslySetInnerHTML={{ __html: question.description }} />
      <Category options={options} optionPosition={survey.qvOptions.positions} categories={allCategories} view={page} totalCredits={totalCredits} currCost={currCost}/>
        {/* {Object.values(options).map((option: IQvOption) => (
          <DraggableItem option={option} totalCredits={totalCredits} currCost={currCost} draggableId={option.optionId} index={option.position} key={option.optionId} />
        ))} */}

      <Summary totalCredits={totalCredits} currCost={currCost} optionList={options} />
      {/* <VoteSelection designType="Wheel"  currVote={2}
    optionId={'asd'}
    totalCredits={100}
    currCost={5}/> */}

    </>
    
  } else {
    return <div>Page not found</div>
  }
}