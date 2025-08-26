import React from "react";

export const Instruction = ({ style }: { style: string }) => {
  // if style is text, return text instructions
  if (style === "interactive") {
    return (
      <div className="Container" style={{ fontSize: "large" }}>
        <p>
          You are now asked to answer a <strong>Quadratic Survey</strong>{" "}
          question. This is a special kind of survey that helps you show not
          just what you care about, but how much you care about each option.
          You'll be given a limited number of credits, which you can use to
          upvote or downvote the options. The more strongly you vote, the more
          it costs—so you'll need to choose carefully.
        </p>

        <p>
          There are no right or wrong answers—just use the credits to reflect
          your real opinions. Here's what to expect:
        </p>

        <div className="video-container">
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/8Y5MlP0u1_U"
            title="Introduction to Quadratic Surveys"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        <p>We'll walk you through the survey in two steps:</p>

        <h2>
          <em>Step 1:</em> Organize your thoughts
        </h2>
        <p>
          You'll be shown each option one at a time. <br />
          For each, just decide whether it feels positive, neutral, or negative.{" "}
          <br />
          These early choices help group your preferences, but don't
          worry—they're not final.
          <br />
          You'll be able to revise everything later using drag and drop.
        </p>

        <h2>
          <em>Step 2:</em> Voting
        </h2>
        <p>
          All the options will appear on screen. <br />
          Use your credits to upvote or downvote each one. <br />
          You can adjust your votes by clicking or scrolling. <br />
          Once you're done, click "Submit" to continue or finish the survey.
        </p>
      </div>
    );
  }

  // if style is interactive, return interactive instructions
  if (style === "text") {
    return (
      <div className="Container" style={{ fontSize: "large" }}>
        <p>
          You are now asked to answer a <strong>Quadratic Survey</strong> question.
          This is a special kind of survey that helps you express not only what you care about,
          but how strongly you care. You’ll be given a limited number of credits to vote
          on the different options—either positively or negatively.
        </p>
  
        <p>
          The more you vote on something, the more credits it costs. This helps you think carefully
          about which issues matter most to you.
        </p>
  
        <p>
          Don’t worry—there are no right or wrong answers. Just use your credits to show your honest opinions.
          In this version, the Quadratic Survey is presented in a single step:
        </p>
  
        <div className="video-container">
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/8Y5MlP0u1_U"
            title="Introduction to Quadratic Surveys"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
  
        <h2>
          <em>Step 1:</em> Voting
        </h2>
        <p>
          All the options will appear on the screen. <br />
          Use your mouse to <em>upvote</em> or <em>downvote</em> each one by clicking or scrolling. <br />
          When you’re finished, click “Submit” to move on or complete the survey.
        </p>
      </div>
    );
  } 

  return <div></div>;
};
