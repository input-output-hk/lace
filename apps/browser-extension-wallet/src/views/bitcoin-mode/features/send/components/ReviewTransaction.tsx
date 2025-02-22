
import React from "react";
import {renderLabel, RowContainer} from "@lace/core";
import {Flex, Text} from "@input-output-hk/lace-ui-toolkit";
import styles from "./ReviewTransaction.module.scss";
import {Button} from "@lace/common";

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
    <div>
      <div style={{paddingBottom: '1.5rem'}}>
        <RowContainer>
          {renderLabel({label: 'To', dataTestId: 'output-summary-recipient-title'})}
          <Flex className={styles.recipient} flexDirection="column">
            <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
              <Text.Address
                color={'secondary'}
                className={styles.address}
                data-testid="output-summary-recipient-address"
              >
                {address}
              </Text.Address>
            </Flex>
          </Flex>
        </RowContainer>
      </div>

      <div style={{paddingBottom: '1.5rem'}}>
        <RowContainer>
          {renderLabel({
            label: 'Total',
            dataTestId: 'summary-total-spend',
            onTooltipHover: () => {
            }
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address
              color={'secondary'}
              className={styles.address}
              data-testid="output-summary-recipient-address"
            >
              {parseFloat(totalSpend.toFixed(8))} BTC ({parseFloat(usdValue.toFixed(2))} USD)
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div style={{paddingBottom: '1.5rem'}}>
        <RowContainer>
          {renderLabel({
            label: 'Sending',
            dataTestId: 'summary-sending',
            onTooltipHover: () => {
            }
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address
              color={'secondary'}
              className={styles.address}
              data-testid="output-summary-recipient-address"
            >
              {parseFloat(amount.toFixed(8))} BTC
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div style={{paddingBottom: '1.5rem'}}>
        <RowContainer>
          {renderLabel({
            label: 'Fee',
            tooltipContent: 'fee',
            dataTestId: 'summary-fee',
            onTooltipHover: () => {
            }
          })}

          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address
              color={'secondary'}
              className={styles.address}
              data-testid="output-summary-recipient-address"
            >
              {parseFloat(feeInBtc.toFixed(8))} BTC ({feeRate} sats/vB)
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div style={{paddingBottom: '1.5rem'}}>
        <RowContainer>
          {renderLabel({
            label: 'Time',
            tooltipContent: 'Estimated Confirmation Time',
            dataTestId: 'summary-estimated-confirmation-time',
            onTooltipHover: () => {
            }
          })}

          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address
              color={'secondary'}
              className={styles.address}
              data-testid="output-summary-recipient-address"
            >
              {estimatedTime}
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

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
          onClick={onConfirm}
          data-testid="continue-button"
        >
          Confirm
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
