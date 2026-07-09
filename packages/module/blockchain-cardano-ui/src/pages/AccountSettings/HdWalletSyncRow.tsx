import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { SettingsCard } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';

interface Props {
  accountId: AccountId;
}

export const HdWalletSyncRow = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const requestManualAddressDiscovery = useDispatchLaceAction(
    'cardanoContext.requestManualAddressDiscovery',
  );
  const { trackEvent } = useAnalytics();
  const isInProgress = useLaceSelector(
    'cardanoContext.selectIsAddressDiscoveryInProgress',
    accountId,
  );

  const handleSync = useCallback(() => {
    trackEvent('settings | wallet | hd wallet sync | sync | click');
    requestManualAddressDiscovery({ accountId });
  }, [requestManualAddressDiscovery, accountId, trackEvent]);

  const quickActions = useMemo(
    () => ({ onCardPress: isInProgress ? undefined : handleSync }),
    [handleSync, isInProgress],
  );

  return (
    <SettingsCard
      iconName="Reload"
      testID="settings-wallet-wallet-sync"
      title={t('v2.account-settings.hd-wallet-sync.title')}
      description={t('v2.account-settings.hd-wallet-sync.description')}
      quickActions={quickActions}
    />
  );
};
