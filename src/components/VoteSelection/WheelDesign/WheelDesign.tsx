import ScrollPicker from "./Wheel";

export interface WheelDesignProps {
    remaining_credits: number;
    //designType: 'Wheel' | 'Drop';
    // onSelect: (option) => {
    //     console.log('You selected ', option.label)
    //     this.setState({selected: option})
    // }
}

// const createVoteOptions = (remaining_credits: number) => {
//     // take the squareroot of remianing_credits
//     let votes = Math.floor(Math.sqrt(remaining_credits));
//     let options = [];
//     let index = 0
//     for (let i = votes; i >= -votes; i--) {
//         let option = {
//             index: index,
//             label: i,
//             value: i.toString(),
//             votes: i,
//             cost: i*i
//         }
//         options.push(option);
//         index++;
//     }
//     return options;
// }

// get index of the option
// const _getIndexOfOption = (options, option) => {

// export const DropdownDesign = (props: DropdownDesignProps) => {
//     const options = createVoteOptions(props.remaining_credits);
//     return(
//         <Dropdown options={options} placeholder="Select an option" />
//     )
// }

export const WheelDesign = (props: WheelDesignProps) => {
    const options = createVoteOptions(props.remaining_credits);
    return(
        <ScrollPicker
                dataSource={["a", "b", "c", "d"]}
                selectedIndex={1}
                renderItem={(data, index, isSelected) => {
                    //
                }}
                onValueChange={(data, selectedIndex) => {
                    //
                }}
                wrapperHeight={180}
                wrapperWidth={150}
                wrapperBackground={"#FFFFFF"}
                itemHeight={60}
                highlightColor={"#d8d8d8"}
                highlightBorderWidth={2}
                activeItemColor={"#222121"}
                itemColor={"#B4B4B4"}
            />
    )
}