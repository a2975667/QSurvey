import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import Picker from "rmc-picker-scroll/lib/Picker";
import { updateOptionVotes } from "../../../features/qvOptionsSlice";
import "./style.css";

export interface WheelDesignProps {
  options: number[];
  optionId: string;
  currVote: number;
}

// some code I copied from github: https://github.com/facebook/react/issues/14856#issuecomment-829318408

function useWheelHack(timeout = 300) {
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | false | undefined>()

  // block the body from scrolling while wheelTimeout is set
  useEffect(() => {
    const maybeCancelWheel = (e: { preventDefault: () => any; }) => wheelTimeout.current && e.preventDefault()
    document.body.addEventListener('wheel', maybeCancelWheel, { passive: false })
    return () => document.body.removeEventListener('wheel', maybeCancelWheel)
  }, [])

  // return a function that can be used to prevent scrolling for timeout ms
  return () => {
    clearTimeout(wheelTimeout.current as ReturnType<typeof setTimeout>)
    wheelTimeout.current = setTimeout(() => {
      wheelTimeout.current = false
    }, timeout) as ReturnType<typeof setTimeout>
  }
}

const updateQvOption = (dispatch: any, optionId: string, newVote: number) => {
  // this should be updated 
  // to prevent different questions with the same optionID
  dispatch(
      updateOptionVotes({optionId, newVote})
  );
};

export const WheelDesign = (props: WheelDesignProps) => {
  const dispatch = useDispatch();
  const preventWheelDefault = useWheelHack()
  const options = props.options
  const [value, setValue] = useState(props.currVote);

  useEffect(() => {
    setValue(props.currVote);
  }, [props.currVote]);

  const onChange = (value: number) => {
    updateQvOption(dispatch, props.optionId, value);
    setValue(value);
  };

  const maxValue = options.reduce((max, option) => {
    return Math.max(max, option);
  }, -Infinity);

  const minValue = options.reduce((min, option) => {
    return Math.min(min, option);
  }, Infinity);

  const handleWheel = (event: React.WheelEvent) => {
    // event.stopPropagation();
    const delta = Math.sign(event.deltaY);
    let newValue = value + delta;

    if (newValue >= maxValue) {
      newValue = maxValue;
    } else if (newValue <= minValue) {
      newValue = minValue;
    }
    
    updateQvOption(dispatch, props.optionId, newValue);
    setValue(newValue);
    console.log("newValue", newValue);
  };

  const handleIncrement = () => {
    if (value < maxValue) {
      updateQvOption(dispatch, props.optionId, value+1);
      setValue(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > minValue) {
      updateQvOption(dispatch, props.optionId, value-1);
      setValue(value - 1);
    }
  };

  return (
    <div className="picker-container">
      <div className="picker-arrow-container">
        <div
          className={`triangle-buttons__triangle triangle-buttons__triangle--t ${
            value === maxValue ? "triangle-disabled" : ""
          }`}
          onClick={handleIncrement}
        ></div>
      </div>


      <div className="picker-center-container"
        onWheel={
          (event) => {
            preventWheelDefault()
            handleWheel(event)
          }
        }>
          
        <Picker
          indicatorClassName="rmc-picker-indicatorr"
          onValueChange={onChange}
          selectedValue={value}
        >
          {options.map((item) => {
            return (
              <Picker.Item
                className="my-picker-view-item"
                value={item}
                key={item}
              >
                <div> {item} rating</div>
                <div className="horizontal-space"></div>
                <div> ${item*item} </div>
              </Picker.Item>
            );
          })}
        </Picker>
      </div>
      <div className="picker-arrow-container bottom">
        <div
          className={`triangle-buttons__triangle triangle-buttons__triangle--b ${
            value === minValue ? "triangle-disabled" : ""
          }`}
          onClick={handleDecrement}
        ></div>
      </div>
    </div>
  );
};
