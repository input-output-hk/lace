import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { isWeb, RegularPoolSheet } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useLaceSelector } from '../../hooks';
import { useStakePoolDetails } from '../stake-pool-details/useStakePoolDetails';

import { useRewardAccount, useStakeDelegation } from './useStakeDelegation';

import type { CardanoRewardAccount } from '@lace-contract/cardano-context';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// RegularPoolSheet's FlatList sits inside a `flex: 1` wrapper, which collapses
// to 0 height when its parent is unbounded. The shared sheet navigator no
// longer wraps screens in a flex-filling view on native (removed in 006b129a8
// to let @gorhom/bottom-sheet dynamic-size around natural content). Give the
// native path an explicit bounded height so the list has room to render.
// Mirrors the BrowsePoolSheet fix (a95ae524f).
const SHEET_HEIGHT_RATIO = 0.9;

const StakeDelegationSheetContent = ({
  accountId,
  poolId,
  rewardAccount,
}: {
  accountId: AccountId;
  poolId: Cardano.PoolId;
  rewardAccount: CardanoRewardAccount;
}) => {
  const stakePoolDetailsProps = useStakePoolDetails({ poolId, accountId });

  const regularPoolSheetProps = useStakeDelegation({
    accountId,
    rewardAccount,
    stakePoolDetailsProps,
    poolId,
  });

  if (!regularPoolSheetProps) return null;

  return <RegularPoolSheet {...regularPoolSheetProps} />;
};

export const StakeDelegationSheet = (
  props: SheetScreenProps<SheetRoutes.StakeDelegation>,
) => {
  const { accountId } = props.route.params;

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );

  const rewardAccount = useRewardAccount(AccountId(accountId));
  const { height: windowHeight } = useWindowDimensions();
  const containerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  const rewardAccountDetails = rewardAccountDetailsMap[AccountId(accountId)];

  const poolId = rewardAccountDetails?.rewardAccountInfo.poolId;

  if (!poolId || !rewardAccount) {
    return null;
  }

  const content = (
    <StakeDelegationSheetContent
      accountId={AccountId(accountId)}
      poolId={Cardano.PoolId(poolId)}
      rewardAccount={rewardAccount}
    />
  );

  if (isWeb) {
    return content;
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
