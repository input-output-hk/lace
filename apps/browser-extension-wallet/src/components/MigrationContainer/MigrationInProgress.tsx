import React from 'react';
import { useTranslation } from 'react-i18next';
import laceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import styles from './MigrationInProgress.module.scss';
import { WalletSetupLayout } from '@src/views/browser-view/components';
import { AppMode, APP_MODE_POPUP } from '@src/utils/constants';
import { MainLoader } from '@components/MainLoader';

export interface MigrationInProgressProps {
  appMode: AppMode;
}

export const MigrationInProgress = ({ appMode }: MigrationInProgressProps): React.ReactElement => {
  const { t } = useTranslation();

  return appMode === APP_MODE_POPUP ? (
    <MainLoader text={t('migrations.inProgress.applying')} />
  ) : (
    <WalletSetupLayout>
      <div className={styles.migrationInProgressContainer} data-testid="migration-in-progress">
        <img className={styles.mark} src={laceLogoMark} alt="LACE" />
        <h4 className={styles.title}>{t('migrations.inProgress.browser.title')}</h4>
        <h5 className={styles.description}>
          <div>{t('migrations.inProgress.browser.description.1')}</div>
          <div>
            <b>{t('migrations.inProgress.browser.description.2')}</b>
          </div>
        </h5>
      </div>
    </WalletSetupLayout>
  );
};
