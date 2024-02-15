import React from 'react';
import { Button } from '@lace/common';
import { ResultMessage } from '@components/ResultMessage';
import styles from './ResetDataError.module.scss';
import { AppMode } from '@src/utils/constants';
import { WalletSetupLayout } from '@src/views/browser-view/components';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext, useTheme } from '@providers';

export interface ResetDataErrorProps {
  appMode: AppMode;
  title: React.ReactNode;
  description: React.ReactNode;
  buttonLabel: string;
}

export const ResetDataError = ({
  appMode,
  title,
  description,
  buttonLabel
}: ResetDataErrorProps): React.ReactElement => {
  const { deleteWallet } = useWalletManager();
  const { walletManager, setDeletingWallet } = useWalletStore();
  const { theme } = useTheme();
  const backgroundService = useBackgroundServiceAPIContext();

  const Layout = appMode === 'browser' ? WalletSetupLayout : React.Fragment;

  const resetData = async () => {
    if (walletManager) {
      setDeletingWallet(true);
      await deleteWallet();
    }
    window.localStorage.clear();
    window.localStorage.setItem('mode', theme.name);
    await backgroundService.resetStorage();
    // Reload app states with updated storage
    window.location.reload();
  };

  return (
    <Layout>
      <div className={styles.resetDataErrorContainer} data-testid="reset-data-error">
        <ResultMessage status="error" title={title} description={description} />
        <div className={styles.resetDataErrorButton}>
          <Button onClick={resetData} className={styles.btn} size="large">
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Layout>
  );
};
