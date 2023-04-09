// This page is for you to list your components and test its functionality like storybook

import Category from "../../components/Category";
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";
import { useEffect, useState } from "react";
import Summary from "../../components/Summary";
import { useDispatch } from "react-redux";
import {
  setPositionGroups,
  mergeOptionGroups,
} from "../../features/qvOptionsSlice";
import "./main.css";
import {
  QuestionPrompt,
  QuestionTitle,
} from "../../components/QuestionInfo/questionPrompt";
import VoteSelection from "../../components/VoteSelection";
import Instruction from "../../components/Instructions";

export const TestPage = ({ style }: { style: string }) => {
  // initializing data used in this page from the store
  const survey = useAppSelector((state) => state);
  const question = Object.values(survey.questions.byId).find(
    (obj) => obj.position === 0
  )!;

  const options = question.options!.reduce((acc, optionId) => {
    acc[optionId] = survey.qvOptions.byId[optionId];
    return acc;
  }, {} as { [key: string]: IQvOption });

  const totalCredits = question.totalCredits;
  const [currCost, setCurrCost] = useState(0);

  useEffect(() => {
    setCurrCost(
      Object.values(options).reduce(
        (acc, option) => acc + Math.pow(option.votes, 2),
        0
      )
    );
  }, [options]);

  //determining the view
  const [page, setPage] = useState("");

  // initialize new categories. This should be moved to redux when supporting user defined categories
  let selfDefinedCategories = ["Skip", "Positive", "Neutral", "Negative"];
  const [isGroupInitialized, setIsGroupInitialized] = useState(false);
  const dispatch = useDispatch();
  // selfDefinedCategories = [];

  useEffect(() => {
    if (!isGroupInitialized) {
      dispatch(setPositionGroups({ positions: selfDefinedCategories }));
      setIsGroupInitialized(true);
    }
    if (style === "text") {
      // console.log(options);
      // dispatch a call to set all the options as undecided
    }
  }, []);

  // const allCategories = selfDefinedCategories.concat(["Undecided"]);
  const allCategories = selfDefinedCategories;

  // if page is empty, return a welcome message and a begin button to start the survey, set stage to organize
  if (!page || page === "welcome" || page === "") {
    let nextPage = "vote";

    if (style === "text") {
      nextPage = "vote";
    } else {
      nextPage = "organize";
    }

    // console.log("page", nextPage);

    return (
      <div className="Container">
        <div className="header">
          <div className="title">Welcome to the survey!</div>
          <button className="next" onClick={() => setPage(nextPage)}>
            Begin
          </button>
        </div>
        <Instruction style={style} />
      </div>
    );
  } else if (page === "organize") {
    return (
      <>
        <div className="Container">
          <div className="header">
            <div className="title">
              <QuestionTitle question={question} />
            </div>
            <button
              className={"next"}
              onClick={() => {
                dispatch(
                  mergeOptionGroups({
                    target: "Skip",
                    source: "Undecided",
                  })
                );
                setPage("vote");
              }}
            >
              Next: Vote
            </button>
          </div>

          {/* <div className="empty-div"></div> */}
          <QuestionPrompt question={question} instructions={false} />
          <p>
            To better <b>organize your thoughts</b>, we ask your preference
            toward each option. Your indication does not effect the final
            submitted result. You can alter your selection as you wish. Also,
            options within groups are draggable.
          </p>
          <Category
            options={options}
            optionPosition={survey.qvOptions.positions}
            categories={allCategories}
            view={page}
          />
        </div>
      </>
    );
  } else if (page === "vote") {
    return (
      <div className="Container">
        <div className="title">
          <QuestionTitle question={question} />
        </div>
        <QuestionPrompt question={question} instructions={false} />
        <Category
          options={options}
          optionPosition={survey.qvOptions.positions}
          categories={allCategories}
          view={page}
          totalCredits={totalCredits}
          currCost={currCost}
          style={style}
        />
        <Summary
          totalCredits={totalCredits}
          currCost={currCost}
          optionList={options}
        />
      </div>
    );
  } else {
    return <div>Page not found</div>;
  }
};
