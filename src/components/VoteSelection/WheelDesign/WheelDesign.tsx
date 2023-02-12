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
