/* eslint-disable no-magic-numbers */
import React from 'react';
import { renderLabel, RowContainer } from '@lace/core';
import { Box, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import styles from './ReviewTransaction.module.scss';
import mainStyles from './SendFlow.module.scss';
import { Button } from '@lace/common';
import { BitcoinWallet } from '@lace/bitcoin';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '@src/views/browser-view/stores';

const SATS_IN_BTC = 100_000_000;

interface ReviewTransactionProps {
  unsignedTransaction: BitcoinWallet.UnsignedTransaction;
  btcToUsdRate: number;
  feeRate: number;
  estimatedTime: string;
  onConfirm: () => void;
}

export const ReviewTransaction: React.FC<ReviewTransactionProps> = ({
  unsignedTransaction,
  btcToUsdRate,
  feeRate,
  estimatedTime,
  onConfirm
}) => {
  const [config, clearContent] = useDrawer();
  const { t } = useTranslation();
  const amount = Number(unsignedTransaction.amount);
  const usdValue = (amount / SATS_IN_BTC) * btcToUsdRate;
  const feeInBtc = unsignedTransaction.fee;

  console.error('unsignedTransaction', unsignedTransaction);
  console.error('unsignedTransaction.amount', unsignedTransaction.amount);
  console.error('unsignedTransaction.fee', unsignedTransaction.fee);
  console.error('unsignedTransaction.total', unsignedTransaction.amount + unsignedTransaction.fee);

  return (
    <Flex flexDirection="column" w="$fill" className={mainStyles.container}>
      <Flex className={mainStyles.container} flexDirection="column" w="$fill">
        <Text.SubHeading weight="$bold">{t('browserView.transaction.send.drawer.transactionSummary')}</Text.SubHeading>
        <Box mt="$4">
          <Text.Body.Normal color="secondary" weight="$medium">
            {t('browserView.transaction.send.drawer.breakdownOfYourTransactionCost')}
          </Text.Body.Normal>
        </Box>
        <Box w="$fill" mt="$96">
          <RowContainer>
            {renderLabel({
              label: t('browserView.activity.entry.name.sending'),
              dataTestId: 'summary-total-spend'
            })}
            <Flex flexDirection="column" w="$fill" alignItems="flex-end">
              <Text.Body.Normal weight="$semibold" data-testid="output-summary-amount">
                {Number.parseFloat((amount / SATS_IN_BTC).toFixed(8))} BTC
              </Text.Body.Normal>
              <Text.Body.Normal color="secondary" weight="$semibold" data-testid="output-summary-amount-fiat">
                {Number.parseFloat(usdValue.toFixed(2))} USD
              </Text.Body.Normal>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt="$32">
          <RowContainer>
            {renderLabel({
              label: t('core.outputSummaryList.recipientAddress'),
              dataTestId: 'output-summary-recipient-title'
            })}
            <Flex flexDirection="column">
              <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
                <Text.Address className={styles.address} data-testid="output-summary-recipient-address">
                  {unsignedTransaction.toAddress}
                </Text.Address>
              </Flex>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt="$32">
          <RowContainer>
            {renderLabel({
              label: t('browserView.transaction.send.transactionFee'),
              dataTestId: 'summary-fee'
            })}
            <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$4">
              <Text.Body.Normal weight="$medium" data-testid="output-summary-fee">
                {Number.parseFloat((Number(feeInBtc) / SATS_IN_BTC).toFixed(8))} BTC
              </Text.Body.Normal>
              <Text.Body.Normal weight="$medium" data-testid="output-summary-fee-rate">
                {(feeRate * SATS_IN_BTC) / 1000} sats/vB
              </Text.Body.Normal>
            </Flex>
          </RowContainer>
        </Box>

        <Box w="$fill" mt="$40" mb="$8" className={styles.divider} />

        <Box w="$fill" mt="$32">
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
      <Flex w="$fill" py="$24" px="$40" flexDirection="column" gap="$16" className={mainStyles.buttons}>
        <Button color="primary" block size="medium" onClick={onConfirm} data-testid="continue-button">
          {t('browserView.transaction.send.footer.confirm')}
        </Button>
        <Button
          color="secondary"
          block
          size="medium"
          onClick={() => (config?.onClose ? config?.onClose() : clearContent())}
          data-testid="back-button"
        >
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
