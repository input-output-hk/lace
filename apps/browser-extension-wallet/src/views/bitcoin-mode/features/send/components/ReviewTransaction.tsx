/* eslint-disable no-magic-numbers, @typescript-eslint/no-empty-function */
import React from 'react';
import { renderLabel, RowContainer } from '@lace/core';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './ReviewTransaction.module.scss';
import { Button } from '@lace/common';
import { Bitcoin } from '@lace/bitcoin';

const SATS_IN_BTC = 100_000_000;

interface ReviewTransactionProps {
  unsignedTransaction: Bitcoin.UnsignedTransaction;
  btcToUsdRate: number;
  feeRate: number;
  estimatedTime: string;
  onConfirm: () => void;
  onBack: () => void;
}

export const ReviewTransaction: React.FC<ReviewTransactionProps> = ({
  unsignedTransaction,
  btcToUsdRate,
  feeRate,
  estimatedTime,
  onConfirm,
  onBack
}) => {
  const amount = Number(unsignedTransaction.amount);
  const usdValue = (amount / SATS_IN_BTC) * btcToUsdRate;
  const feeInBtc = unsignedTransaction.fee;
  const totalSpend = amount + Number(feeInBtc);

  console.error('unsignedTransaction', unsignedTransaction);
  console.error('unsignedTransaction.amount', unsignedTransaction.amount);
  console.error('unsignedTransaction.fee', unsignedTransaction.fee);
  console.error('unsignedTransaction.total', unsignedTransaction.amount + unsignedTransaction.fee);

  return (
    <div className={styles.reviewContainer}>
      <div className={styles.section}>
        <RowContainer>
          {renderLabel({ label: 'To', dataTestId: 'output-summary-recipient-title' })}
          <Flex className={styles.recipient} flexDirection="column">
            <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
              <Text.Address color="secondary" className={styles.address} data-testid="output-summary-recipient-address">
                {unsignedTransaction.toAddress}
              </Text.Address>
            </Flex>
          </Flex>
        </RowContainer>
      </div>

      <div className={styles.section}>
        <RowContainer>
          {renderLabel({
            label: 'Total',
            dataTestId: 'summary-total-spend',
            onTooltipHover: () => {}
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address color="secondary" className={styles.address} data-testid="output-summary-recipient-address">
              {Number.parseFloat((totalSpend / SATS_IN_BTC).toFixed(8))} BTC ({Number.parseFloat(usdValue.toFixed(2))}{' '}
              USD)
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div className={styles.section}>
        <RowContainer>
          {renderLabel({
            label: 'Sending',
            dataTestId: 'summary-sending',
            onTooltipHover: () => {}
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address color="secondary" className={styles.address} data-testid="output-summary-recipient-address">
              {(amount / SATS_IN_BTC).toFixed(8)} BTC
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div className={styles.section}>
        <RowContainer>
          {renderLabel({
            label: 'Fee',
            tooltipContent: 'fee',
            dataTestId: 'summary-fee',
            onTooltipHover: () => {}
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address color="secondary" className={styles.address} data-testid="output-summary-recipient-address">
              {Number.parseFloat((Number(feeInBtc) / SATS_IN_BTC).toFixed(8))} BTC ({(feeRate * SATS_IN_BTC) / 1000}{' '}
              sats/vB)
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div className={styles.section}>
        <RowContainer>
          {renderLabel({
            label: 'Time',
            tooltipContent: 'Estimated Confirmation Time',
            dataTestId: 'summary-estimated-confirmation-time',
            onTooltipHover: () => {}
          })}
          <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
            <Text.Address color="secondary" className={styles.address} data-testid="output-summary-recipient-address">
              {estimatedTime}
            </Text.Address>
          </Flex>
        </RowContainer>
      </div>

      <div className={styles.buttonContainer}>
        <Button color="primary" block size="medium" onClick={onConfirm} data-testid="continue-button">
          Confirm
        </Button>
        <Button color="secondary" block size="medium" onClick={onBack} data-testid="back-button">
          Back
        </Button>
      </div>
    </div>
  );
};
