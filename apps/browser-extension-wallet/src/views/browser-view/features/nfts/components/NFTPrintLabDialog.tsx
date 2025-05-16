import React from 'react';
import { Box, Dialog, Text, TextLink } from '@input-output-hk/lace-ui-toolkit';
import styles from './NFTPrintLabDialog.module.scss';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers';

export const NFTPRINTLAB_URL = process.env.NFTPRINTLAB_URL;

interface NFTPrintLabDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
export const NFTPrintLabDialog = ({ open, onCancel, onConfirm }: NFTPrintLabDialogProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();
  const handleOpenTabNFTPrintLabHomepage = () => {
    openExternalLink(NFTPRINTLAB_URL);
  };

  return (
    <Dialog.Root open={open} setOpen={onCancel} zIndex={1000}>
      <Dialog.Title>{t('browserView.nfts.printlab.modal.title')}</Dialog.Title>
      <Dialog.Description>
        <Box className={styles.disclaimerFullWrapper}>
          <Text.Body.Normal weight="$medium" color="secondary" data-testid="nftprintlab-dialog-disclaimer-part1">
            {t('browserView.nfts.printlab.disclaimer.full.part1')}
          </Text.Body.Normal>
          <TextLink
            onClick={handleOpenTabNFTPrintLabHomepage}
            label={t('browserView.nfts.printlab.disclaimer.full.nftprintlabLinkCaption')}
            testId="nftprintlab-dialog-disclaimer-link-caption-1"
          />
        </Box>
      </Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action
          cancel
          label={t('browserView.nfts.printlab.modal.cancel')}
          onClick={onCancel}
          testId="nftprintlab-dialog-go-back-button"
        />
        <Dialog.Action
          autoFocus
          label={t('browserView.nfts.printlab.modal.continue')}
          onClick={onConfirm}
          testId="nftprintlab-dialog-continue-button"
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
