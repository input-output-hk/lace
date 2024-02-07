import React from 'react';
import { Modal, ModalProps } from 'antd';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './DeleteDappModal.module.scss';

const modalPopupWidth = 312;
const modalBrowserWidth = 480;

export type deleteDappModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  isPopupView?: boolean;
} & ModalProps;

export const DeleteDappModal = ({
  onCancel,
  onConfirm,
  visible,
  isPopupView
}: deleteDappModalProps): React.ReactElement => {
  const { t: translate } = useTranslation();
  return (
    <Modal
      centered
      className={styles.modal}
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width={isPopupView ? modalPopupWidth : modalBrowserWidth}
    >
      <div data-testid="delete-dapp-modal-title" className={styles.header}>
        {translate('dapp.delete.title')}
      </div>
      <div data-testid="delete-dapp-modal-description" className={styles.content}>
        {translate('dapp.delete.description')}
      </div>
      <div className={styles.footer} style={{ flexDirection: isPopupView ? 'column' : 'row-reverse' }}>
        <Button data-testid="delete-dapp-modal-confirm" className={styles.btn} onClick={onConfirm}>
          {translate('dapp.delete.confirm')}
        </Button>
        <Button
          data-testid="delete-dapp-modal-cancel"
          className={styles.btnCancel}
          onClick={onCancel}
          color="secondary"
        >
          {translate('dapp.delete.cancel')}
        </Button>
      </div>
    </Modal>
  );
};
