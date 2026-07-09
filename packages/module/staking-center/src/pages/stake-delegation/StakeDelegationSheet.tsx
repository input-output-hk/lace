import { Cardano } from '@cardano-sdk/core';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { RegularPoolSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useLaceSelector } from '../../hooks';
import { useStakePoolDetails } from '../stake-pool-details/useStakePoolDetails';

import { useRewardAccount, useStakeDelegation } from './useStakeDelegation';

import type { CardanoRewardAccount } from '@lace-contract/cardano-context';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const StakeDelegationSheetContent = ({
  accountId,
  poolId,
  rewardAccount,
  navigation,
}: {
  accountId: AccountId;
  poolId: Cardano.PoolId;
  rewardAccount: CardanoRewardAccount;
  navigation: SheetScreenProps<SheetRoutes.StakeDelegation>['navigation'];
}) => {
  const { t } = useTranslation();
  const stakePoolDetailsProps = useStakePoolDetails({ poolId, accountId });

  const regularPoolSheetProps = useStakeDelegation({
    accountId,
    rewardAccount,
    stakePoolDetailsProps,
    poolId,
  });

  const {
    primaryButtonLabel,
    secondaryButtonLabel,
    onPrimaryPress,
    onSecondaryPress,
    isSecondaryButtonDisabled,
  } = regularPoolSheetProps ?? {};
  const hasFooter = Boolean(
    (primaryButtonLabel && onPrimaryPress) ||
      (secondaryButtonLabel && onSecondaryPress),
  );

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          testID="regular-pool-sheet-header"
          title={t('v2.regular-pool.title')}
        />
      ),
      footer: hasFooter ? (
        <Sheet.Footer
          testID="regular-pool-sheet-footer"
          showDivider
          secondaryButton={
            secondaryButtonLabel && onSecondaryPress
              ? {
                  label: secondaryButtonLabel,
                  onPress: onSecondaryPress,
                  disabled: isSecondaryButtonDisabled,
                }
              : undefined
          }
          primaryButton={
            primaryButtonLabel && onPrimaryPress
              ? {
                  label: primaryButtonLabel,
                  onPress: onPrimaryPress,
                }
              : undefined
          }
        />
      ) : undefined,
    });
  }, [
    navigation,
    t,
    hasFooter,
    primaryButtonLabel,
    secondaryButtonLabel,
    onPrimaryPress,
    onSecondaryPress,
    isSecondaryButtonDisabled,
  ]);

  if (!regularPoolSheetProps) return null;

  return <RegularPoolSheetTemplate {...regularPoolSheetProps} />;
};

export const StakeDelegationSheet = (
  props: SheetScreenProps<SheetRoutes.StakeDelegation>,
) => {
  const { accountId } = props.route.params;

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );

  const rewardAccount = useRewardAccount(AccountId(accountId));

  const rewardAccountDetails = rewardAccountDetailsMap[AccountId(accountId)];

  const poolId = rewardAccountDetails?.rewardAccountInfo.poolId;

  if (!poolId || !rewardAccount) {
    return null;
  }

  return (
    <StakeDelegationSheetContent
      accountId={AccountId(accountId)}
      poolId={Cardano.PoolId(poolId)}
      rewardAccount={rewardAccount}
      navigation={props.navigation}
    />
  );
};
