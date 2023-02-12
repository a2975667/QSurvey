import React, { useState, useEffect } from "react";

const MouseTracker = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setPosition({
        x: event.clientX,
        y: event.clientY,
      });
    };
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleClick = (event, component) => {
    const interaction = {
      type: "click",
      component,
      time: new Date(),
    };

    setInteractions((prevInteractions) => [...prevInteractions, interaction]);
  };

  return (
    <div>
      <p>The mouse position is ({position.x}, {position.y})</p>
      <button onClick={(event) => handleClick(event, "Button 1")}>
        Button 1
      </button>
      <button onClick={(event) => handleClick(event, "Button 2")}>
        Button 2
      </button>
      <ul>
        {interactions.map((interaction, index) => (
          <li key={index}>
            {interaction.component} - {interaction.type} - {interaction.time.toString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MouseTracker;
