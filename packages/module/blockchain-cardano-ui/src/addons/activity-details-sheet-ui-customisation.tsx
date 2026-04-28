import { Cardano } from '@cardano-sdk/core';
import {
  ActivityType,
  type ActivityDetail,
  type ActivityDetailsContentProps,
  type ActivityDetailsSheetUICustomisation,
} from '@lace-contract/activities';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { ActivityDetails as ActivityDetailsComponent } from '../components/ActivityDetails/ActivityDetails';
import { RewardDetails } from '../components/ActivityDetails/RewardDetails';
import { useLaceSelector } from '../hooks';

import type {
  CardanoTransaction,
  Reward,
} from '@lace-contract/cardano-context';

const CardanoActivityDetailsContent = ({
  activityDetail,
  activityId,
  explorerUrl,
  getMainTokenBalanceChange,
  tokensMetadataByTokenId,
}: ActivityDetailsContentProps) => {
  const addresses = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );
  const cardanoAddresses = addresses
    .filter(address => address.blockchainName === 'Cardano')
    .map(address => Cardano.PaymentAddress(address.address));

  const hasBlockchainData = activityDetail?.blockchainSpecific !== undefined;
  const hasRewardsData =
    hasBlockchainData && activityDetail?.type === ActivityType.Rewards;

  if (hasRewardsData) {
    return (
      <RewardDetails
        activityDetail={activityDetail as ActivityDetail<Reward>}
      />
    );
  }

  return (
    <ActivityDetailsComponent
      hash={activityId}
      activityDetail={activityDetail as ActivityDetail<CardanoTransaction>}
      explorerUrl={explorerUrl}
      ownAddresses={cardanoAddresses}
      getMainTokenBalanceChange={getMainTokenBalanceChange}
      tokensMetadataByTokenId={tokensMetadataByTokenId}
    />
  );
};

export const activityDetailsSheetUICustomisation = () =>
  createUICustomisation<ActivityDetailsSheetUICustomisation>({
    key: 'Cardano',
    uiCustomisationSelector: (params: { blockchainName: string }) =>
      params.blockchainName === 'Cardano',
    ActivityDetailsContent: CardanoActivityDetailsContent,
  });
