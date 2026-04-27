import { ActivityType } from '@lace-contract/activities';
import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  CustomTag,
  Icon,
  Link,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatDate, formatTime } from '@lace-lib/util-render';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { useLaceSelector } from '../../hooks';

import { ActivityDetailItem } from './ActivityDetailItem';
import { ActivityDetailsCertificate } from './ActivityDetailsCertificate';
import { ActivityDetailsInputOutput } from './ActivityDetailsInputOutput';
import { ActivityDetailsMetadata } from './ActivityDetailsMetadata';
import { ActivityDetailsProposalProcedure } from './ActivityDetailsProposalProcedure';
import { ActivityDetailsSummary } from './ActivityDetailsSummary';
import { ActivityDetailsVotingProcedure } from './ActivityDetailsVotingProcedure';

import type { Cardano } from '@cardano-sdk/core';
import type {
  ActivityDetail,
  GetActivityTokenBalanceChange,
} from '@lace-contract/activities';
import type { CardanoTransaction } from '@lace-contract/cardano-context';
import type { TFunction } from '@lace-contract/i18n';
import type { MetadataByTokenId } from '@lace-contract/tokens';
import type { ColorType, IconName } from '@lace-lib/ui-toolkit';

const EMPTY_METADATA: MetadataByTokenId = {};

interface TransactionDetailsProps<BlockchainSpecificMetadata = unknown> {
  hash?: string;
  activityDetail?: ActivityDetail<BlockchainSpecificMetadata>;
  explorerUrl?: string;
  ownAddresses: Cardano.PaymentAddress[];
  getMainTokenBalanceChange?: GetActivityTokenBalanceChange;
  tokensMetadataByTokenId?: MetadataByTokenId;
}

