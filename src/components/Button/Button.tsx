import React, { useState } from 'react';
import './button.css';

interface Props {
  label: string;
  className: string;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const CustomButton = ({ label, className, onClick, style }: Props & { onClick: () => void }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      className={`button ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </button>
  );
};



export const Button = () => {
    return <></>
}
