import React from 'react';
import { useTranslate, SharedWalletGetStartedOptions } from '@lace/core';

export const SharedWalletGetStarted = (): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <SharedWalletGetStartedOptions
      translations={{
        title: t('browserView.sharedWallet.setup.title'),
        subTitle: t('browserView.sharedWallet.setup.subTitle'),
        createSharedWalletOption: {
          title: t('browserView.sharedWallet.setup.createSharedWalletOption.title'),
          description: t('browserView.sharedWallet.setup.createSharedWalletOption.description'),
          button: t('browserView.sharedWallet.setup.createSharedWalletOption.button')
        },
        importSharedWalletOption: {
          title: t('browserView.sharedWallet.setup.importSharedWalletOption.title'),
          description: t('browserView.sharedWallet.setup.importSharedWalletOption.description'),
          button: t('browserView.sharedWallet.setup.importSharedWalletOption.button')
        }
      }}
    />
  );
};
