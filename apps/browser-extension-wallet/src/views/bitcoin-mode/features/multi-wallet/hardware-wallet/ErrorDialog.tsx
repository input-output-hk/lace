import { Button } from '@lace/common';
import { TranslationKey } from '@lace/translation';
import { Modal, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ErrorDialog.module.scss';

import { ErrorDialogCode } from './types';

const commonErrorDialogTranslationKeys = {
  title: 'browserView.onboarding.errorDialog.title' as const,
  confirm: 'browserView.onboarding.errorDialog.cta' as const
};

type TranslationKeys = Record<'title' | 'description' | 'confirm', TranslationKey>;

const translationsMap: Record<ErrorDialogCode, TranslationKeys> = {
  [ErrorDialogCode.DeviceDisconnected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageDeviceDisconnected'
  },
  [ErrorDialogCode.PublicKeyExportRejected]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messagePublicKeyExportRejected'
  },
  [ErrorDialogCode.Generic]: {
    ...commonErrorDialogTranslationKeys,
    description: 'browserView.onboarding.errorDialog.messageGeneric'
  }
};

const { Title, Text } = Typography;

type ErrorDialogProps = {
  onRetry: () => void;
  errorCode?: ErrorDialogCode;
};

export const ErrorDialog = ({ onRetry, errorCode }: ErrorDialogProps): React.ReactElement => {
  const { t } = useTranslation();
  const errorTranslationKeys = translationsMap[errorCode];

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open
      width={420}
      className={styles.errorDialog}
    >
      <Title className={styles.title} level={3}>
        {t(errorTranslationKeys.title)}
      </Title>
      <Text className={styles.description}>{t(errorTranslationKeys.description)}</Text>
      <Button onClick={onRetry} className={styles.retryButton} block>
        {t(errorTranslationKeys.confirm)}
      </Button>
    </Modal>
  );
};
