/* eslint-disable sonarjs/no-duplicate-string */
import { Dialog } from '@input-output-hk/lace-ui-toolkit';
import { SharedWalletsTranslationKey } from '@lace/translation';
import React, { VFC } from 'react';
import { useTranslation } from 'react-i18next';

export enum ErrorKind {
  InsufficientFunds = 'InsufficientFunds',
  InvalidActiveWallet = 'InvalidActiveWallet',
  InvalidFile = 'InvalidFile',
  TxAlreadySigned = 'TxAlreadySigned',
  TxExpired = 'TxExpired',
}

type ErrorKindTranslations = Record<'title' | 'message' | 'primaryButton', SharedWalletsTranslationKey> & {
  secondaryButton?: SharedWalletsTranslationKey;
};

const errorsTranslationKeysMap: Record<ErrorKind, ErrorKindTranslations> = {
  [ErrorKind.InsufficientFunds]: {
    // TODO: add proper translations
    message: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.message',
    primaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.primaryButton',
    title: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.title',
  },
  [ErrorKind.InvalidActiveWallet]: {
    // TODO: add proper translations
    message: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.message',
    primaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.primaryButton',
    title: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.title',
  },
  [ErrorKind.InvalidFile]: {
    message: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.message',
    primaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.primaryButton',
    secondaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.secondaryButton',
    title: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.title',
  },
  [ErrorKind.TxAlreadySigned]: {
    // TODO: add proper translations
    message: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.message',
    primaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.primaryButton',
    title: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.title',
  },
  [ErrorKind.TxExpired]: {
    // TODO: add proper translations
    message: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.message',
    primaryButton: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.primaryButton',
    title: 'sharedWallets.transaction.coSign.importJsonStep.error.invalidFile.title',
  },
};

type ErrorDialogProps = {
  errorKind: ErrorKind;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ErrorDialog: VFC<ErrorDialogProps> = ({ errorKind, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  return (
    <Dialog.Root open zIndex={1000} setOpen={() => void 0}>
      <Dialog.Title>{t(errorsTranslationKeysMap[errorKind].title)}</Dialog.Title>
      <Dialog.Description>{t(errorsTranslationKeysMap[errorKind].message)}</Dialog.Description>
      <Dialog.Actions>
        {errorsTranslationKeysMap[errorKind].secondaryButton && (
          <Dialog.Action
            cancel
            autoFocus
            label={t(errorsTranslationKeysMap[errorKind].secondaryButton)}
            onClick={onCancel}
          />
        )}
        <Dialog.Action autoFocus label={t(errorsTranslationKeysMap[errorKind].primaryButton)} onClick={onConfirm} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
