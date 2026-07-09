import { Cardano } from '@cardano-sdk/core';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  SendResultTemplate,
  Sheet,
  StakeDelegationSheet,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { useNewDelegation } from './useNewDelegation';

import type { SheetScreenProps } from '@lace-lib/navigation';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const NewDelegationSheet = (
  props: SheetScreenProps<SheetRoutes.NewDelegation>,
) => {
  const { t } = useTranslation();
  const { navigation } = props;
  const { poolId, accountId } = props.route.params;
  const delegationProps = useNewDelegation(Cardano.PoolId(poolId), accountId);
  const delegationFlowState = useLaceSelector(
    'delegationFlow.selectDelegationFlowState',
  );
  const retryFeeCalculation = useDispatchLaceAction(
    'delegationFlow.retryRequested',
  );
  const resetDelegationFlow = useDispatchLaceAction('delegationFlow.reset');

  useEffect(() => {
    if (delegationFlowState.status === 'Success') {
      NavigationControls.navigate(SheetRoutes.DelegationSuccess);
    }
  }, [delegationFlowState.status]);

  const handleRetry = useCallback(() => {
    if (delegationFlowState.status !== 'Error') return;
    retryFeeCalculation({
      accountId: delegationFlowState.accountId,
      poolId: delegationFlowState.poolId,
    });
  }, [retryFeeCalculation, delegationFlowState]);

  const handleClose = useCallback(() => {
    resetDelegationFlow();
    NavigationControls.closeSheet();
  }, [resetDelegationFlow]);

  const errorDetails = useMemo(() => {
    if (delegationFlowState.status !== 'Error') return undefined;

    return {
      title: t('v2.staking.delegation.error.details-title'),
      description: delegationFlowState.errorMessage ?? '',
    };
  }, [delegationFlowState, t]);

  useEffect(() => {
    if (delegationFlowState.status === 'Error') {
      navigation.setOptions({
        header: (
          <Sheet.Header
            title={t('v2.staking.delegation.error.title')}
            testID="send-result-sheet-header"
          />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('v2.staking.delegation.error.close-button'),
              onPress: handleClose,
              testID: 'send-result-close-button',
            }}
            primaryButton={{
              label: t('v2.staking.delegation.error.primary-button'),
              onPress: handleRetry,
              testID: 'send-result-primary-button',
            }}
          />
        ),
      });
      return;
    }

    if (delegationProps) {
      navigation.setOptions({
        header: (
          <Sheet.Header
            title={delegationProps.headerTitle}
            leftIconOnPress={navigation.goBack}
          />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: delegationProps.cancelButtonLabel,
              onPress: delegationProps.onCancelPress,
            }}
            primaryButton={{
              label: delegationProps.delegateButtonLabel,
              onPress: delegationProps.onDelegatePress,
            }}
          />
        ),
      });
    }
  }, [
    navigation,
    t,
    delegationFlowState.status,
    handleClose,
    handleRetry,
    delegationProps,
  ]);

  if (delegationFlowState.status === 'Error') {
    return (
      <SendResultTemplate
        transactionState={{ status: 'failure', blockchain: 'Cardano' }}
        subtitle={t('v2.staking.delegation.error.subtitle')}
        icon={{ name: 'Sad', variant: 'solid', size: 64 }}
        errorDetails={errorDetails}
      />
    );
  }

  if (
    delegationFlowState.status === 'AwaitingConfirmation' ||
    delegationFlowState.status === 'Processing'
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!delegationProps) {
    return null;
  }

  return <StakeDelegationSheet {...delegationProps} />;
};
