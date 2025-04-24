import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import Picker from "rmc-picker-scroll/lib/Picker";
import { updateOptionVotes } from "../../../features/qsOptionsSlice";
import "./style.css";

export interface WheelDesignProps {
  options: number[];
  optionId: string;
  currVote: number;
}

// some code I copied from github: https://github.com/facebook/react/issues/14856#issuecomment-829318408

function useWheelHack(timeout = 300) {
  const wheelTimeout = useRef<
    ReturnType<typeof setTimeout> | false | undefined
  >();

  // block the body from scrolling while wheelTimeout is set
  useEffect(() => {
    const maybeCancelWheel = (e: { preventDefault: () => any }) =>
      wheelTimeout.current && e.preventDefault();
    document.body.addEventListener("wheel", maybeCancelWheel, {
      passive: false,
    });
    return () => document.body.removeEventListener("wheel", maybeCancelWheel);
  }, []);

  // return a function that can be used to prevent scrolling for timeout ms
  return () => {
    clearTimeout(wheelTimeout.current as ReturnType<typeof setTimeout>);
    wheelTimeout.current = setTimeout(() => {
      wheelTimeout.current = false;
    }, timeout) as ReturnType<typeof setTimeout>;
  };
}

const updateQsOption = (dispatch: AppDispatch, optionId: string, newVote: number) => {
  try {
    // this should be updated
    // to prevent different questions with the same optionID
    dispatch(updateOptionVotes({ optionId, newVote }));
  } catch (error) {
    console.error("Error updating votes in WheelDesign:", error);
  }
};

export const WheelDesign = (props: WheelDesignProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const preventWheelDefault = useWheelHack();
  const options = props.options;
  const [value, setValue] = useState(props.currVote);
  const [tmpWheelValue, setTmpWheelValue] = useState(props.currVote);

  useEffect(() => {
    setValue(props.currVote);
    setTmpWheelValue(props.currVote);
  }, [props.currVote]);

  const onChange = (value: number) => {
    updateQsOption(dispatch, props.optionId, value);
    setValue(value);
    setTmpWheelValue(props.currVote);
  };

  const maxValue = options.reduce((max, option) => {
    return Math.max(max, option);
  }, -Infinity);

  const minValue = options.reduce((min, option) => {
    return Math.min(min, option);
  }, Infinity);

  const handleWheel = (event: React.WheelEvent) => {
    const damping = 0.4; // this controls the scroll speed
    const delta = Math.sign(event.deltaY) * damping * -1;
    let newValue = tmpWheelValue + delta;

    newValue = Math.min(maxValue, Math.max(minValue, newValue));

    if (
      (newValue > 0 && Math.floor(newValue) !== Math.floor(tmpWheelValue)) ||
      (newValue < 0 && Math.ceil(newValue) !== Math.ceil(tmpWheelValue))
    ) {
      if (delta > 0) {
        if (newValue >= tmpWheelValue) {
          updateQsOption(dispatch, props.optionId, Math.floor(newValue));
          setValue(Math.floor(newValue));
          setTmpWheelValue(Math.floor(newValue));
        } else {
          updateQsOption(dispatch, props.optionId, Math.ceil(newValue));
          setValue(Math.ceil(newValue));
          setTmpWheelValue(Math.ceil(newValue));
        }
      } else {
        if (newValue <= tmpWheelValue) {
          updateQsOption(dispatch, props.optionId, Math.ceil(newValue));
          setValue(Math.ceil(newValue));
          setTmpWheelValue(Math.ceil(newValue));
        } else {
          updateQsOption(dispatch, props.optionId, Math.floor(newValue));
          setValue(Math.floor(newValue));
          setTmpWheelValue(Math.floor(newValue));
        }
      }
    }

    setTmpWheelValue(newValue);
  };

  const handleIncrement = () => {
    if (value < maxValue) {
      updateQsOption(dispatch, props.optionId, value + 1);
      setValue(value + 1);
      setTmpWheelValue(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > minValue) {
      updateQsOption(dispatch, props.optionId, value - 1);
      setValue(value - 1);
      setTmpWheelValue(value - 1);
    }
  };

  return (
    <div className="picker-container">
      <div className="picker-arrow-container" onClick={handleIncrement}>
        <div
          className={`triangle-buttons__triangle triangle-buttons__triangle--t ${
            value === maxValue ? "triangle-disabled" : ""
          }`}
        ></div>
      </div>

      <div
        className="picker-center-container"
        onWheel={(event) => {
          preventWheelDefault();
          handleWheel(event);
        }}
      >
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
                <div>
                  {item > 0
                    ? `${item} ${item === 1 ? "upvote" : "upvotes"}`
                    : item < 0
                    ? `${-item} ${-item === 1 ? "downvote" : "downvotes"}`
                    : "No votes"}
                </div>

                <div className="horizontal-space"></div>
                <div> ${item * item} </div>
              </Picker.Item>
            );
          })}
        </Picker>
      </div>
      <div className="picker-arrow-container bottom" onClick={handleDecrement}>
        <div
          className={`triangle-buttons__triangle triangle-buttons__triangle--b ${
            value === minValue ? "triangle-disabled" : ""
          }`}
        ></div>
      </div>
    </div>
  );
};
