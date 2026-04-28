import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Row,
  shouldTruncateText,
  spacing,
  Text,
  truncateText,
} from '@lace-lib/ui-toolkit';
import { formatDate, formatTime } from '@lace-lib/util-render';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLaceSelector, useStakePool } from '../../hooks';
import { getActivityTypeLabel } from '../../utils/formatting';

import { ActivityDetailItem } from './ActivityDetailItem';

import type { ActivityDetail } from '@lace-contract/activities';
import type { Reward } from '@lace-contract/cardano-context';

interface TransactionDetailsProps<BlockchainSpecificMetadata = unknown> {
  activityDetail?: ActivityDetail<BlockchainSpecificMetadata>;
}

const truncateName = (name: string, maxLength = 50): string =>
  name.length > maxLength ? truncateText(name, maxLength) : name;

const poolDescriptionStyles = StyleSheet.create({
  valueContainer: {
    flex: 1,
    minWidth: 0,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  poolTextRow: {
    minWidth: 0,
  },
  poolTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  poolText: {
    textAlign: 'right',
  },
});

export const RewardDetails = ({
  activityDetail,
}: TransactionDetailsProps<Reward>) => {
  const { t } = useTranslation();
  const networkType = useLaceSelector('network.selectNetworkType');
  const poolId = activityDetail?.blockchainSpecific?.poolId;
  const pool = useStakePool(poolId);

  const poolDescription = useMemo(() => {
    if (!poolId) return undefined;
    if (!pool) return poolId;

    const { poolName: name, ticker } = pool;

    return (
      <View style={poolDescriptionStyles.valueContainer}>
        <Column style={poolDescriptionStyles.column}>
          {name ? (
            <Row
              justifyContent="flex-end"
              style={poolDescriptionStyles.poolTextRow}>
              <View style={poolDescriptionStyles.poolTextWrapper}>
                <Text.M
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={poolDescriptionStyles.poolText}>
                  {truncateName(name)}
                </Text.M>
              </View>
            </Row>
          ) : null}
          {ticker ? (
            <Row
              justifyContent="flex-end"
              style={poolDescriptionStyles.poolTextRow}>
              <View style={poolDescriptionStyles.poolTextWrapper}>
                <Text.M
                  variant="secondary"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={poolDescriptionStyles.poolText}>
                  ({ticker})
                </Text.M>
              </View>
            </Row>
          ) : null}
          <Row
            justifyContent="flex-end"
            style={poolDescriptionStyles.poolTextRow}>
            <View style={poolDescriptionStyles.poolTextWrapper}>
              <Text.M
                variant="secondary"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={poolDescriptionStyles.poolText}>
                {shouldTruncateText(poolId)}
              </Text.M>
            </View>
          </Row>
        </Column>
      </View>
    );
  }, [poolId, pool]);

  return (
    <View style={styles.container}>
      <ActivityDetailItem
        testID="activity-details-transactionType"
        label={t('v2.activity-details.sheet.transactionType')}
        value={getActivityTypeLabel(t, activityDetail?.type)}
      />
      <ActivityDetailItem
        testID="activity-details-rewards"
        label={t('v2.activity-details.sheet.rewards')}
        value={`${convertLovelacesToAda(
          activityDetail?.tokenBalanceChanges?.[0]?.amount,
        )} ${getAdaTokenTickerByNetwork(networkType)}`}
      />
      {poolDescription !== undefined && (
        <ActivityDetailItem
          testID="activity-details-pool-label"
          label={t('v2.activity-details.sheet.pool-label')}
          value={poolDescription}
        />
      )}
      {activityDetail?.blockchainSpecific?.epoch && (
        <ActivityDetailItem
          testID="activity-details-epoch"
          label={t('v2.activity-details.sheet.epoch')}
          value={activityDetail?.blockchainSpecific?.epoch}
        />
      )}
      <ActivityDetailItem
        testID="activity-details-timestamp"
        label={t('v2.activity-details.sheet.timestamp')}
        value={
          <Column
            testID="activity-details-timestamp-value"
            alignItems="flex-end">
            <Text.M>
              {formatDate({
                date: activityDetail?.timestamp || '',
                type: 'local',
              })}
            </Text.M>
            <Text.M>
              {formatTime({
                date: activityDetail?.timestamp || '',
                type: 'local',
              })}
            </Text.M>
          </Column>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.M,
    width: '100%',
    gap: spacing.M,
    flex: 1,
  },
});
