import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './Announcement.module.scss';
import { fetchNotes } from './ReleaseNotes';
import { ExtensionUpdateData } from '@lib/scripts/types';

const { Title, Text } = Typography;

interface AnnouncementProps {
  visible: boolean;
  onConfirm: () => void;
  version: string;
  reason: ExtensionUpdateData['reason'];
}

export const Announcement = ({ visible, onConfirm, version, reason }: AnnouncementProps): React.ReactElement => {
  // eslint-disable-next-line unicorn/no-null
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const { t } = useTranslation();

  const loadReleaseNotes = useCallback(async () => {
    let notes = '';
    if (version) {
      try {
        notes = await fetchNotes(version);
      } catch (error) {
        console.log(error);
      }
    }
    setReleaseNotes(notes);
  }, [version]);

  useEffect(() => {
    loadReleaseNotes();
  }, [version, loadReleaseNotes]);

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible && !!releaseNotes}
      width="100%"
      className={styles.modal}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          {reason !== 'downgrade' && <div className={styles.badge}>{t('announcement.title.badge')}</div>}
          <Title level={3} className={styles.title}>
            {`${version} ${t('announcement.title.text')}`}
          </Title>
          <Text className={styles.description}>{releaseNotes}</Text>
        </div>
      </div>
      <Button className={styles.button} onClick={onConfirm} block>
        {t('announcement.cta')}
      </Button>
    </Modal>
  );
};
