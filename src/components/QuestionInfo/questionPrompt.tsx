import { IQuestion } from "../../types/coreTypes"
import { ExperimentInstruction } from "../Experiment/experimentInstructions"
import '../../pages/test-page/main.css'


export function QuestionPrompt({ question, instructions }: { question: IQuestion, instructions: boolean }) {

    if (instructions) {
        return <>
            <ExperimentInstruction />
            <div dangerouslySetInnerHTML={{ __html: question.description }} />
        </>
    } else {
        return <>
            <div dangerouslySetInnerHTML={{ __html: question.description }} />
        </>
    }
}

export function QuestionTitle({ question }: { question: IQuestion}) {
    // reutrn only the title
    return <p className="question-title">{question.question}</p>
}

