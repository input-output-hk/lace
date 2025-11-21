import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncStatus } from '@src/stores';
import { WalletStatus, Status } from './WalletStatus';
import type { TranslationKey } from '@lace/translation';

const DEFAULT_WALLET_STATUS: { status: Status; text: TranslationKey } = {
  status: Status.SYNCING,
  text: 'browserView.topNavigationBar.walletStatus.walletSyncing'
};

export const WalletStatusContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const [syncStatus, setSyncStatus] = useState(DEFAULT_WALLET_STATUS);
  const status$ = useSyncStatus();

  useEffect(() => {
    const subscription = status$?.subscribe((res: typeof DEFAULT_WALLET_STATUS) => {
      setSyncStatus(res);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [status$]);

  return <WalletStatus status={syncStatus.status} text={t(syncStatus.text)} />;
};
