import { Button, Card, Copy as CopyIcon, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { toast } from '@lace/common';
import React, { VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { keyGenerationTimelineSteps } from '../timelineSteps';
import styles from './CopyKeys.module.scss';

const TOAST_DURATION = 3;

type CopyKeysProps = {
  onClose: () => void;
  onCopyKey: () => Promise<void>;
  sharedWalletKey: string;
};

export const CopyKey: VFC<CopyKeysProps> = ({ onClose, onCopyKey, sharedWalletKey }) => {
  const { t } = useTranslation();

  const copyKeys = async () => {
    await onCopyKey();
    toast.notify({
      duration: TOAST_DURATION,
      icon: CopyIcon,
      text: t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.toastText'),
    });
  };

  return (
    <SharedWalletLayout
      description={t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.subtitle')}
      timelineCurrentStep="copy-key"
      timelineSteps={keyGenerationTimelineSteps}
      title={t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.title')}
      customBackButton={
        <Button.CallToAction
          label={t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.backButtonLabel')}
          icon={<CopyIcon />}
          onClick={copyKeys}
          data-testid="copy-key-to-clipboard-button"
        />
      }
      customNextButton={
        <Button.Secondary
          onClick={onClose}
          label={t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.nextButtonLabel')}
          data-testid="close-button"
        />
      }
    >
      <Card.Greyed>
        <Flex p="$16" gap="$4" flexDirection="column">
          <Text.Body.Large weight="$bold" data-testid="shared-wallet-keys-label">
            {t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.keyBoxTitle')}
          </Text.Body.Large>
          <Text.Body.Small className={styles.keyBox} data-testid="shared-wallet-keys-value">
            {sharedWalletKey}
          </Text.Body.Small>
        </Flex>
      </Card.Greyed>
    </SharedWalletLayout>
  );
};
