import React, { ReactElement } from 'react';
import { Backdrop, Dialog } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface BitcoinImportMessageDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  setOpen: (open: boolean) => void;
}

export const BitcoinImportMessageDialog = ({
  open,
  onCancel,
  onConfirm,
  setOpen
}: BitcoinImportMessageDialogProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      {open && <Backdrop zIndex={980} />}
      <Dialog.Root open={open} setOpen={setOpen} zIndex={999}>
        <Dialog.Title>{t('core.walletSetupOptionsStep.infoMessageTitle')}</Dialog.Title>
        <Dialog.Description>{t('core.walletSetupOptionsStep.infoMessage')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action cancel label={t('general.button.cancel')} onClick={onCancel} testId="cancel-button" />
          <Dialog.Action label={t('general.button.understood')} onClick={onConfirm} testId="confirm-button" />
        </Dialog.Actions>
      </Dialog.Root>
    </>
  );
};
