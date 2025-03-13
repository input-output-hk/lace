import React from 'react';
import styles from './WalletSetupOptionsStep.module.scss';
import WalletLogo from '../../assets/icons/onboarding/logo/lace/isologo.png';
import { ReactComponent as NewWalletIcon } from '../../assets/icons/onboarding/new-wallet.component.svg';
import { ReactComponent as HardwareWalletIcon } from '../../assets/icons/onboarding/hardware-wallet.component.svg';
import { ReactComponent as RestoreWalletIcon } from '../../assets/icons/onboarding/restore-wallet.component.svg';
import { WalletSetupOption } from './WalletSetupOption';
import { TranslationsFor } from '@ui/utils/types';

type SetupoptionTranslatiions = TranslationsFor<'title' | 'description' | 'button'>;

export interface WalletSetupOptionsStepProps {
  onNewWalletRequest: () => void;
  onHardwareWalletRequest: () => void;
  onRestoreWalletRequest: () => void;
  isHardwareWalletEnabled: boolean;
  translations: {
    title: string;
    subTitle: string;
    newWallet: SetupoptionTranslatiions;
    hardwareWallet: SetupoptionTranslatiions;
    restoreWallet: SetupoptionTranslatiions;
  };
}

export const WalletSetupOptionsStep = ({
  onNewWalletRequest,
  onHardwareWalletRequest,
  onRestoreWalletRequest,
  translations,
  isHardwareWalletEnabled
}: WalletSetupOptionsStepProps): React.ReactElement => (
  <div className={styles.walletSetupOptionsStep} data-testid="wallet-setup-options-container">
    <div className={styles.content} data-testid="wallet-setup-options-content">
      <div className={styles.header} data-testid="wallet-setup-options-header">
        <img src={WalletLogo} alt="" className={styles.image} data-testid="wallet-setup-logo" />
        <h5 className={styles.title} data-testid="wallet-setup-title">
          {translations.title}
        </h5>
        <p className={styles.subtitle} data-testid="wallet-setup-subtitle">
          {translations.subTitle}
        </p>
      </div>
      <div className={styles.options}>
        <WalletSetupOption
          copies={translations.newWallet}
          icon={NewWalletIcon}
          onClick={onNewWalletRequest}
          testId="create-wallet"
        />
        {
          isHardwareWalletEnabled && (
            <>
              <div className={styles.separator}/>
              <WalletSetupOption
                  copies={translations.hardwareWallet}
                icon={HardwareWalletIcon}
                onClick={onHardwareWalletRequest}
                testId="hardware-wallet"
              />
            </>
      )}
      <div className={styles.separator}/>
      <WalletSetupOption
        icon={RestoreWalletIcon}
        copies={translations.restoreWallet}
          onClick={onRestoreWalletRequest}
          testId="restore-wallet"
        />
      </div>
    </div>
  </div>
);
