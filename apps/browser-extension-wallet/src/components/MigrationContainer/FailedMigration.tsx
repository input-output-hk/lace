import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { ResultMessage } from '@components/ResultMessage';
import styles from './FailedMigration.module.scss';
import { AppMode } from '@src/utils/constants';
import { WalletSetupLayout } from '@src/views/browser-view/components';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext, useTheme } from '@providers';

export interface FailedMigrationProps {
  appMode: AppMode;
}

export const FailedMigration = ({ appMode }: FailedMigrationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { deleteWallet } = useWalletManager();
  const { walletManagerUi } = useWalletStore();
  const { theme } = useTheme();
  const backgroundService = useBackgroundServiceAPIContext();

  const Layout = appMode === 'browser' ? WalletSetupLayout : React.Fragment;

  const resetData = async () => {
    if (walletManagerUi) await deleteWallet();
    window.localStorage.clear();
    window.localStorage.setItem('mode', theme.name);
    await backgroundService.resetStorage();
    // Reload app states with updated storage
    window.location.reload();
  };

  return (
    <Layout>
      <div className={styles.failedMigrationContainer} data-testid="failed-migration">
        <ResultMessage
          status="error"
          title={
            <>
              <div>{t('migrations.failed.title')}</div>
              <div>{t('migrations.failed.subtitle')}</div>
            </>
          }
          description={
            <>
              <div>{t('migrations.failed.errorDescription')}</div>
              <div>
                <b>{t('migrations.failed.actionDescription')}</b>
              </div>
            </>
          }
        />
        <div className={styles.failedMigrationButton}>
          <Button onClick={resetData} className={styles.btn} size="large">
            {t('migrations.failed.btn.confirm')}
          </Button>
        </div>
      </div>
    </Layout>
  );
};
