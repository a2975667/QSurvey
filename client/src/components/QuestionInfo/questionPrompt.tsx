import { IQuestion } from "../../types/coreTypes"
import { MarkdownRenderer } from "../common/markdownRendererContract"
import { ExperimentInstruction } from "../Experiment/experimentInstructions"
import '../../pages/survey/components/surveyLayout.css'

export function QuestionPrompt({ question, instructions }: { question: IQuestion, instructions: boolean }) {
    const description = (
        <MarkdownRenderer content={question.description} allowImages />
    )

    if (instructions) {
        return <>
            <ExperimentInstruction />
            {description}
        </>
    } else {
        return <>
            {description}
        </>
    }
}

export function QuestionTitle({ question }: { question: IQuestion}) {
    // return only the title
    return <p className="surveyQuestionTitle">{question.question}</p>
}