export const ActivityDetails = ({
  hash = '',
  activityDetail,
  explorerUrl = '',
  ownAddresses,
  getMainTokenBalanceChange,
  tokensMetadataByTokenId = EMPTY_METADATA,
}: TransactionDetailsProps<CardanoTransaction>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const networkType = useLaceSelector('network.selectNetworkType');

  const enrichedTokenBalanceChanges = useMemo(
    () =>
      (activityDetail?.tokenBalanceChanges ?? []).map(
        ({ tokenId, amount }) => ({
          tokenId,
          amount,
          token: tokensMetadataByTokenId[tokenId],
        }),
      ),
    [activityDetail?.tokenBalanceChanges, tokensMetadataByTokenId],
  );
  const mainTokenChange = useMemo(
    () =>
      getMainTokenBalanceChange?.(enrichedTokenBalanceChanges) ??
      enrichedTokenBalanceChanges[0],
    [getMainTokenBalanceChange, enrichedTokenBalanceChanges],
  );

  const nativeCoinSymbol = getAdaTokenTickerByNetwork(networkType);

  const successConfig = {
    icon: 'Tick' as IconName,
    color: 'positive' as ColorType,
    statusKey: t('activity.activity.status.success'),
  };

  const getActivityStatus = (type: ActivityType, t: TFunction) => {
    const activityMap: Record<
      ActivityType | 'default',
      { icon: IconName; color: ColorType; statusKey: string }
    > = {
      [ActivityType.Pending]: {
        icon: 'AlarmClock',
        color: 'neutral',
        statusKey: t('activity.activity.status.pending'),
      },
      [ActivityType.Send]: successConfig,
      [ActivityType.Delegation]: successConfig,
      [ActivityType.Registration]: successConfig,
      [ActivityType.Deregistration]: successConfig,
      [ActivityType.Withdrawal]: successConfig,
      [ActivityType.Self]: successConfig,
      [ActivityType.Receive]: successConfig,
      [ActivityType.Rewards]: {
        icon: 'Gift',
        color: 'positive',
        statusKey: t('activity.activity.status.spendable'),
      },
      [ActivityType.Failed]: {
        icon: 'AlertTriangle',
        color: 'negative',
        statusKey: t('activity.activity.status.failed'),
      },
      default: {
        icon: 'InformationCircle',
        color: 'neutral',
        statusKey: t('activity.activity.status.unknown'),
      },
    };

    return activityMap[type] ?? activityMap['default'];
  };

  const renderActivityStatus = useCallback(
    (type: ActivityType) => {
      const { icon, color, statusKey } = getActivityStatus(type, t);
      const accentColor =
        type === ActivityType.Pending
          ? theme.brand.yellow
          : color === 'positive'
          ? theme.data.positive
          : color === 'negative'
          ? theme.data.negative
          : undefined;

      return (
        <CustomTag
          testID="activity-details-status-value"
          size="M"
          color={color}
          backgroundType={accentColor ? 'semiTransparent' : 'colored'}
          labelColor={accentColor}
          icon={<Icon name={icon} size={16} color={accentColor} />}
          label={statusKey}
        />
      );
    },
    [t, theme],
  );

  return (
    <View style={styles.container}>
      <ActivityDetailItem
        testID="activity-details-status-label"
        label={t('v2.activity-details.sheet.status')}
        value={
          activityDetail ? renderActivityStatus(activityDetail.type) : null
        }
      />
      {activityDetail?.type !== ActivityType.Rewards && (
        <ActivityDetailItem
          label={t('v2.activity-details.sheet.transactionId')}
          value={
            <View style={styles.linkWrapper}>
              <Link
                textStyle={{
                  textAlign: 'right',
                }}
                label={hash}
                onPress={() => {
                  void Linking.openURL(explorerUrl);
                }}
              />
            </View>
          }
        />
      )}
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.amount')}
        value={
          <Row alignItems="center" gap={spacing.S}>
            <Text.L>{convertLovelacesToAda(mainTokenChange?.amount)}</Text.L>
            <Text.S variant="secondary">
              {mainTokenChange?.token?.ticker ?? t('activity.unknown.ticker')}
            </Text.S>
          </Row>
        }
      />
      {activityDetail?.blockchainSpecific?.txSummary && (
        <ActivityDetailsSummary
          txSummary={activityDetail?.blockchainSpecific?.txSummary}
          ownAddresses={ownAddresses}
        />
      )}
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.timestamp')}
        value={
          <Column alignItems="flex-end">
            <Text.M>
              {formatDate({
                date: activityDetail?.timestamp || '',
                type: 'local',
              })}
            </Text.M>
            <Text.M variant="secondary">
              {formatTime({
                date: activityDetail?.timestamp || '',
                type: 'local',
              })}
            </Text.M>
          </Column>
        }
      />
      {!!activityDetail?.blockchainSpecific?.deposit && (
        <ActivityDetailItem
          testID="activity-details-deposit"
          label={t('v2.activity-details.sheet.deposit')}
          value={`${convertLovelacesToAda(
            activityDetail?.blockchainSpecific?.deposit,
          )} ${nativeCoinSymbol}`}
        />
      )}
      {!!activityDetail?.blockchainSpecific?.returnedDeposit && (
        <ActivityDetailItem
          testID="activity-details-deposit-reclaim"
          label={t('v2.activity-details.sheet.depositReclaim')}
          value={`${convertLovelacesToAda(
            activityDetail?.blockchainSpecific?.returnedDeposit,
          )} ${nativeCoinSymbol}`}
        />
      )}
      {!!activityDetail?.blockchainSpecific?.collateral && (
        <ActivityDetailItem
          label={t('v2.activity-details.sheet.collateral')}
          value={`${convertLovelacesToAda(
            activityDetail?.blockchainSpecific?.collateral,
          )} ${nativeCoinSymbol}`}
        />
      )}
      <ActivityDetailItem
        label={t('v2.activity-details.sheet.fee')}
        value={
          <Column alignItems="flex-end">
            <Text.M>{`${convertLovelacesToAda(
              activityDetail?.fee,
            )} ${nativeCoinSymbol}`}</Text.M>
            {/* TODO: complete with the estimated fee value */}
            <Text.M variant="secondary"></Text.M>
          </Column>
        }
      />

      {!!activityDetail?.blockchainSpecific?.votingProcedures && (
        <ActivityDetailsVotingProcedure
          votingProcedures={
            activityDetail?.blockchainSpecific?.votingProcedures
          }
        />
      )}

      {!!activityDetail?.blockchainSpecific?.proposalProcedures && (
        <ActivityDetailsProposalProcedure
          proposalProcedures={
            activityDetail?.blockchainSpecific?.proposalProcedures
          }
          networkType={networkType}
        />
      )}

      {!!activityDetail?.blockchainSpecific?.certificates && (
        <ActivityDetailsCertificate
          certificates={activityDetail?.blockchainSpecific?.certificates}
          coinSymbol={nativeCoinSymbol}
        />
      )}

      {activityDetail?.blockchainSpecific?.addrInputs && (
        <ActivityDetailsInputOutput
          inputOutput={activityDetail?.blockchainSpecific?.addrInputs}
          label={t('v2.activity-details.sheet.inputs')}
          coinSymbol={nativeCoinSymbol}
          ownAddresses={ownAddresses}
        />
      )}

      {activityDetail?.blockchainSpecific?.addrOutputs && (
        <ActivityDetailsInputOutput
          inputOutput={activityDetail?.blockchainSpecific?.addrOutputs}
          label={t('v2.activity-details.sheet.outputs')}
          coinSymbol={nativeCoinSymbol}
          ownAddresses={ownAddresses}
        />
      )}
      {activityDetail?.blockchainSpecific?.metadata && (
        <ActivityDetailsMetadata
          metadata={activityDetail?.blockchainSpecific?.metadata}
        />
      )}
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
  linkWrapper: {
    flex: 1,
  },
});
