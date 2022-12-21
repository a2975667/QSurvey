import { DropdownDesign } from "./DropdownDesign";

export interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    // onSelection: () => {}
}
export const VoteSelection = (props: VoteSelectionProps) => {
    if (props.designType === 'Wheel') {
        return <p>Wheel</p>
    } else if (props.designType === 'Drop') {
        return <DropdownDesign remaining_credits={30}></DropdownDesign>
    }

    return <></>
}
