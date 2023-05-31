import React from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import Check from '../../assets/icons/check.svg';
import NotAllowed from '../../assets/icons/x.svg';
import styles from './WalletSetupAnalyticsStep.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export interface WalletSetupAnalyticsStepProps {
  onDeny: () => void;
  onAccept: () => void;
  onBack: () => void;
  translations: TranslationsFor<
    | 'back'
    | 'agree'
    | 'title'
    | 'description'
    | 'optionsTitle'
    | 'privacyPolicy'
    | 'allowOptout'
    | 'collectPrivateKeys'
    | 'collectIp'
    | 'personalData'
  >;
  isHardwareWallet?: boolean;
}

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL;

export const WalletSetupAnalyticsStep = ({
  onDeny,
  onAccept,
  onBack,
  translations,
  isHardwareWallet = false
}: WalletSetupAnalyticsStepProps): React.ReactElement => (
  <WalletSetupStepLayout
    backLabel={translations.back}
    nextLabel={translations.agree}
    title={translations.title}
    onBack={onBack}
    onNext={onAccept}
    onSkip={onDeny}
    currentTimelineStep={WalletTimelineSteps.LEGAL_AND_ANALYTICS}
    isHardwareWallet={isHardwareWallet}
  >
    <>
      <p className={styles.description} data-testid="wallet-setup-analytics-description">
        {translations.description}{' '}
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          className={styles.link}
          data-testid="wallet-setup-analytics-privacy-policy-link"
        >
          {`${translations.privacyPolicy}`}
        </a>
      </p>
      <div className={styles.options}>
        <p data-testid="wallet-setup-analytics-options-title">{translations.optionsTitle}</p>
        <div className={styles.flex}>
          <img src={Check} alt="check" data-testid="wallet-setup-analytics-options-allow-optout-icon" />
          <p data-testid="wallet-setup-analytics-options-allow-optout-text">{translations.allowOptout}</p>
        </div>
        <div className={styles.flex}>
          <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-collect-private-keys-icon" />
          <p data-testid="wallet-setup-analytics-options-collect-private-keys-text">
            {translations.collectPrivateKeys}
          </p>
        </div>
        <div className={styles.flex}>
          <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-collect-ip-icon" />
          <p data-testid="wallet-setup-analytics-options-collect-ip-text">{translations.collectIp}</p>
        </div>
        <div className={styles.flex}>
          <img src={NotAllowed} alt="check" data-testid="wallet-setup-analytics-options-personal-data-icon" />
          <p data-testid="wallet-setup-analytics-options-personal-data-text">{translations.personalData}</p>
        </div>
      </div>
    </>
  </WalletSetupStepLayout>
);
