import { NavigationButton } from '@lace/common';
import { Modal } from 'antd';
import React, { FC } from 'react';
import styles from './AddSharedWalletModal.module.scss';

type AddSharedWalletModalProps = {
  onClose: () => void;
};

export const AddSharedWalletModal: FC<AddSharedWalletModalProps> = ({ onClose, children }) => (
  <Modal open centered closable={false} footer={null} width="100%" className={styles.modal}>
    <div className={styles.closeButton}>
      <NavigationButton icon="cross" onClick={onClose} />
    </div>
    {children}
  </Modal>
);
