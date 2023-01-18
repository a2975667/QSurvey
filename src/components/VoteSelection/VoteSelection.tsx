import DropdownDesign from "./DropdownDesign";
import WheelDesign from "./WheelDesign";

export interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    // onSelection: () => {}
}
export const VoteSelection = (props: VoteSelectionProps) => {
    if (props.designType === 'Wheel') {
        return <WheelDesign remainingCredits={30}></WheelDesign>
    } else if (props.designType === 'Drop') {
        return <DropdownDesign remainingCredits={30}></DropdownDesign>
    }

    return <></>
}
