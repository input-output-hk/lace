import React from "react";
import { Input, Button } from "@lace/common";
import styles from "./SendStepOne.module.scss";
import { Typography } from 'antd';

const { Text } = Typography;

interface SendStepOneProps {
  amount: string;
  onAmountChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  onContinue: () => void;
}

export const SendStepOne: React.FC<SendStepOneProps> = ({
                                                          amount,
                                                          onAmountChange,
                                                          address,
                                                          onAddressChange,
                                                          onContinue
                                                        }) => {
  const availableBalance = 0.0009529; // Example
  const numericAmount = parseFloat(amount) || 0;

  const hasNoValue = numericAmount === 0;
  const exceedsBalance = numericAmount > availableBalance;

  const handleNext = () => {
    if (!hasNoValue && !exceedsBalance && address.trim() !== '') {
      onContinue();
    }
  };

  return (
    <div>
      <Input
        disabled={false}
        value={address}
        data-testid="btc-address-input"
        placeholder={'Enter recipient address'}
        bordered={false}
        onChange={(e) => onAddressChange(e.target.value)}
      />

      <div style={{ paddingTop: 50 }}>
        <Text className={styles.infoParagraph} data-testid="Amount">
          Available balance: {availableBalance.toFixed(7)} BTC
        </Text>
        <Input
          type="number"
          disabled={false}
          value={amount}
          data-testid="btc-address-input"
          placeholder={'Enter amount (BTC)'}
          bordered={false}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>

      {exceedsBalance && (
        <Text className={styles.errorParagraph} data-testid="no-val-warning">
          Amount exceeds available balance
        </Text>
      )}

      <div style={{paddingTop: 135}}>
        <hr style={{border: '1px solid #E0E0E0'}}/>
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
