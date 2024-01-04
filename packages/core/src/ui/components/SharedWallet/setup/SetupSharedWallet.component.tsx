import React from 'react';
import { ReactComponent as UserGroupIcon } from '../../../assets/icons/user-group-gradient.component.svg';
import { ReactComponent as UploadIcon } from '../../../assets/icons/upload.component.svg';
import { ReactComponent as LaceLogo } from '../../../assets/icons/lace-logo.component.svg';
import styles from './SetupSharedWallet.module.scss';
import { SharedWalletSetupOption } from './SharedWalletSetupOption.component';

export type SharedWalletSetupOptionTranslations = Record<'title' | 'description' | 'button', string>;

export interface SetupSharedWalletProps {
  onNewSharedWalletClick?: () => void;
  onImportSharedWalletClick?: () => void;
  translations: {
    title: string;
    subTitle: string;
    newSharedWalletOption: SharedWalletSetupOptionTranslations;
    importSharedWalletOption: SharedWalletSetupOptionTranslations;
  };
}

export const SetupSharedWallet = ({
  onNewSharedWalletClick,
  onImportSharedWalletClick,
  translations
}: SetupSharedWalletProps): React.ReactElement => (
  <div className={styles.walletSetupOptionsStep} data-testid="shared-wallet-setup-options-container">
    <div className={styles.content} data-testid="shared-wallet-setup-options-content">
      <div className={styles.header} data-testid="shared-wallet-setup-options-header">
        <LaceLogo className={styles.image} data-testid="shared-wallet-setup-logo" />
        <h5 className={styles.title} data-testid="wallet-setup-title">
          {translations.title}
        </h5>
        <p className={styles.subtitle} data-testid="shared-wallet-setup-subtitle">
          {translations.subTitle}
        </p>
      </div>
      <div className={styles.options}>
        <SharedWalletSetupOption
          copies={translations.newSharedWalletOption}
          Icon={UserGroupIcon}
          onClick={onNewSharedWalletClick}
          testId="shared-wallet-new"
        />
        <div className={styles.separator} />
        <SharedWalletSetupOption
          copies={translations.importSharedWalletOption}
          Icon={UploadIcon}
          onClick={onImportSharedWalletClick}
          testId="shared-wallet-import"
        />
      </div>
    </div>
  </div>
);
