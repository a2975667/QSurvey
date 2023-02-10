import React, { useState } from 'react';
import './button.css';

interface Props {
  label: string;
  className: string;
  onClick: () => void;
}

export const CustomButton = ({ label, className, onClick }: Props & { onClick: () => void }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  console.log('className', className);

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
