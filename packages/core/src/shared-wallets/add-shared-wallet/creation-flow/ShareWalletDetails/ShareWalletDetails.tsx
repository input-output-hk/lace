import { ActionCard, Box, Divider, Text } from '@input-output-hk/lace-ui-toolkit';
import { Button } from '@lace/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutNavigationProps, SharedWalletLayout } from '../../SharedWalletLayout';
import { creationTimelineSteps } from '../timelineSteps';
import { SharedWalletCreationStep } from '../types';
import { ReactComponent as DownloadFileIcon } from './download-file.svg';
import styles from './ShareWalletDetails.module.scss';
import { downloadWalletData } from './utils';

const FILENAME = 'shared-wallet-config.json';
const FILE_CONTENTS = { hello: 'world' };

export const ShareWalletDetails = ({ onNext }: LayoutNavigationProps): JSX.Element => {
  const { t } = useTranslation();

  const translations = {
    body: t('sharedWallets.addSharedWallet.shareWalletDetails.body'),
    cta: t('sharedWallets.addSharedWallet.shareWalletDetails.download'),
    label: t('sharedWallets.addSharedWallet.shareWalletDetails.label'),
    next: t('sharedWallets.addSharedWallet.shareWalletDetails.next'),
    subtitle: t('sharedWallets.addSharedWallet.shareWalletDetails.subtitle'),
    title: t('sharedWallets.addSharedWallet.shareWalletDetails.title'),
  };

  const onDownload = () => {
    downloadWalletData(FILE_CONTENTS, FILENAME);
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      onNext={onNext}
      timelineSteps={creationTimelineSteps}
      timelineCurrentStep={SharedWalletCreationStep.ShareDetails}
      customNextLabel={translations.next}
      isNextEnabled
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
