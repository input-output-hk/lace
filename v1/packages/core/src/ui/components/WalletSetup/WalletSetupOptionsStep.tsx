import React, { ReactNode } from 'react';
import styles from './WalletSetupOptionsStep.module.scss';
import WalletLogo from '../../assets/icons/onboarding/logo/lace/isologo.png';
import { ReactComponent as NewWalletIcon } from '../../assets/icons/onboarding/new-wallet.component.svg';
import { ReactComponent as HardwareWalletIcon } from '../../assets/icons/onboarding/hardware-wallet.component.svg';
import { ReactComponent as HardwareWalletDisabledIcon } from '../../assets/icons/onboarding/hardware-wallet-disabled.component.svg';
import { ReactComponent as RestoreWalletIcon } from '../../assets/icons/onboarding/restore-wallet.component.svg';
import { WalletSetupOption } from './WalletSetupOption';
import { TranslationsFor } from '@ui/utils/types';
import { Box, InfoBar, InfoComponent } from '@input-output-hk/lace-ui-toolkit';

type SetupOptionTranslations = TranslationsFor<'title' | 'description' | 'button'>;

export interface WalletSetupOptionsStepProps {
  onNewWalletRequest: () => void;
  onHardwareWalletRequest: () => void;
  onRestoreWalletRequest: () => void;
  translations: {
    title: string;
    subTitle: string;
    newWallet: SetupOptionTranslations;
    hardwareWallet: SetupOptionTranslations & TranslationsFor<'tooltip'>;
    restoreWallet: SetupOptionTranslations;
    agreementText: ReactNode;
    infoMessage?: string;
  };
  withInfoMessage?: boolean;
  withAgreement?: boolean;
  withHardwareWallet?: boolean;
}

const couldConnectHW = process.env.BROWSER !== 'firefox';

export const WalletSetupOptionsStep = ({
  onNewWalletRequest,
  onHardwareWalletRequest,
  onRestoreWalletRequest,
  translations,
  withAgreement,
  withHardwareWallet,
  withInfoMessage
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
        {withHardwareWallet && (
          <>
            <div className={styles.separator} />
            <WalletSetupOption
              disabled={!couldConnectHW}
              copies={translations.hardwareWallet}
              icon={!couldConnectHW ? HardwareWalletDisabledIcon : HardwareWalletIcon}
              onClick={onHardwareWalletRequest}
              testId="hardware-wallet"
            />
          </>
        )}
        <div className={styles.separator} />
        <WalletSetupOption
          icon={RestoreWalletIcon}
          copies={translations.restoreWallet}
          onClick={onRestoreWalletRequest}
          testId="restore-wallet"
        />
      </div>
    </div>
    {withInfoMessage && (
      <Box mt="$32">
        <InfoBar icon={<InfoComponent />} message={translations.infoMessage} />
      </Box>
    )}
    {withAgreement && (
      <div className={styles.legal} data-testid="agreement-text">
        {translations.agreementText}
      </div>
    )}
  </div>
);
