import Instruction from "../../../components/Instructions";

interface WelcomeViewProps {
  style: "text" | "interactive";
  onBeginClick: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ style, onBeginClick }) => {
  return (
    <div className="Container container-width-limited">
      <div className="container-narrow title-bar">
        <div className="surveyQuestionTitle">
          <h2>Welcome to the Survey</h2>
        </div>
      </div>
      <div className="container-narrow">
        <Instruction style={style} />
      </div>
    </div>
  );
};

export default WelcomeView;