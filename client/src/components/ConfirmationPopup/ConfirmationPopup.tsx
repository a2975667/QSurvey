import React from "react";
import "./confirmationPopup.css";

interface ConfirmationPopupProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmationPopup: React.FC<React.PropsWithChildren<ConfirmationPopupProps>> = ({
  isOpen,
  onConfirm,
  onCancel,
  confirmLabel = "Yes",
  cancelLabel = "No",
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup">
        {/*
          TODO: make the message required (drop this hardcoded fallback and take
          it via a required prop / children). This component had no callers before
          the QVPlus restore-round feature, so the default sentence below is dead
          text — the only current caller always passes children. Keeping it for
          now purely for backward compatibility; clean up in a follow-up.
        */}
        <p>
          {children ?? "You have not organized all the options. Are you sure you want to continue?"}
        </p>
        <div className="popup-actions">
          <button className="popup-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="popup-confirm-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
