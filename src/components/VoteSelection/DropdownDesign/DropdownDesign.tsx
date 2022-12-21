// import Dropdown from 'react-dropdown';
import Dropdown from './Dropdown';

import './style.css';
import './DropdownDesign.css';

export interface DropdownDesignProps {
    remaining_credits: number;
    //designType: 'Wheel' | 'Drop';
    // onSelect: (option) => {
    //     console.log('You selected ', option.label)
    //     this.setState({selected: option})
    // }
}

const createVoteOptions = (remaining_credits: number) => {
    // take the squareroot of remianing_credits
    let votes = Math.floor(Math.sqrt(remaining_credits));
    let options = [];
    let index = 0
    for (let i = votes; i >= -votes; i--) {
        let option = {
            index: index,
            label: i,
            value: i.toString(),
            votes: i,
            cost: i*i
        }
        options.push(option);
        index++;
    }
    return options;
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
    const options = createVoteOptions(props.remaining_credits);
    return(
        <Dropdown options={options}/>
    )
}