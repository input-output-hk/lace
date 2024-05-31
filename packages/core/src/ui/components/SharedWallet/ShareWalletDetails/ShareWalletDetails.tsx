import React from 'react';
import { SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout';
import { ActionCard, Box, Divider, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { LayoutNavigationProps } from '../SharedWalletLayout/type';
import styles from './ShareWalletDetails.module.scss';
import { Button } from '@lace/common';
import { ReactComponent as DownloadFileIcon } from '../../../assets/icons/download-file.svg';
import { downloadWalletData } from '../utils';

const FILENAME = 'shared-wallet-config.json';
const FILE_CONTENTS = { hello: 'world' };

export const ShareWalletDetails = ({ onNext }: LayoutNavigationProps): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.shareWalletDetails.title'),
    subtitle: t('core.sharedWallet.shareWalletDetails.subtitle'),
    body: t('core.sharedWallet.shareWalletDetails.body'),
    label: t('core.sharedWallet.shareWalletDetails.label'),
    cta: t('core.sharedWallet.shareWalletDetails.download'),
    next: t('core.sharedWallet.shareWalletDetails.next')
  };

  const onDownload = () => {
    downloadWalletData(FILE_CONTENTS, FILENAME);
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      onNext={onNext}
      currentTimelineStep={SharedWalletTimelineSteps.WALLET_DETAILS}
      customNextLabel={translations.next}
    >
      <Box mt="$12">
        <Text.Body.Normal>{translations.body}</Text.Body.Normal>
      </Box>
      <Divider my="$20" />
      <ActionCard
        title={[{ text: translations.label, bold: true }]}
        description={FILENAME}
        rootClassName={styles.root}
        iconClassName={styles.icon}
        icon={
          <Button block onClick={onDownload} color="gradient" data-testid="download-json-btn">
            <DownloadFileIcon />
            <Text.Body.Normal weight="$semibold">{translations.cta}</Text.Body.Normal>
          </Button>
        }
      />
    </SharedWalletLayout>
  );
};
