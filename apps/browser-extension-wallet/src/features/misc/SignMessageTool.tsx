/* eslint-disable unicorn/no-useless-undefined */
import { Dialog, Text } from '@input-output-hk/lace-ui-toolkit';
import React, { VFC } from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const SignMessageTool: VFC<SignMessageToolProps> = () => {
  const { t } = useTranslation();

  const translations = {
    incorrectWalletError: {
      description: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.exit'),
      title: t('sharedWallets.addSharedWallet.import.error.incorrectWallet.title')
    },
    next: t('sharedWallets.addSharedWallet.import.next'),
    subtitle: t('sharedWallets.addSharedWallet.import.subtitle'),
    title: t('sharedWallets.addSharedWallet.import.title'),
    unrecognizedError: {
      description: t('sharedWallets.addSharedWallet.import.error.unrecognized.description'),
      exit: t('sharedWallets.addSharedWallet.import.error.unrecognized.exit'),
      retry: t('sharedWallets.addSharedWallet.import.error.unrecognized.retry'),
      title: t('sharedWallets.addSharedWallet.import.error.unrecognized.title')
    },
    uploadBtnFormats: t('sharedWallets.addSharedWallet.import.uploadBtnFormats'),
    uploadBtnRemove: t('sharedWallets.addSharedWallet.import.uploadBtnRemove'),
    uploadBtnTitle: (
      <Trans
        i18nKey="sharedWallets.addSharedWallet.import.uploadBtnTitle"
        t={t}
        components={{
          Link: <Text.Button color="highlight" />
        }}
      />
    )
  };

  return (
    <Dialog.Root open zIndex={1000} setOpen={() => void 0}>
      <Dialog.Title>{translations.unrecognizedError.title}</Dialog.Title>
      <Dialog.Description>{translations.unrecognizedError.description}</Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action
          cancel
          label={translations.unrecognizedError.exit}
          onClick={() => console.debug('click')}
          testId="error-unrecognized-exit-btn"
        />
        <Dialog.Action
          autoFocus
          label={translations.unrecognizedError.retry}
          onClick={() => console.debug('click')}
          testId="error-unrecognized-retry-btn"
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
