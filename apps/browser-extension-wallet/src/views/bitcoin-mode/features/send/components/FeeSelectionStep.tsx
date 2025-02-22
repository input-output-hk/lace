import React, { useState } from "react";
import { Button, Input } from "@lace/common";
import { BitcoinWallet } from "@lace/bitcoin/";
// import styles from "./SendStepOne.module.scss";
//import { Typography } from 'antd';

// const { Text } = Typography;

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
  feeMarkets: BitcoinWallet.EstimatedFees | null;
  onEstimatedTimeChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const FeeSelectionStep: React.FC<FeeSelectionProps> = ({
                                                                feeRate,
                                                                feeMarkets,
                                                                onFeeRateChange,
                                                                onEstimatedTimeChange,
                                                                onContinue,
                                                                onBack
                                                              }) => {
  recommendedFees[0].feeRate = feeMarkets.fast.feeRate;
  recommendedFees[1].feeRate = feeMarkets.standard.feeRate;
  recommendedFees[2].feeRate = feeMarkets.slow.feeRate;

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
    <div style={{width: '100%'}}>
      <div style={{display: 'flex', marginBottom: '1rem', cursor: 'pointer'}}>
        <div
          onClick={() => setActiveTab('recommended')}
          style={{
            flex: 1,
            textAlign: 'center',
            borderBottom: activeTab === 'recommended' ? '2px solid #7f5af0' : '1px solid #ccc',
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
            borderBottom: activeTab === 'custom' ? '2px solid #7f5af0' : '1px solid #ccc',
            padding: '0.5rem'
          }}
        >
          Custom
        </div>
      </div>

      {activeTab === 'recommended' && (
        <div style={{width: '100%', display: 'inline-block'}}>
          {recommendedFees.map((fee) => {
            const isSelected = fee.feeRate === selectedFee?.feeRate;
            return (
              <div
                key={fee.label}
                style={{
                  width: '100%',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  border: '1px solid #7f5af0',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(127,90,240,0.25)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedFee(fee)}
              >
                <div style={{marginBottom: '0.2rem', fontWeight: 'bold'}}>{fee.label}</div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>{fee.feeRate} sats/vB</span>
                  <span>{fee.estimatedTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'custom' && (
        <div style={{marginBottom: '1rem'}}>
          <Input
            type="number"
            disabled={false}
            value={customFee.toString()}
            data-testid="btc-add-custom-fee"
            placeholder={'Specify your own fee rate (sats/vB)'}
            bordered={false}
            onChange={(e) => setCustomFee(Number(e.target.value))}
          />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 325,
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '1rem',
          borderTop: '1px solid #E0E0E0',
        }}
      >
        <Button
          color="primary"
          block
          size="medium"
          onClick={handleContinue}
          data-testid="continue-button"
        >
          Continue
        </Button>
        <Button
          color="secondary"
          block
          size="medium"
          onClick={onBack}
          data-testid="back-button"
        >
          Back
        </Button>
      </div>
    </div>
  );
};
