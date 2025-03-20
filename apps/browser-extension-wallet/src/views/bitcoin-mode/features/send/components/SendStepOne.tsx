/* eslint-disable no-magic-numbers */
import React from 'react';
import { Input, Button } from '@lace/common';
import styles from './SendStepOne.module.scss';
import { Typography } from 'antd';

const SATS_IN_BTC = 100_000_000;
const { Text } = Typography;

interface SendStepOneProps {
  amount: string;
  onAmountChange: (value: string) => void;
  address: string;
  availableBalance: number;
  onAddressChange: (value: string) => void;
  onContinue: () => void;
}

export const SendStepOne: React.FC<SendStepOneProps> = ({
  amount,
  onAmountChange,
  address,
  onAddressChange,
  availableBalance,
  onContinue
}) => {
  const numericAmount = Number.parseFloat(amount) || 0;
  const hasNoValue = numericAmount === 0;
  const exceedsBalance = numericAmount > availableBalance / SATS_IN_BTC;

  const handleNext = () => {
    if (!hasNoValue && !exceedsBalance && address.trim() !== '') {
      onContinue();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Input
          disabled={false}
          value={address}
          data-testid="btc-address-input"
          placeholder="Enter recipient address"
          bordered={false}
          onChange={(e) => onAddressChange(e.target.value)}
        />

        <div className={styles.amountSection}>
          <Text className={styles.infoParagraph} data-testid="Amount">
            Available balance: {(availableBalance / SATS_IN_BTC).toFixed(8)} BTC
          </Text>
          <Input
            type="number"
            disabled={false}
            value={amount}
            data-testid="btc-amount-input"
            placeholder="Enter amount (BTC)"
            bordered={false}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </div>

        {exceedsBalance && (
          <Text className={styles.errorParagraph} data-testid="no-val-warning">
            Amount exceeds available balance
          </Text>
        )}
      </div>

      <div className={styles.buttons}>
        <Button
          disabled={hasNoValue || exceedsBalance || address.trim() === ''}
          color="primary"
          block
          size="medium"
          onClick={handleNext}
          data-testid="continue-button"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
