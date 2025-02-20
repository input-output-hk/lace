
import React from "react";

interface AllDoneProps {
  amount: number;
  address: string;
  feeRate: number;
  onClose: () => void;
}

export const AllDone: React.FC<AllDoneProps> = ({ amount, address, feeRate, onClose }) => {
  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>All Done</h2>
      <p style={{ fontSize: '1.25rem', margin: '1rem 0' }}>
        {amount.toFixed(8)} BTC was sent!
      </p>
      <p>
        To: <br />
        <span style={{ wordBreak: 'break-all' }}>{address}</span>
      </p>
      <p>Fee rate: {feeRate} sats/vB</p>
      <button
        onClick={onClose}
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          fontSize: '1rem',
          backgroundColor: '#007bff',
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
