import React, { useCallback } from 'react';
import { Box, Dialog, Text, TextLink } from '@input-output-hk/lace-ui-toolkit';
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
          <Text.Body.Normal weight="$medium" color="secondary" data-testid="top-up-wallet-dialog-disclaimer-part1">
            {t('browserView.assets.topupWallet.disclaimer.full.part1')}
          </Text.Body.Normal>
          <TextLink
            onClick={handleOpenTabBanxaHomepage}
            label={t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')}
            testId="top-up-wallet-dialog-disclaimer-link-caption-1"
          />
          <Text.Body.Normal weight="$medium" color="secondary" data-testid="top-up-wallet-dialog-disclaimer-part2">
            {t('browserView.assets.topupWallet.disclaimer.full.part2')}
          </Text.Body.Normal>
          <TextLink
            onClick={handleOpenTabBanxaHomepage}
            label={t('browserView.assets.topupWallet.disclaimer.full.banxaLinkCaption')}
            testId="top-up-wallet-dialog-disclaimer-link-caption-2"
          />
        </Box>
      </Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action
          cancel
          label={t('browserView.assets.topupWallet.modal.goBack')}
          onClick={onCancel}
          testId="top-up-wallet-dialog-go-back-button"
        />
        <Dialog.Action
          autoFocus
          label={t('browserView.assets.topupWallet.modal.continue')}
          onClick={onConfirm}
          testId="top-up-wallet-dialog-continue-button"
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
