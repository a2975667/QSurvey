<<<<<<< HEAD
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
=======
import { useState } from "react";
import Picker from "rmc-picker-scroll/lib/Picker";
import MultiPicker from "rmc-picker-scroll/lib/MultiPicker";
import "./style.css";
import { createVoteOptions } from "../utils/vote-option-calculator";

export interface WheelDesignProps {
  remainingCredits: number;
}
export const WheelDesign = (props: WheelDesignProps) => {
  const options = createVoteOptions(props.remainingCredits);
  const [value, setValue] = useState(1);
  const onChange = (value: number) => {
    console.log("onChange", value);
    setValue(value);
  };

  return (
    <div className="picker-container">
      <button className="triangle-buttons">
        <div className="triangle-buttons__triangle triangle-buttons__triangle--t"></div>
      </button>
      <Picker
        indicatorClassName="rmc-picker-indicatorr"
        onValueChange={onChange}
        selectedValue={value}
      >
        {options.map((item) => {
          return (
            <Picker.Item
              className="my-picker-view-item"
              value={item.label}
              key={item.label}
            >
              <div> {item.label} rating</div>
              <div> ${item.cost} </div>
            </Picker.Item>
          );
        })}
      </Picker>
      <button className="triangle-buttons">
        <div className="triangle-buttons__triangle triangle-buttons__triangle--b"></div>
      </button>
    </div>
  );
};
>>>>>>> 12ec61b0399b5427d761f84ea78ba619b9bc6428
