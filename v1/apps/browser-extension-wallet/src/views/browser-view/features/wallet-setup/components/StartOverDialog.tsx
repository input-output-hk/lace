import React from 'react';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './StartOverDialog.module.scss';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface StartOverDialogProps {
  visible: boolean;
  onStartOver: () => void;
  onClose: () => void;
}

export const StartOverDialog = ({ visible, onStartOver, onClose }: StartOverDialogProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width={480}
      className={styles.startOverDialog}
    >
      <Title className={styles.title} level={3}>
        {t('browserView.onboarding.startOver.title')}
      </Title>
      <Text className={styles.description}>{t('browserView.onboarding.startOver.description')}</Text>
      <div className={styles.buttons}>
        <Button onClick={onClose} color="secondary" block>
          {t('browserView.onboarding.startOver.cancel')}
        </Button>
        <Button onClick={onStartOver} block>
          {t('browserView.onboarding.startOver.gotIt')}
        </Button>
      </div>
    </Modal>
  );
};
