import React from "react";

export const Instruction = ({ style }: { style: string }) => {
  // if style is text, return text instructions
  if (style === "interactive") {
    return (
      <div className="Container" style={{ fontSize: "large" }}>
        <p>
          The aim of this study is to help local community organizers gather
          more effective feedback from their community members. Specifically,
          the focus is on understanding individual perspectives on a selected
          range of societal issues in the United States, which will enable
          better allocation of limited resources. <br></br> You will be using
          this <strong>Quadratic Survey</strong> to enter your responses. Here
          is what to expect:
        </p>
        <p>We will present the Quadratic Survey in two steps:</p>
        <h2>
          <em>Step 1:</em> Organize your thoughts.
        </h2>
        <p>
          Our system will sequentially present a series of social issues for you
          to prioritize in this step. <br></br>The system will group your
          preferences. <br></br>These early grouping preferences are not set in
          stone. <br></br>You will have the option to modify them in the
          following step. You can modify your choices on the interface or in the
          following step through drag and drop.
        </p>
        <h2>
          <em>Step 2:</em> Voting
        </h2>
        <p>
          You will vote on the options. <br></br>All the options are shown on
          the screen. <br></br>
          You can use your mouse to click or scroll to <em>upvote</em> /
          <em>downvote</em> each option. <br></br> Once you completed answering
          the survey, click submit and notify the researcher.
        </p>
      </div>
    );
  }

  // if style is interactive, return interactive instructions
  if (style === "text") {
    return (
      <div className="Container" style={{ fontSize: "larger" }}>
        <p>
          The aim of this study is to help local community organizers gather
          more effective feedback from their community members. Specifically,
          the focus is on understanding individual perspectives on a selected
          range of societal issues in the United States, which will enable
          better allocation of limited resources. You will be using this{" "}
          <strong>Quadratic Survey</strong> to enter your responses. Here is
          what to expect:
        </p>
        <p>We present Quadratic Survey in one step:</p>
        <h2>
          <em>Step 1:</em> Voting
        </h2>
        <p>
          You will vote on the options. <br></br>All the options are shown on
          the screen. <br></br>
          You can use your mouse to click or scroll to <em>upvote</em> /
          <em>downvote</em> each option. <br></br> Once you completed answering
          the survey, click submit and notify the researcher.
        </p>
      </div>
    );
  }

  return <div></div>;
};
