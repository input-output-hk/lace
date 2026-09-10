import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  DRepDelegationSheet,
  SendResultTemplate,
  Sheet,
  Shimmer,
  spacing,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { useNewDRepDelegation } from './useNewDRepDelegation';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const NewDRepDelegationSheet = (
  props: SheetScreenProps<SheetRoutes.NewDRepDelegation>,
) => {
  const { accountId, dRep } = props.route.params;
  const { navigation } = props;
  const { t } = useTranslation();
  const sheetProps = useNewDRepDelegation(dRep, accountId);

  const flowState = useLaceSelector(
    'voteDelegationFlow.selectVoteDelegationFlowState',
  );
  const retryRequested = useDispatchLaceAction(
    'voteDelegationFlow.retryRequested',
  );
  const resetFlow = useDispatchLaceAction('voteDelegationFlow.reset');

  const handleRetry = useCallback(() => {
    if (flowState?.status !== 'Error') return;
    retryRequested({
      accountId: flowState.accountId,
      dRep: flowState.dRep,
    });
  }, [retryRequested, flowState]);

  const handleClose = useCallback(() => {
    resetFlow();
    NavigationControls.closeSheet();
  }, [resetFlow]);

  const errorDetails = useMemo(
    () =>
      flowState?.status === 'Error' && flowState.errorMessage
        ? {
            title: t('v2.governance.delegation-error.details-title'),
            description: flowState.errorMessage,
          }
        : undefined,
    [flowState, t],
  );

  // Header and footer go through navigation options (not inline siblings of
  // Sheet.Scroll) so the sheet bounds the scrollable's height — rendered inline
  // they sit outside the sheet and the buttons clip off the bottom of the
  // screen. Mirrors DRepDetailsSheet and the staking NewDelegationSheet.
  useEffect(() => {
    if (flowState?.status === 'Error') {
      navigation.setOptions({
        header: (
          <Sheet.Header title={t(flowState.errorTranslationKeys.title)} />
        ),
        footer: (
          <Sheet.Footer
            secondaryButton={{
              label: t('v2.governance.delegation-error.close-button'),
              onPress: handleClose,
              testID: 'send-result-close-button',
            }}
            primaryButton={{
              label: t('v2.governance.delegation-error.primary-button'),
              onPress: handleRetry,
              testID: 'send-result-primary-button',
            }}
          />
        ),
      });
      return;
    }

    navigation.setOptions({
      header: (
        <Sheet.Header
          title={
            sheetProps?.headerTitle ??
            t('v2.governance.delegation-confirmation.title')
          }
        />
      ),
      footer: sheetProps ? (
        <Sheet.Footer
          secondaryButton={{
            label: sheetProps.cancelButtonLabel,
            onPress: sheetProps.onCancelPress,
            testID: 'drep-delegation-sheet-cancel-button',
          }}
          primaryButton={{
            label: sheetProps.delegateButtonLabel,
            onPress: sheetProps.onDelegatePress,
            disabled: sheetProps.delegateButtonDisabled,
            loading: sheetProps.delegateButtonLoading,
            testID: 'drep-delegation-sheet-delegate-button',
          }}
        />
      ) : undefined,
    });
  }, [navigation, t, flowState, sheetProps, handleClose, handleRetry]);

  if (flowState?.status === 'Error') {
    return (
      <SendResultTemplate
        transactionState={{ status: 'failure', blockchain: 'Cardano' }}
        subtitle={t(flowState.errorTranslationKeys.subtitle)}
        icon={{ name: 'Sad', variant: 'solid', size: 64 }}
        errorDetails={errorDetails}
      />
    );
  }

  if (!sheetProps) {
    return (
      <Sheet.Scroll contentContainerStyle={styles.loadingContent}>
        <Shimmer.M />
        <Shimmer.M />
        <Shimmer.M />
      </Sheet.Scroll>
    );
  }

  return <DRepDelegationSheet {...sheetProps} />;
};

const styles = StyleSheet.create({
  loadingContent: {
    padding: spacing.L,
    gap: spacing.M,
  },
});
