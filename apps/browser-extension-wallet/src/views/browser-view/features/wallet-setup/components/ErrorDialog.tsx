import React from 'react';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './ErrorDialog.module.scss';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

type ErrorCode = 'common' | 'notDetected';

interface ErrorDialogProps {
  visible: boolean;
  onRetry: () => void;
  errorCode: ErrorCode;
}

export const ErrorDialog = ({ visible, onRetry, errorCode = 'common' }: ErrorDialogProps): React.ReactElement => {
  const { t } = useTranslation();

  const ERROR_MESSAGES = {
    common: {
      title: t('browserView.onboarding.commonError.title'),
      description: t('browserView.onboarding.commonError.description'),
      confirm: t('browserView.onboarding.commonError.ok')
    },
    notDetected: {
      title: t('browserView.onboarding.notDetectedError.title'),
      description: t('browserView.onboarding.notDetectedError.description'),
      confirm: t('browserView.onboarding.notDetectedError.agree')
    }
  };

  const error = ERROR_MESSAGES[errorCode];

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width={420}
      className={styles.errorDialog}
    >
      <Title className={styles.title} level={3}>
        {error.title}
      </Title>
      <Text className={styles.description}>{error.description}</Text>
      <Button onClick={onRetry} className={styles.retryButton} block>
        {error.confirm}
      </Button>
    </Modal>
  );
};
