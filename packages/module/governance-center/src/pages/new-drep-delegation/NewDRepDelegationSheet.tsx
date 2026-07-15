import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  DRepDelegationSheet,
  SendResultTemplate,
  Sheet,
  Shimmer,
  spacing,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import { useNewDRepDelegation } from './useNewDRepDelegation';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const NewDRepDelegationSheet = (
  props: SheetScreenProps<SheetRoutes.NewDRepDelegation>,
) => {
  const { accountId, dRep } = props.route.params;
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

  if (flowState?.status === 'Error') {
    return (
      <>
        <Sheet.Header title={t(flowState.errorTranslationKeys.title)} />
        <SendResultTemplate
          transactionState={{ status: 'failure', blockchain: 'Cardano' }}
          subtitle={t(flowState.errorTranslationKeys.subtitle)}
          icon={{ name: 'Sad', variant: 'solid', size: 64 }}
          errorDetails={errorDetails}
        />
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
      </>
    );
  }

  if (!sheetProps) {
    return (
      <>
        <Sheet.Header
          title={t('v2.governance.delegation-confirmation.title')}
        />
        <Sheet.Scroll contentContainerStyle={styles.loadingContent}>
          <Shimmer.M />
          <Shimmer.M />
          <Shimmer.M />
        </Sheet.Scroll>
      </>
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
