/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
import React from 'react';
import { renderLabel, RowContainer } from '@lace/core';
import { Box, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './ReviewTransaction.module.scss';
import mainStyles from './SendFlow.module.scss';
import { addEllipsis, Button } from '@lace/common';
import { Bitcoin } from '@lace/bitcoin';
import { useTranslation } from 'react-i18next';

const SATS_IN_BTC = 100_000_000;
const MAXIMUM_FEE_DECIMAL = 8;

interface ReviewTransactionProps {
  unsignedTransaction: Bitcoin.UnsignedTransaction;
  btcToUsdRate: number;
  feeRate: number;
  estimatedTime: string;
  onConfirm: () => void;
  onClose: () => void;
  isPopupView: boolean;
}

export const ReviewTransaction: React.FC<ReviewTransactionProps> = ({
  unsignedTransaction,
  btcToUsdRate,
  feeRate,
  estimatedTime,
  onConfirm,
  isPopupView,
  onClose
}) => {
  const { t } = useTranslation();
  const amount = Number(unsignedTransaction.amount);
  const usdValue = (amount / SATS_IN_BTC) * btcToUsdRate;
  const feeInBtc = unsignedTransaction.fee;

  return (
    <Flex flexDirection="column" w="$fill" className={mainStyles.container}>
      <Flex className={mainStyles.container} flexDirection="column" w="$fill">
        {isPopupView ? (
          <Text.Heading weight="$bold">{t('browserView.transaction.send.drawer.transactionSummary')}</Text.Heading>
        ) : (
          <Text.SubHeading weight="$bold">
            {t('browserView.transaction.send.drawer.transactionSummary')}
          </Text.SubHeading>
        )}

        <Box mt={isPopupView ? '$48' : '$4'}>
          <Text.Body.Normal color="secondary" weight="$medium">
            {t('browserView.transaction.send.drawer.breakdownOfYourTransactionCost')}
          </Text.Body.Normal>
        </Box>
        <Box w="$fill" mt={isPopupView ? '$40' : '$96'}>
          <RowContainer>
            {renderLabel({
              label: t('browserView.activity.entry.name.sending'),
              dataTestId: 'summary-total-spend'
            })}
            <Flex flexDirection="column" w="$fill" alignItems="flex-end">
              <Text.Body.Normal weight={isPopupView ? '$medium' : '$semibold'} data-testid="output-summary-amount">
                {Number.parseFloat((amount / SATS_IN_BTC).toFixed(8))} BTC
              </Text.Body.Normal>
              <Text.Body.Normal
                color="secondary"
                weight={isPopupView ? '$medium' : '$semibold'}
                data-testid="output-summary-amount-fiat"
              >
                {Number.parseFloat(usdValue.toFixed(2))} USD
              </Text.Body.Normal>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt={isPopupView ? '$24' : '$32'}>
          <RowContainer>
            {renderLabel({
              label: t('core.outputSummaryList.recipientAddress'),
              dataTestId: 'output-summary-recipient-title'
            })}
            <Flex flexDirection="column">
              <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
                <Text.Address className={styles.address} data-testid="output-summary-recipient-address">
                  {isPopupView ? addEllipsis(unsignedTransaction.toAddress, 12, 5) : unsignedTransaction.toAddress}
                </Text.Address>
              </Flex>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt={isPopupView ? '$32' : '$40'} mb="$8" className={styles.divider} />

        <Box w="$fill" mt={isPopupView ? '$24' : '$32'}>
          <RowContainer>
            {renderLabel({
              label: t('browserView.transaction.send.transactionFee'),
              dataTestId: 'summary-fee'
            })}
            <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
              <Text.Body.Normal weight="$medium" data-testid="output-summary-fee">
                {(Number(feeInBtc) / SATS_IN_BTC).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: MAXIMUM_FEE_DECIMAL,
                  useGrouping: false
                })}{' '}
                BTC
              </Text.Body.Normal>
              <Text.Body.Normal weight="$medium" data-testid="output-summary-fee-rate" className={styles.feeRateLabel}>
                {((feeRate * SATS_IN_BTC) / 1000).toFixed(2)} sats/vB
              </Text.Body.Normal>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt={isPopupView ? '$24' : '$32'}>
          <RowContainer>
            {renderLabel({
              label: t('browserView.transaction.btc.send.time'),
              dataTestId: 'summary-estimated-confirmation-time'
            })}
            <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
              <Text.Body.Normal weight="$medium" data-testid="output-summary-recipient-address">
                {estimatedTime}
              </Text.Body.Normal>
            </Flex>
          </RowContainer>
        </Box>
      </Flex>
      <Flex
        w="$fill"
        py="$24"
        pb={isPopupView ? '$0' : '$24'}
        px="$40"
        flexDirection="column"
        gap={isPopupView ? '$8' : '$16'}
        className={mainStyles.buttons}
      >
        <Button color="primary" block size="medium" onClick={onConfirm} data-testid="continue-button">
          {t('browserView.transaction.send.footer.confirm')}
        </Button>
        <Button color="secondary" block size="medium" onClick={onClose} data-testid="back-button">
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
