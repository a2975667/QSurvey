import Instruction from "../../../components/Instructions";
import { resolveQvLabels, ResolvedQvLabels } from "../../../i18n/qvLabels";

interface WelcomeViewProps {
  mode: "text" | "interactive";
  qvLabels?: ResolvedQvLabels;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ mode, qvLabels }) => {
  const labels = qvLabels || resolveQvLabels();
  return (
    <div className="Container container-width-limited">
      <div className="container-narrow title-bar">
        <div className="surveyQuestionTitle">
          <h2>{labels.text.welcomeTitle}</h2>
        </div>
      </div>
      <div className="container-narrow">
        <Instruction style={mode} qvLabels={labels} />
      </div>
    </div>
  );
};

export default WelcomeView;
