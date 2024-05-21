import React, { useCallback } from 'react';
import { Box, Dialog, Text, TextLink } from '@lace/ui';
import styles from './TopUpWallet.module.scss';
import { useTranslation } from 'react-i18next';
import { tabs } from 'webextension-polyfill';
import { BANXA_HOMEPAGE_URL } from './config';

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
  const { t } = useTranslation();
  const handleOpenTabBanxaHomepage = useCallback(() => {
    tabs.create({ url: BANXA_HOMEPAGE_URL });
  }, []);

  return (
    <Dialog.Root open={open} setOpen={onCancel} zIndex={1000} onCloseAutoFocusRef={triggerRef}>
      <Dialog.Title>{t('browserView.assets.topupWallet.modal.title')}</Dialog.Title>
      <Dialog.Description>
        <Box className={styles.disclaimerFullWrapper}>
          <Text.Body.Normal weight="$medium" color="secondary">
            {t('browserView.assets.topupWallet.disclaimer.full.part1')}
          </Text.Body.Normal>
          <TextLink
            onClick={handleOpenTabBanxaHomepage}
            label={t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')}
          />
          <Text.Body.Normal weight="$medium" color="secondary">
            {t('browserView.assets.topupWallet.disclaimer.full.part2')}
          </Text.Body.Normal>
          <TextLink
            onClick={handleOpenTabBanxaHomepage}
            label={t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')}
          />
        </Box>
      </Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action cancel label={t('browserView.assets.topupWallet.modal.goBack')} onClick={onCancel} />
        <Dialog.Action autoFocus label={t('browserView.assets.topupWallet.modal.continue')} onClick={onConfirm} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
