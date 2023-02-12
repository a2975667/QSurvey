// This page is for you to list your components and test its functionality like storybook

import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";
import { useEffect, useState } from "react";
import Summary from "../../components/Summary";
import Organizer from "../../components/Organizer";


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
      <div>
        <div dangerouslySetInnerHTML={{ __html: question.description }} />
        <Organizer options={options}/>
        <button onClick={() => setPage("vote")}>Vote</button>
      </div>
    </>

  } else if (page === "vote") {

    return <>
      <div dangerouslySetInnerHTML={{ __html: question.description }} />
      <Category>
        {Object.values(options).map((option: IQvOption) => (
          <DraggableItem option={option} totalCredits={totalCredits} currCost={currCost} draggableId={option.optionId} index={option.position} key={option.optionId} />
        ))}
      </Category>

      <Summary totalCredits={totalCredits} currCost={currCost} optionList={options} />
    </>


  } else {
    return <div>Page not found</div>
  }
}