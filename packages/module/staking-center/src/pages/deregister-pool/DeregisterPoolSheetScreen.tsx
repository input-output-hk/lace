import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  DeregisterPoolSheet,
  SendResultTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { useDeregistration } from './useDeregistration';

import type { SheetScreenProps } from '@lace-lib/navigation';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const DeregisterPoolSheetScreen = (
  props: SheetScreenProps<SheetRoutes.DeregisterPool>,
) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { accountId } = props.route.params;
  const deregistrationProps = useDeregistration(accountId);
  const deregistrationFlowState = useLaceSelector(
    'deregistrationFlow.selectDeregistrationFlowState',
  );
  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const retryFeeCalculation = useDispatchLaceAction(
    'deregistrationFlow.retryRequested',
  );
  const resetDeregistrationFlow = useDispatchLaceAction(
    'deregistrationFlow.reset',
  );

  useEffect(() => {
    // Only navigate to success if the state is for this account
    const stateAccountId =
      'accountId' in deregistrationFlowState
        ? deregistrationFlowState.accountId?.toString()
        : undefined;

    if (
      deregistrationFlowState.status === 'Success' &&
      stateAccountId === accountId
    ) {
      const rewardAccountInfo =
        rewardAccountDetailsMap[AccountId(accountId)]?.rewardAccountInfo;
      trackEvent('staking | deregistration | confirmed', {
        ...(rewardAccountInfo?.poolId && { poolId: rewardAccountInfo.poolId }),
        ...(rewardAccountInfo?.rewardsSum && {
          totalRewardsLovelace: rewardAccountInfo.rewardsSum.toString(),
        }),
      });
      NavigationControls.navigate(SheetRoutes.DeregistrationSuccess);
    }
  }, [deregistrationFlowState, accountId, trackEvent, rewardAccountDetailsMap]);

  const handleRetry = useCallback(() => {
    if (deregistrationFlowState.status !== 'Error') return;
    retryFeeCalculation({
      accountId: AccountId(accountId), // Use sheet's accountId, not state's
    });
  }, [retryFeeCalculation, deregistrationFlowState.status, accountId]);

  const handleClose = useCallback(() => {
    resetDeregistrationFlow();
    NavigationControls.closeSheet();
  }, [resetDeregistrationFlow]);

  const errorDetails = useMemo(() => {
    if (deregistrationFlowState.status !== 'Error') return undefined;

    return {
      title: t('v2.staking.deregistration.error.details-title'),
      description: deregistrationFlowState.errorMessage ?? '',
    };
  }, [deregistrationFlowState, t]);

  useEffect(() => {
    if (deregistrationFlowState.status === 'Error') {
      props.navigation.setOptions({
        header: (
          <Sheet.Header title={t('v2.staking.deregistration.error.title')} />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('v2.staking.deregistration.error.close-button'),
              onPress: handleClose,
              testID: 'send-result-close-button',
            }}
            primaryButton={{
              label: t('v2.staking.deregistration.error.primary-button'),
              onPress: handleRetry,
              testID: 'send-result-primary-button',
            }}
          />
        ),
      });
      return;
    }

    if (deregistrationProps) {
      props.navigation.setOptions({
        header: (
          <Sheet.Header title={t('v2.deregister-pool.review-transaction')} />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('v2.deregister-pool.cancel'),
              onPress: deregistrationProps.onCancel,
              testID: 'deregister-pool-cancel-button',
            }}
            primaryButton={{
              label: t('v2.deregister-pool.deregister'),
              onPress: deregistrationProps.onDeregister,
              testID: 'deregister-pool-deregister-button',
              disabled: deregistrationProps.isDeregisterButtonDisabled,
            }}
            primaryVariant="critical"
          />
        ),
      });
    }
  }, [
    props.navigation,
    t,
    deregistrationFlowState.status,
    handleClose,
    handleRetry,
    deregistrationProps,
  ]);

  if (deregistrationFlowState.status === 'Error') {
    return (
      <SendResultTemplate
        transactionState={{ status: 'failure', blockchain: 'Cardano' }}
        subtitle={t('v2.staking.deregistration.error.subtitle')}
        icon={{ name: 'Sad', variant: 'solid', size: 64 }}
        errorDetails={errorDetails}
      />
    );
  }

  if (
    deregistrationFlowState.status === 'AwaitingConfirmation' ||
    deregistrationFlowState.status === 'Processing'
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!deregistrationProps) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <DeregisterPoolSheet {...deregistrationProps} />;
};
