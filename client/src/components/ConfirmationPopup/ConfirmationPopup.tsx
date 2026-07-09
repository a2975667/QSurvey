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
      <div className="popup" role="dialog" aria-modal="true">
        {/*
          TODO (follow-up cleanup):
          1. Make the message required (drop this hardcoded fallback and take it
             via a required prop / children). This component had no callers before
             the QVPlus restore-round feature, so the default sentence below is
             dead text — the only current caller always passes children. Kept for
             now purely for backward compatibility.
          2. Fuller accessibility: give the dialog an accessible name
             (aria-labelledby → the <p>), close on Escape, and trap/restore focus
             while open. role="dialog" + aria-modal below are the minimal baseline.
        */}
        <p>
          {children ?? "You have not organized all the options. Are you sure you want to continue?"}
        </p>
        <div className="popup-actions">
          <button type="button" className="popup-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="popup-confirm-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
