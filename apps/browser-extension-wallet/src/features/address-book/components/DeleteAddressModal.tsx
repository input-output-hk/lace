import React from 'react';
import cn from 'classnames';
import { Modal, ModalProps } from 'antd';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './DeleteAddressModal.module.scss';

const modalWidth = 479;

export type DeleteAddressModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  isSmall?: boolean;
} & ModalProps;

export const DeleteAddressModal = ({
  onCancel,
  onConfirm,
  visible,
  isSmall
}: DeleteAddressModalProps): React.ReactElement => {
  const { t: translate } = useTranslation();
  return (
    <Modal
      centered
      className={cn(styles.modal, { [styles.isSmall]: isSmall })}
      onCancel={onCancel}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      closable={false}
      visible={visible}
      width={isSmall ? 'calc(100% - 50px)' : modalWidth}
      zIndex={1000}
    >
      <div data-testid="delete-address-modal-title" className={styles.header}>
        {translate('browserView.addressBook.deleteModal.title')}
      </div>
      <div data-testid="delete-address-modal-description" className={styles.content}>
        {isSmall ? (
          <div>{translate('browserView.addressBook.deleteModal.description')}</div>
        ) : (
          <>
            <div>{translate('browserView.addressBook.deleteModal.description1')}</div>
            <div>{translate('browserView.addressBook.deleteModal.description2')}</div>
          </>
        )}
      </div>
      <div className={styles.footer}>
        <Button data-testid="delete-address-modal-cancel" onClick={onCancel} block color="secondary">
          {translate('browserView.addressBook.deleteModal.buttons.cancel')}
        </Button>
        <Button data-testid="delete-address-modal-confirm" block onClick={onConfirm}>
          {translate('browserView.addressBook.deleteModal.buttons.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
