import React from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import WalletLogo from '../../assets/images/passphrase.png';
import styles from './WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export interface WalletSetupMnemonicIntroStepProps {
  onBack: () => void;
  onNext: () => void;
  translations: TranslationsFor<'title' | 'description' | 'linkText'>;
}

export const WalletSetupMnemonicIntroStep = ({
  onBack,
  onNext,
  translations
}: WalletSetupMnemonicIntroStepProps): React.ReactElement => (
  <WalletSetupStepLayout
    title={translations.title}
    description={translations.description}
    linkText={translations.linkText}
    onBack={onBack}
    onNext={onNext}
    currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
  >
    <img src={WalletLogo} alt="" className={styles.image} data-testid="mnemonic-intro-image" />
  </WalletSetupStepLayout>
);
