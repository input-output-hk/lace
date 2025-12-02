import React from 'react';
import { Modal, ModalProps } from 'antd';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './CancelEditAddressModal.module.scss';

// TODO: add a JIRA ticket to unify modals in one reusable component
// right now we have this component repeated in several places https://input-output.atlassian.net/browse/LW-5295
const modalPopupWidth = 312;
const modalBrowserWidth = 480;

export type CancelEditAddressModalProps = {
  visible?: boolean;
  onConfirm: () => void;
  isPopupView?: boolean;
} & ModalProps;

export const CancelEditAddressModal = ({
  onConfirm,
  visible,
  onCancel,
  isPopupView
}: CancelEditAddressModalProps): React.ReactElement => {
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
      <div data-testid="stake-confirmation-modal-title" className={styles.header}>
        {translate('browserView.transaction.send.drawer.cancelEditAddressModal.title')}
      </div>
      <div data-testid="stake-confirmation-modal-description" className={styles.content}>
        <span>{translate('browserView.transaction.send.drawer.cancelEditAddressModal.description1')}</span>
        <span>{translate('browserView.transaction.send.drawer.cancelEditAddressModal.description2')}</span>
      </div>
      <div className={styles.footer} style={{ flexDirection: isPopupView ? 'column' : 'row' }}>
        <Button data-testid="stake-confirmation-modal-cancel" onClick={onCancel} color="secondary" block>
          {translate('browserView.transaction.send.drawer.cancelEditAddressModal.cancel')}
        </Button>
        <Button data-testid="stake-confirmation-modal-confirm" onClick={onConfirm} block>
          {translate('browserView.transaction.send.drawer.cancelEditAddressModal.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
