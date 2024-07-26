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
    message: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    primaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    secondaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    title: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
  },
  [ErrorKind.InvalidActiveWallet]: {
    message: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    primaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    secondaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    title: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
  },
  [ErrorKind.InvalidFile]: {
    message: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    primaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    secondaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    title: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
  },
  [ErrorKind.TxAlreadySigned]: {
    message: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    primaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    secondaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    title: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
  },
  [ErrorKind.TxExpired]: {
    message: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    primaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    secondaryButton: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
    title: 'sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel',
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
