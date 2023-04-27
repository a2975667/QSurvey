import Category from "../../components/Category";
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";
import { useEffect, useState } from "react";
import Summary from "../../components/Summary";
import { useDispatch } from "react-redux";
import {
  setPositionGroups,
  mergeOptionGroups,
  calPosition,
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
  const [page, setPage] = useState("welcome");

  //initialize popup
  const [showOrgainizeConfirmationPopup, setshowOrgainizeConfirmationPopup] =
    useState(false);

  // initialize new categories. This should be moved to redux when supporting user defined categories
  let userDefinedCategories = ["Positive", "Neutral", "Negative"];
  let categoryiesHasSkip = true;
  const dispatch = useDispatch();

  // this controls the order of how the categories are displayed
  useEffect(() => {
    dispatch(setPositionGroups({ userDefinedCategories: userDefinedCategories, categoryiesHasSkip: categoryiesHasSkip, page: page }))
    console.log("ASD")
    dispatch(calPosition());
    console.log("dqd")
  }, [page]);

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
    // const handleNextButtonClicked = () => {
    //   const { positions } = survey.qvOptions;
    //   if (positions.Undecided && positions.Undecided.length > 0) {
    //     setshowOrgainizeConfirmationPopup(true);
    //   } else {
    //     dispatch(
    //       mergeOptionGroups({
    //         target: "Skip",
    //         source: "Undecided",
    //       })
    //     );
    //     setPage("vote");
    //   }
    // };

    // const handleNextButtonClicked = () => {
    //   const { positions } = survey.qvOptions;
    //   if (positions.Undecided && positions.Undecided.length > 0) {
    //     const userConfirmation = window.confirm(
    //       "You have not organized all the options. Are you sure you want to continue?"
    //     );
    //     if (userConfirmation) {
    //       dispatch(
    //         mergeOptionGroups({
    //           target: "Skip",
    //           source: "Undecided",
    //         })
    //       );
    //       setPage("vote");
    //     } else {
    //       return;
    //     }
    //   } else {
    //     dispatch(
    //       mergeOptionGroups({
    //         target: "Skip",
    //         source: "Undecided",
    //       })
    //     );
    //     setPage("vote");
    //   }
    // };

    const handleNextButtonClicked = () => {
      dispatch(
        mergeOptionGroups({
          target: "Skip",
          source: "Undecided",
        })
      );
      setPage("vote");
    };

    console.log("options: ", options);
    console.log("survey.qvOptions.positions: ", survey.qvOptions.positions);
    return (
      <>
        <div className="Container">
          <div className="header">
            <div className="title">
              <QuestionTitle question={question} />
            </div>
            <button className={"next"} onClick={handleNextButtonClicked}>
              Next: Vote
            </button>
          </div>

          {/* <div className="empty-div"></div> */}
          <QuestionPrompt question={question} instructions={false} />
          <p>
            To better <b>organize your thoughts</b>, we ask your preference
            toward each option. Your indication does not effect the final
            submitted result. You can alter your selection as you wish. Also,
            options within groups are draggable. The order of the options within
            the groups will be preserved in the next page.
          </p>
          <Category
            options={options}
            optionPosition={survey.qvOptions.positions}
            categories={survey.qvOptions.categorySequence.currentViewCategories}
            view={page}
          />
        </div>
      </>
    );
  } else if (page === "vote") {
    return (
      <div className="Container">
        {/* <div className="title small-margin">
          <QuestionTitle question={question} />
        </div> */}

        <div className="header small-margin">
          <div className="title">
            <QuestionTitle question={question} />
          </div>
          {/* TODO: the previous design does not maintain seperate states for undecided and skip */}
          <button
            className={"next"}
            onClick={() => {
              dispatch(
                mergeOptionGroups({
                  target: "Undecided",
                  source: "Skip",
                })
              );
              setPage("organize");
            }}
          >
            Previous: Organize
          </button>
        </div>
        <QuestionPrompt question={question} instructions={false} />
        <p style={{ marginTop: "-0.5em" }}> You have a total of <b>{totalCredits}</b> credits to vote. Use the dropdown to select the number of votes you want to vote for each option. You can change your vote at any time. </p>
        <Category
          options={options}
          optionPosition={survey.qvOptions.positions}
          categories={survey.qvOptions.categorySequence.currentViewCategories}
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
