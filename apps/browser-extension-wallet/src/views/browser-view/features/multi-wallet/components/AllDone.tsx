import { WalletSetupFinalStep } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  isHardwareWallet?: boolean;
  onFinish?: () => void;
}

export const AllDone = ({ isHardwareWallet, onFinish }: Props): JSX.Element => {
  const { t } = useTranslation();

  const walletSetupFinalStepTranslations = {
    title: t('core.walletSetupFinalStep.title'),
    description: t('core.walletSetupFinalStep.description'),
    close: t('core.walletSetupFinalStep.close'),
    followTwitter: t('core.walletSetupFinalStep.followTwitter'),
    followYoutube: t('core.walletSetupFinalStep.followYoutube'),
    followDiscord: t('core.walletSetupFinalStep.followDiscord')
  };

  return (
    <WalletSetupFinalStep
      onFinish={onFinish}
      translations={walletSetupFinalStepTranslations}
      isHardwareWallet={isHardwareWallet}
    />
  );
};
