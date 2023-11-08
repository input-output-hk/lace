import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './Announcement.module.scss';
import { ExtensionUpdateData } from '@lib/scripts/types';
import DefaultReleaseNote from '@src/release-notes/default';

const { Title, Text } = Typography;

interface AnnouncementProps {
  visible: boolean;
  onConfirm: () => void;
  version: string;
  reason: ExtensionUpdateData['reason'];
}

export const Announcement = ({ visible, onConfirm, version, reason }: AnnouncementProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width="100%"
      className={styles.modal}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          {reason !== 'downgrade' && <div className={styles.badge}>{t('announcement.title.badge')}</div>}
          <Title level={3} className={styles.title}>
            {t('announcement.title.text', { version })}
          </Title>
          <Text className={styles.description}>
            <DefaultReleaseNote version={version} />
          </Text>
        </div>
      </div>
      <Button className={styles.button} onClick={onConfirm} block>
        {t('announcement.cta')}
      </Button>
    </Modal>
  );
};
