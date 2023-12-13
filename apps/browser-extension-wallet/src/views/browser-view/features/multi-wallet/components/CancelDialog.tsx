import React from 'react';
import { Dialog } from '@lace/ui';
import { useTranslate } from '@lace/core';

interface Props {
  open: boolean;
  setOpen: (isOpen: boolean) => void;
  onClose: () => void;
}

export const CancelDialog = ({ open, setOpen, onClose }: Props): JSX.Element => {
  const { t } = useTranslate();

  return (
    <Dialog.Root open={open} setOpen={setOpen} zIndex={1000}>
      <Dialog.Title>{t('multiWallet.cancelDialog.title')}</Dialog.Title>
      <Dialog.Description>{t('multiWallet.cancelDialog.description')}</Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action cancel label={t('multiWallet.cancelDialog.cancel')} onClick={() => setOpen(false)} />
        <Dialog.Action label={t('multiWallet.cancelDialog.confirm')} onClick={onClose} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
