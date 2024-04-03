import React, { useState } from 'react';
import { Box, Checkbox, Dialog, Text } from '@lace/ui';
import styles from './TopUpWallet.module.scss';
import { useTranslation } from 'react-i18next';

interface TopUpWalletDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}
export const TopUpWalletDialog = ({
  open,
  onCancel,
  onConfirm,
  triggerRef
}: TopUpWalletDialogProps): React.ReactElement => {
  const [agreed, setAgreed] = useState(false);
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} setOpen={onCancel} zIndex={1000} onCloseAutoFocusRef={triggerRef}>
      <Dialog.Title>{t('browserView.assets.topupWallet.modal.title')}</Dialog.Title>
      <Dialog.Description>
        <Box className={styles.scroll}>
          <Text.Body.Normal weight="$medium">{t('browserView.assets.topupWallet.modal.content')}</Text.Body.Normal>
        </Box>
      </Dialog.Description>
      <Checkbox
        label={t('browserView.assets.topupWallet.modal.checkbox')}
        onClick={() => setAgreed(!agreed)}
        checked={agreed}
      />
      <Dialog.Actions>
        <Dialog.Action cancel label={t('browserView.assets.topupWallet.modal.cancel')} onClick={onCancel} />
        <Dialog.Action
          label={t('browserView.assets.topupWallet.modal.confirm')}
          onClick={onConfirm}
          disabled={!agreed}
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
