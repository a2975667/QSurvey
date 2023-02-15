import { IQuestion } from "../../types/coreTypes"
import { ExperimentInstruction } from "../Experiment/experimentInstructions"



export function QuestionPrompt( {question}: {question: IQuestion}) {
    
    return <>
        <ExperimentInstruction/>
        <h3>Please indicate your preferences</h3>
        <div dangerouslySetInnerHTML={{ __html: question.description }} />
    </>
}