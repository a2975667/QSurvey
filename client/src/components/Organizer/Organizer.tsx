import React, { useEffect, useState } from "react";
import { updateOptionGroup } from "../../features/qsOptionsSlice";
import { useDispatch } from 'react-redux';
import { IQsOption } from "../../types/coreTypes";
import "./organizer.css";

interface OrganizerType {
    options: { [key: string]: IQsOption };
}

export const Organizer = (props: OrganizerType) => {
    // the order here matters, the last one must be undecided.
    const selfDefinedCategories = ["Positive", "Neutral", "Negative"];
    const categories = selfDefinedCategories.concat(["Undecided"]);
    const optionsByCategory = {} as { [key: string]: IQsOption[] }

    categories.forEach(category => {
        optionsByCategory[category] = [];
    });

    Object.values(props.options).forEach(option => {
        const category = categories.includes(option.group) ? option.group : "Undecided";
        const index = optionsByCategory[category].findIndex(op => op.groupPosition !== undefined && op.groupPosition >= option.groupPosition!);
        if (index === -1) {
            optionsByCategory[category].push(option);
        } else {
            optionsByCategory[category].splice(index, 0, option);
        }
    });


    const dispatch = useDispatch();
    const updateGroupByOptionId = (optionId: string, newGroup: string) => {
        dispatch(updateOptionGroup({ optionId, newGroup }));
    };

    return (
        <div>
            <h1>Organizer</h1>
            <div className="container">
                {categories.slice(0, 3).map(category => (
                    <div className={`category ${category.toLowerCase()}`} key={category}>
                        <h2>{category}</h2>
                        {optionsByCategory[category].map(option => (
                            <div className="option-box" key={option.optionId}>
                                <div className="option-name">{option.optionName}</div>
                                <div className="option-buttons">
                                    <button
                                        key="Undefined"
                                        onClick={() => updateGroupByOptionId(option.optionId, "Undefined")}
                                    > Redecide
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="undecided">
                <h2>Undecided</h2>
                {optionsByCategory["Undecided"].map(option => (
                    <div className="option-box" key={option.optionId}>
                        <div className="option-name">{option.optionName}</div>
                        <div className="option-buttons">
                            {selfDefinedCategories.map(selfDefinedCategory => (
                                <button
                                    key={selfDefinedCategory}
                                    onClick={() => updateGroupByOptionId(option.optionId, selfDefinedCategory)}
                                >
                                    {selfDefinedCategory}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};