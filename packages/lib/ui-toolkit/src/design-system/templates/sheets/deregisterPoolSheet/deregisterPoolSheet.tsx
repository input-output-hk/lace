import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Avatar, Column, Divider, Row, Text } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

export type DeregisterPoolSheetProps = {
  poolName: string;
  poolTicker: string;
  stakeKey: string;
  amountDelegated: string;
  coin: string;
  sourceAccountName: string;
  sourceAccountImage?: { uri: string };
  depositReturn: string;
  transactionFee: string;
  total: string;
  onCancel: () => void;
  onDeregister: () => void;
  isDeregisterButtonDisabled?: boolean;
};

export const DeregisterPoolSheet = ({
  poolName,
  poolTicker,
  stakeKey,
  amountDelegated,
  coin,
  sourceAccountName,
  sourceAccountImage,
  depositReturn,
  transactionFee,
  total,
  onCancel,
  onDeregister,
  isDeregisterButtonDisabled,
}: DeregisterPoolSheetProps) => {
  const { t } = useTranslation();
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader title={t('v2.deregister-pool.review-transaction')} />
      <Sheet.Scroll
        contentContainerStyle={scrollContainerStyle}
        testID="deregister-pool-sheet">
        <Column gap={spacing.M} style={staticStyles.container}>
          {/* Pool Info Section */}
          <Row
            style={staticStyles.poolSection}
            gap={spacing.M}
            alignItems="center"
            testID="deregister-pool-info">
            <Avatar
              size={48}
              content={{ fallback: poolTicker.substring(0, 2) }}
              shape="rounded"
            />
            <Column style={staticStyles.poolInfo}>
              <Text.M variant="primary">{poolName}</Text.M>
              <Text.S variant="secondary">{poolTicker}</Text.S>
            </Column>
          </Row>

          <Divider />

          {/* Stake Key */}
          <Row
            style={staticStyles.rowSection}
            testID="deregister-pool-stake-key">
            <Text.S variant="secondary">
              {t('v2.deregister-pool.stake-key')}
            </Text.S>
            <Text.M variant="primary" style={staticStyles.valueText}>
              {stakeKey}
            </Text.M>
          </Row>

          <Divider />

          {/* Amount Delegated */}
          <Row style={staticStyles.rowSection}>
            <Text.S variant="secondary">
              {t('v2.deregister-pool.amount-delegated')}
            </Text.S>
            <Text.M variant="primary">
              {amountDelegated} {coin}
            </Text.M>
          </Row>

          <Divider />

          {/* Source Account */}
          <Row style={staticStyles.rowSection}>
            <Text.S variant="secondary">
              {t('v2.deregister-pool.source-account')}
            </Text.S>
            <Row style={staticStyles.accountInfo} gap={spacing.XS}>
              {sourceAccountImage ? (
                <Avatar
                  size={24}
                  content={{
                    img: sourceAccountImage,
                    fallback: sourceAccountName.substring(0, 2),
                  }}
                  shape="rounded"
                />
              ) : null}
              <Text.M variant="primary">{sourceAccountName}</Text.M>
            </Row>
          </Row>

          <Divider />

          {/* Total Breakdown */}
          <Column style={staticStyles.breakdownSection}>
            <Text.M variant="primary">
              {t('v2.deregister-pool.total-breakdown')}
            </Text.M>

            {/* Stake key Deposit return */}
            <Row
              style={staticStyles.breakdownRow}
              testID="deregister-pool-deposit-return">
              <Text.S variant="secondary">
                {t('v2.deregister-pool.deposit-return')}
              </Text.S>
              <Text.M variant="primary">
                {depositReturn} {coin}
              </Text.M>
            </Row>

            {/* Transaction Fee */}
            <Row
              style={staticStyles.breakdownRow}
              testID="deregister-pool-transaction-fee">
              <Text.S variant="secondary">
                {t('v2.deregister-pool.transaction-fee')}
              </Text.S>
              <Text.M variant="primary">
                {transactionFee} {coin}
              </Text.M>
            </Row>

            <Divider />

            {/* Total */}
            <Row style={staticStyles.breakdownRow}>
              <Text.S variant="primary">{t('v2.deregister-pool.total')}</Text.S>
              <Text.M variant="primary">
                {total} {coin}
              </Text.M>
            </Row>
          </Column>
        </Column>
      </Sheet.Scroll>

      <SheetFooter
        secondaryButton={{
          label: t('v2.deregister-pool.cancel'),
          onPress: onCancel,
          testID: 'deregister-pool-cancel-button',
        }}
        primaryButton={{
          label: t('v2.deregister-pool.deregister'),
          onPress: onDeregister,
          testID: 'deregister-pool-deregister-button',
          disabled: isDeregisterButtonDisabled,
        }}
        primaryVariant="critical"
      />
    </>
  );
};

const staticStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.M,
    paddingTop: spacing.XXL,
    paddingBottom: spacing.M,
    flex: 1,
  },
  poolSection: {
    width: '100%',
  },
  poolInfo: {
    flex: 1,
  },
  rowSection: {
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  valueText: {
    textAlign: 'right',
    flex: 1,
  },
  accountInfo: {
    alignItems: 'center',
  },
  breakdownSection: {
    width: '100%',
    gap: spacing.M,
  },
  breakdownRow: {
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});
