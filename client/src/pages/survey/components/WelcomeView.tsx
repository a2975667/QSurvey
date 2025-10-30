import Instruction from "../../../components/Instructions";

interface WelcomeViewProps {
  mode: "text" | "interactive";
  onBeginClick: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ mode, onBeginClick }) => {
  return (
    <div className="Container container-width-limited">
      <div className="container-narrow title-bar">
        <div className="surveyQuestionTitle">
          <h2>Welcome to the Survey</h2>
        </div>
      </div>
      <div className="container-narrow">
        <Instruction style={mode} />
      </div>
    </div>
  );
};

export default WelcomeView;
