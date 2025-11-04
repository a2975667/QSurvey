import React, { useState } from 'react';

interface ResumeModalProps {
  link: string;
  onClose: () => void;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ link, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
      }
    } catch (e) {
      // best-effort; ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{ background: 'white', borderRadius: 6, width: 'min(640px, 90%)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0 }}>Save your resume link</h3>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ marginTop: 0 }}>Use this link to resume your survey later:</p>
          <div style={{ wordBreak: 'break-all', border: '1px solid #ddd', padding: 12, borderRadius: 4 }} data-testid="resume-link">
            {link}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="secondary-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
            <button className="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;

