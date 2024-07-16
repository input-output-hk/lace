import { Button, Card, Copy as CopyIcon, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { toast } from '@lace/common';
import React, { VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { keysGenerationTimelineSteps } from '../timelineSteps';
import styles from './CopyKeys.module.scss';

const TOAST_DURATION = 3;

type CopyKeysProps = {
  onClose: () => void;
  onCopyKeys: () => Promise<void>;
  sharedKeys: string;
};

export const CopyKeys: VFC<CopyKeysProps> = ({ onClose, onCopyKeys, sharedKeys }) => {
  const { t } = useTranslation();

  const copyKeys = async () => {
    await onCopyKeys();
    toast.notify({
      duration: TOAST_DURATION,
      icon: CopyIcon,
      text: t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.toastText'),
    });
  };

  return (
    <SharedWalletLayout
      description={t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.subtitle')}
      timelineCurrentStep="copy-keys"
      timelineSteps={keysGenerationTimelineSteps}
      title={t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.title')}
      customBackButton={
        <Button.CallToAction
          label={t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.backButtonLabel')}
          icon={<CopyIcon />}
          onClick={copyKeys}
        />
      }
      customNextButton={
        <Button.Secondary
          onClick={onClose}
          label={t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.nextButtonLabel')}
        />
      }
    >
      <Card.Greyed>
        <Flex p="$16" gap="$4" flexDirection="column">
          <Text.Body.Large weight="$bold">
            {t('sharedWallets.addSharedWallet.keysGeneration.copyKeys.keysBoxTitle')}
          </Text.Body.Large>
          <Text.Body.Small className={styles.keysBox}>{sharedKeys}</Text.Body.Small>
        </Flex>
      </Card.Greyed>
    </SharedWalletLayout>
  );
};
