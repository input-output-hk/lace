import React, { useState } from "react";
import { Button, Input } from "@lace/common";
import { BitcoinWallet } from "@lace/bitcoin/";
import styles from "./FeeSelectionStep.module.scss";

interface RecommendedFee {
  label: string;
  feeRate: number;        // sats/vB
  estimatedTime: string;  // e.g. "~10 min"
}

const SATS_IN_BTC = 100000000;

const recommendedFees: RecommendedFee[] = [
  { label: "Fast", feeRate: 10, estimatedTime: "~10 min" },
  { label: "Average", feeRate: 5, estimatedTime: "~30 min" },
  { label: "Slow", feeRate: 1, estimatedTime: "~60 min" },
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
                                                                onBack,
                                                              }) => {
  if (feeMarkets) {
    recommendedFees[0].feeRate = feeMarkets.fast.feeRate;
    recommendedFees[1].feeRate = feeMarkets.standard.feeRate;
    recommendedFees[2].feeRate = feeMarkets.slow.feeRate;
  }

  const [activeTab, setActiveTab] = useState<"recommended" | "custom">("recommended");
  const [selectedFee, setSelectedFee] = useState<RecommendedFee | null>(
    recommendedFees.find((f) => f.feeRate === feeRate) || recommendedFees[1]
  );
  const [customFee, setCustomFee] = useState<number>(feeRate);

  const handleContinue = () => {
    if (activeTab === "recommended" && selectedFee) {
      onFeeRateChange(selectedFee.feeRate);
      onEstimatedTimeChange(selectedFee.estimatedTime);
    } else {
      onFeeRateChange(customFee);
      onEstimatedTimeChange("~?? min");
    }
    onContinue();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.tabs}>
          <div
            className={`${styles.tab} ${activeTab === "recommended" ? styles.active : ""}`}
            onClick={() => setActiveTab("recommended")}
          >
            Recommended
          </div>
          <div
            className={`${styles.tab} ${activeTab === "custom" ? styles.active : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            Custom
          </div>
        </div>

        {activeTab === "recommended" && (
          <div className={styles.feeList}>
            {recommendedFees.map((fee) => {
              const isSelected = fee.feeRate === selectedFee?.feeRate;
              return (
                <div
                  key={fee.label}
                  className={`${styles.feeItem} ${isSelected ? styles.selected : ""}`}
                  onClick={() => setSelectedFee(fee)}
                >
                  <div className={styles.feeLabel}>{fee.label}</div>
                  <div className={styles.feeDetails}>
                    <span>{((fee.feeRate * SATS_IN_BTC) / 1000).toFixed(2)} sats/vB</span>
                    <span>{fee.estimatedTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "custom" && (
          <div className={styles.customFee}>
            <Input
              type="number"
              disabled={false}
              value={customFee.toString()}
              data-testid="btc-add-custom-fee"
              placeholder="Specify your own fee rate (sats/vB)"
              bordered={false}
              onChange={(e) => setCustomFee(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className={styles.buttonContainer}>
        <Button
          color="primary"
          block
          size="medium"
          onClick={handleContinue}
          data-testid="continue-button"
          className={styles.button}
        >
          Continue
        </Button>
        <Button
          color="secondary"
          block
          size="medium"
          onClick={onBack}
          data-testid="back-button"
          className={styles.button}
        >
          Back
        </Button>
      </div>
    </div>
  );
};
