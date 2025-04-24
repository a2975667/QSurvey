import React, { Children, useState } from "react";
import "./button.css";

interface Props {
  label: string;
  className: string;
  onClick: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const CustomButton = ({
  label,
  className,
  onClick,
  style,
  children,
  disabled = false,
}: Props & { onClick: () => void }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <div className="button-wrapper">
      <button
        className={`button ${className} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
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
