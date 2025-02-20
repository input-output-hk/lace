import React from "react";

interface TransactionFailedProps {
  onClose: () => void;
}

export const TransactionFailed: React.FC<TransactionFailedProps> = ({ onClose }) => {
  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Transaction Failed</h2>
      <p>Something went wrong. Please try again.</p>
      <button
        onClick={onClose}
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          fontSize: '1rem',
          backgroundColor: '#dc3545',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Close
      </button>
    </div>
  );
};
