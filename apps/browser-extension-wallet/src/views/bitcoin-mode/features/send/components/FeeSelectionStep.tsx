
import React, {useState} from "react";

interface RecommendedFee {
  label: string;
  feeRate: number;        // sats/vB
  estimatedTime: string;  // e.g. "~10 min"
}

const recommendedFees: RecommendedFee[] = [
  { label: 'Fast', feeRate: 10, estimatedTime: '~10 min' },
  { label: 'Average', feeRate: 5, estimatedTime: '~30 min' },
  { label: 'Slow', feeRate: 1, estimatedTime: '~60 min' }
];

interface FeeSelectionProps {
  feeRate: number;
  onFeeRateChange: (value: number) => void;
  estimatedTime: string;
  onEstimatedTimeChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const FeeSelectionStep: React.FC<FeeSelectionProps> = ({
                                                                feeRate,
                                                                onFeeRateChange,
                                                                onEstimatedTimeChange,
                                                                onContinue,
                                                                onBack
                                                              }) => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'custom'>('recommended');
  const [selectedFee, setSelectedFee] = useState<RecommendedFee | null>(
    recommendedFees.find((f) => f.feeRate === feeRate) || recommendedFees[1]
  );
  const [customFee, setCustomFee] = useState<number>(feeRate);

  const handleContinue = () => {
    if (activeTab === 'recommended' && selectedFee) {
      onFeeRateChange(selectedFee.feeRate);
      onEstimatedTimeChange(selectedFee.estimatedTime);
    } else {
      onFeeRateChange(customFee);
      onEstimatedTimeChange('~?? min');
    }
    onContinue();
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Send</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Step 2: Pick fee market
      </p>

      <div style={{ display: 'flex', marginBottom: '1rem', cursor: 'pointer' }}>
        <div
          onClick={() => setActiveTab('recommended')}
          style={{
            flex: 1,
            textAlign: 'center',
            borderBottom: activeTab === 'recommended' ? '2px solid black' : '1px solid #ccc',
            padding: '0.5rem'
          }}
        >
          Recommended
        </div>
        <div
          onClick={() => setActiveTab('custom')}
          style={{
            flex: 1,
            textAlign: 'center',
            borderBottom: activeTab === 'custom' ? '2px solid black' : '1px solid #ccc',
            padding: '0.5rem'
          }}
        >
          Custom
        </div>
      </div>

      {activeTab === 'recommended' && (
        <div style={{ marginBottom: '1rem' }}>
          {recommendedFees.map((fee) => {
            const isSelected = fee.feeRate === selectedFee?.feeRate;
            return (
              <div
                key={fee.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedFee(fee)}
              >
                <div>{fee.label}</div>
                <div>{fee.feeRate} sats/vB</div>
                <div>{fee.estimatedTime}</div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'custom' && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem', color: '#666' }}>
            Specify your own fee rate (sats/vB)
          </p>
          <input
            type="number"
            min={1}
            value={customFee}
            onChange={(e) => setCustomFee(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
          />
        </div>
      )}

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
          onClick={handleContinue}
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
          Continue
        </button>
      </div>
    </div>
  );
};
