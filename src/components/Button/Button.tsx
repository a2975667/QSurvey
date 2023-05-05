import React, { Children, useState } from "react";
import "./button.css";

interface Props {
  label: string;
  className: string;
  onClick: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const CustomButton = ({
  label,
  className,
  onClick,
  style,
  children,
}: Props & { onClick: () => void }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div className="button-wrapper">
      <button
        className={`button ${className}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {label}
      </button>
      {isHovered && children}
    </div>
  );
};

export const Button = () => {
  return <></>;
};
