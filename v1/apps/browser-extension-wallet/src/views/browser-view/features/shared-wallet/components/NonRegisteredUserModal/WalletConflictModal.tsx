import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './WalletConflictModal.module.scss';

const { Text } = Typography;

interface WalletConflictModalProps {
  visible: boolean;
  onConfirm: () => void;
}

export const WalletConflictModal = ({ visible, onConfirm }: WalletConflictModalProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width="600px"
      className={styles.modal}
    >
      <div data-testid="WalletConflictModal" className={styles.container}>
        <Text data-testid="WalletConflictModalDescription" className={styles.description}>
          {t('sharedWallets.addSharedWallet.WalletConflictModal.description')}
        </Text>
        <div className={styles.buttons}>
          <Button data-testid="WalletConflictModalConfirm" onClick={onConfirm} block>
            {t('sharedWallets.addSharedWallet.WalletConflictModal.cta.ok')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
