import React from 'react';
import { useTranslate, SetupSharedWallet, SharedWalletSetupOptionTranslations } from '@lace/core';

export interface SetupSharedWalletProps {
  onNewSharedWalletClick: () => void;
  onImportSharedWalletClick: () => void;
  translations: {
    title: string;
    subTitle: string;
    newSharedWallet: SharedWalletSetupOptionTranslations;
    importSharedWallet: SharedWalletSetupOptionTranslations;
  };
}

export const SetupSharedWalletStep = (): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <SetupSharedWallet
      translations={{
        title: t('browserView.sharedWallet.setup.title'),
        subTitle: t('browserView.sharedWallet.setup.subTitle'),
        newSharedWalletOption: {
          title: t('browserView.sharedWallet.setup.newSharedWalletOption.title'),
          description: t('browserView.sharedWallet.setup.newSharedWalletOption.description'),
          button: t('browserView.sharedWallet.setup.newSharedWalletOption.button')
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
