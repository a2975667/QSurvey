import { IQuestion } from "../../types/coreTypes"
import HtmlContent from "../common/HtmlContent"
import { ExperimentInstruction } from "../Experiment/experimentInstructions"
import '../../pages/survey/components/surveyLayout.css'

export function QuestionPrompt({ question, instructions }: { question: IQuestion, instructions: boolean }) {

    if (instructions) {
        return <>
            <ExperimentInstruction />
            <HtmlContent html={question.description} />
        </>
    } else {
        return <>
            <HtmlContent html={question.description} />
        </>
    }
}

export function QuestionTitle({ question }: { question: IQuestion}) {
    // return only the title
    return <p className="surveyQuestionTitle">{question.question}</p>
}
