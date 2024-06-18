import React, { VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletGetStartedOptions } from './GetStarted';

type SharedWalletGetStartedProps = {
  onCreateSharedWalletClick: () => void;
};

export const SharedWalletGetStarted: VFC<SharedWalletGetStartedProps> = ({
  onCreateSharedWalletClick,
}): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <SharedWalletGetStartedOptions
      translations={{
        createSharedWalletOption: {
          button: t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.button'),
          description: t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.description'),
          title: t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.title'),
        },
        importSharedWalletOption: {
          button: t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.button'),
          description: t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.description'),
          title: t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.title'),
        },
        subTitle: t('sharedWallets.addSharedWallet.getStarted.subTitle'),
        title: t('sharedWallets.addSharedWallet.getStarted.title'),
      }}
      onCreateSharedWalletClick={onCreateSharedWalletClick}
    />
  );
};
