// import Dropdown from 'react-dropdown';
import Dropdown from './Dropdown';

import './style.css';
import './DropdownDesign.css';
import { createVoteOptions } from '../WheelDesign/vote-option-calculator';

export interface DropdownDesignProps {
    remainingCredits: number;
    //designType: 'Wheel' | 'Drop';
    // onSelect: (option) => {
    //     console.log('You selected ', option.label)
    //     this.setState({selected: option})
    // }
}



// get index of the option
// const _getIndexOfOption = (options, option) => {

// export const DropdownDesign = (props: DropdownDesignProps) => {
//     const options = createVoteOptions(props.remaining_credits);
//     return(
//         <Dropdown options={options} placeholder="Select an option" />
//     )
// }

export const DropdownDesign = (props: DropdownDesignProps) => {
    const options = createVoteOptions(props.remainingCredits);
    return(
        <Dropdown options={options}/>
    )
}