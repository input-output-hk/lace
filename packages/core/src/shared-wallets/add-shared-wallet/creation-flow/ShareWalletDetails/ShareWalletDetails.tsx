import { ActionCard, Box, Divider, Text } from '@input-output-hk/lace-ui-toolkit';
import { Button } from '@lace/common';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutNavigationProps, SharedWalletLayout } from '../../SharedWalletLayout';
import { creationTimelineSteps } from '../timelineSteps';
import { SharedWalletCreationStep } from '../types';
import { DownloadFileIcon } from './DownloadFileIcon';
import styles from './ShareWalletDetails.module.scss';
import { downloadWalletData } from './utils';

const FILENAME = 'shared-wallet-config.json';

type ShareWalletDetailsProps = Pick<LayoutNavigationProps, 'onNext'> & {
  fileContent?: Record<string, unknown>;
};

export const ShareWalletDetails = ({ onNext, fileContent = {} }: ShareWalletDetailsProps): JSX.Element => {
  const { t } = useTranslation();
  const [isFileDownloaded, setIsFileDownloaded] = useState<boolean>(false);

  const translations = {
    body: t('sharedWallets.addSharedWallet.shareWalletDetails.body'),
    cta: t('sharedWallets.addSharedWallet.shareWalletDetails.download'),
    label: t('sharedWallets.addSharedWallet.shareWalletDetails.label'),
    next: t('sharedWallets.addSharedWallet.shareWalletDetails.next'),
    subtitle: t('sharedWallets.addSharedWallet.shareWalletDetails.subtitle'),
    title: t('sharedWallets.addSharedWallet.shareWalletDetails.title'),
  };

  const onDownload = () => {
    downloadWalletData(fileContent, FILENAME);
    setIsFileDownloaded(true);
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      onNext={onNext}
      timelineSteps={creationTimelineSteps}
      timelineCurrentStep={SharedWalletCreationStep.ShareDetails}
      customNextLabel={translations.next}
      isNextEnabled={isFileDownloaded}
    >
      <Box mt="$12">
        <Text.Body.Normal>{translations.body}</Text.Body.Normal>
      </Box>
      <Divider my="$20" />
      <ActionCard
        title={[{ text: translations.label, weight: '$semibold' }]}
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
