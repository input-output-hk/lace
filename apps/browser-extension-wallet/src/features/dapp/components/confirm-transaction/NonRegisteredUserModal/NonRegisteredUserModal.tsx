import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './NonRegisteredUserModal.module.scss';

const { Title, Text } = Typography;

interface NonRegisteredUserModalProps {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const NonRegisteredUserModal = ({
  visible,
  onConfirm,
  onClose
}: NonRegisteredUserModalProps): React.ReactElement => {
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
      <div data-testid="NonRegisteredUserModal" className={styles.container}>
        <Title data-testid="NonRegisteredUserModalTitle" level={3} className={styles.title}>
          {t('core.VotingProcedures.NonRegisteredUserModal.title')}
        </Title>
        <Text data-testid="NonRegisteredUserModalDescription" className={styles.description}>
          {t('core.VotingProcedures.NonRegisteredUserModal.description')}
        </Text>
        <div className={styles.buttons}>
          <Button data-testid="NonRegisteredUserModalConfirm" onClick={onConfirm} block>
            {t('core.VotingProcedures.NonRegisteredUserModal.cta.ok')}
          </Button>
          <Button data-testid="NonRegisteredUserModalCancel" onClick={onClose} color="secondary" block>
            {t('core.VotingProcedures.NonRegisteredUserModal.cta.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
