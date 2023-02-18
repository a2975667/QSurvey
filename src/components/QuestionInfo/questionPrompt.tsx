import { IQuestion } from "../../types/coreTypes"
import { ExperimentInstruction } from "../Experiment/experimentInstructions"
import '../../pages/test-page/main.css'


export function QuestionPrompt({ question, instructions }: { question: IQuestion, instructions: boolean }) {

    if (instructions) {
        return <>
            <ExperimentInstruction />
            <h2 className="question-title">{question.question}</h2>
            <div dangerouslySetInnerHTML={{ __html: question.description }} />
        </>
    } else {
        return <>
            <h2 className="question-title">{question.question}</h2>
            <div dangerouslySetInnerHTML={{ __html: question.description }} />
        </>
    }
}