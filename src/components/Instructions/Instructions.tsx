import React from "react";

export const Instruction = ({ style }: { style: string }) => {
  // if style is text, return text instructions
  if (style === "interactive") {
    return (
      <div className="Container" style={{ fontSize: 'large' }}>
        <p>
          This survey aims to understand a community's view on different
          societal issues in the United States. <br></br> You will be using this{" "}
          <strong>Quadratic Survey</strong> to enter your responses. Here is
          what to expect:
        </p>
        <p>We will present the Quadratic Survey in two steps:</p>
        <h2>
          <em>Step 1:</em> Organize your thoughts.
        </h2>
        <p>
          Our system will ask you to prioritize the individual options in this
          step. <br></br>The system will group your preferences. <br></br>These early grouping
          preferences are not set in stone. <br></br>You will have the option to modify
          them in the following step.
        </p>
        <h2>
          <em>Step 2:</em> Voting
        </h2>
        <p>
          You will vote on the options. <br></br>All the options are shown on the screen. <br></br>
          You can use your mouse to click or scroll to <em>upvote</em> / 
          <em>downvote</em>. <br></br> Once you complete your voting preferences, click
          submit and notify the researcher.
        </p>
      </div>
    );
  }

  // if style is interactive, return interactive instructions
  if (style === "text") {
    return (
    <div className="Container" style={{ fontSize: 'larger' }}>
        <p>
          This survey aims to understand a community's view on different
          societal issues in the United States. You will be using this{" "}
          <strong>Quadratic Survey</strong> to enter your responses. Here is
          what to expect:
        </p>
        <p>We present Quadratic Survey in one step:</p>
        <h2>
          <em>Step 1:</em> Voting
        </h2>
        <p>
          You will vote on the options. All the options are shown on the screen.
          You can use your mouse to click or scroll to <em>upvote</em>/
          <em>downvote</em>. Once you complete your voting preferences, click
          submit and notify the researcher.
        </p>
      </div>
    );
  }

  return <div></div>;
};
