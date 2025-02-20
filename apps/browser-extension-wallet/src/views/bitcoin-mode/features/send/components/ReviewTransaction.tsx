
import React from "react";

interface ReviewTransactionProps {
  amount: number;
  usdValue: number;
  address: string;
  feeRate: number;
  estimatedTime: string;
  onConfirm: () => void;
  onBack: () => void;
}

export const ReviewTransaction: React.FC<ReviewTransactionProps> = ({
                                                                      amount,
                                                                      usdValue,
                                                                      address,
                                                                      feeRate,
                                                                      estimatedTime,
                                                                      onConfirm,
                                                                      onBack
                                                                    }) => {
  const estimatedTxSizeVBytes = 200;
  const feeInBtc = (feeRate * estimatedTxSizeVBytes) / 1e8;
  const totalSpend = amount + feeInBtc;

  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Review</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Step 3: Review your transaction
      </p>

      <div style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
        {amount.toFixed(8)} BTC ~ ${usdValue.toFixed(2)} USD
      </div>

      <p style={{ wordBreak: 'break-all', marginBottom: '1rem' }}>
        <strong>To</strong> {address}
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <div>
          <strong>Total spend:</strong> {totalSpend.toFixed(8)} BTC
        </div>
        <div>
          <strong>Sending:</strong> {amount.toFixed(8)} BTC
        </div>
        <div>
          <strong>Fee:</strong> {feeInBtc.toFixed(8)} BTC ({feeRate} sats/vB)
        </div>
        <div>
          <strong>Estimated confirmation time:</strong> {estimatedTime}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Confirm and send transaction
        </button>
      </div>
    </div>
  );
};
