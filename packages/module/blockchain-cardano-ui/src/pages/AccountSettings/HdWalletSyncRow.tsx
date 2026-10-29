import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { Modal, SettingsCard } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';

interface Props {
  accountId: AccountId;
}

export const HdWalletSyncRow = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const requestWalletSyncReset = useDispatchLaceAction(
    'cardanoContext.requestWalletSyncReset',
  );
  const { trackEvent } = useAnalytics();
  const [isConfirming, setIsConfirming] = useState(false);
  const blockedReason = useLaceSelector(
    'cardanoContext.selectWalletSyncResetBlockedReason',
    accountId,
  );
  const openConfirmation = useCallback(() => {
    setIsConfirming(true);
  }, []);
  const closeConfirmation = useCallback(() => {
    setIsConfirming(false);
  }, []);
  const handleSync = useCallback(() => {
    setIsConfirming(false);
    trackEvent('settings | wallet | hd wallet sync | sync | click');
    requestWalletSyncReset({ accountId });
  }, [requestWalletSyncReset, accountId, trackEvent]);

  const quickActions = useMemo(
    () => ({
      onCardPress: blockedReason ? undefined : openConfirmation,
    }),
    [openConfirmation, blockedReason],
  );

  return (
    <>
      <SettingsCard
        iconName="Reload"
        testID="settings-wallet-wallet-sync"
        title={t('v2.account-settings.hd-wallet-sync.title')}
        description={t(
          blockedReason === 'pending-transactions'
            ? 'v2.account-settings.hd-wallet-sync.pending'
            : 'v2.account-settings.hd-wallet-sync.description',
        )}
        quickActions={quickActions}
      />
      <Modal
        testIdPrefix="reset-wallet-sync-confirmation"
        visible={isConfirming}
        onClose={closeConfirmation}
        onCancel={closeConfirmation}
        onConfirm={handleSync}
        title={t('v2.account-settings.hd-wallet-sync.title')}
        description={t('v2.account-settings.hd-wallet-sync.confirmation')}
        cancelText={t('app.cancel')}
        confirmText={t('v2.account-settings.hd-wallet-sync.reset')}
      />
    </>
  );
};
