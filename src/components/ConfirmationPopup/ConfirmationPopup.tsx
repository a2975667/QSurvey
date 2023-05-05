import React from "react";

interface ConfirmationPopupProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationPopup: React.FC<React.PropsWithChildren<ConfirmationPopupProps>> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  //console.log(isOpen)
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup">
        <p>You have not organized all the options. Are you sure you want to continue?</p>
        <button onClick={onConfirm}>Yes</button>
        <button onClick={onCancel}>No</button>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
