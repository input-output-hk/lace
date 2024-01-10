import { WalletSetupMnemonicIntroStep } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
interface Props {
  onVideoClick: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const KeepWalletSecure = ({ onBack, onNext, onVideoClick }: Props): JSX.Element => {
  const { t } = useTranslation();

  const walletSetupMnemonicIntroStepTranslations = {
    title: t('core.walletSetupMnemonicIntroStep.title'),
    description: t('core.walletSetupMnemonicIntroStep.description'),
    linkText: t('core.walletSetupMnemonicIntroStep.link')
  };

  return (
    <WalletSetupMnemonicIntroStep
      onBack={onBack}
      onNext={onNext}
      translations={walletSetupMnemonicIntroStepTranslations}
      onClickVideo={onVideoClick}
      videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
    />
  );
};
