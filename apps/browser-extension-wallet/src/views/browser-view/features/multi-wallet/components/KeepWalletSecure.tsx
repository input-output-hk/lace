import { WalletSetupMnemonicIntroStep } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
interface Props {
  onVideoClick: () => void;
  onNext: () => void;
}

export const KeepWalletSecure = ({ onNext, onVideoClick }: Props): JSX.Element => {
  const history = useHistory();
  const { t } = useTranslation();

  const walletSetupMnemonicIntroStepTranslations = {
    title: t('core.walletSetupMnemonicIntroStep.title'),
    description: t('core.walletSetupMnemonicIntroStep.description'),
    linkText: t('core.walletSetupMnemonicIntroStep.link')
  };

  return (
    <WalletSetupMnemonicIntroStep
      onBack={() => history.goBack()}
      onNext={onNext}
      translations={walletSetupMnemonicIntroStepTranslations}
      onClickVideo={onVideoClick}
      videoSrc={process.env.YOUTUBE_RECOVERY_PHRASE_VIDEO_URL}
    />
  );
};
