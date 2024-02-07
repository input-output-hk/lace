import React from 'react';
import cn from 'classnames';
import { Modal, ModalProps } from 'antd';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './AddressActionsModal.module.scss';

const modalWidth = 479;

export const ACTIONS = {
  UPDATE: 'update',
  DELETE: 'delete'
};

export type AddressActionsModalProps = {
  action: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPopup?: boolean;
} & ModalProps;

export const AddressActionsModal = ({
  action,
  onCancel,
  onConfirm,
  visible,
  isPopup
}: AddressActionsModalProps): React.ReactElement => {
  const { t: translate } = useTranslation();
  const isDeleteAction = action === ACTIONS.DELETE;

  const descriptionTranslations = isPopup ? (
    <div>{translate('browserView.addressBook.deleteModal.description')}</div>
  ) : (
    <>
      <div>{translate('browserView.addressBook.deleteModal.description1')}</div>
      <div>{translate('browserView.addressBook.deleteModal.description2')}</div>
    </>
  );

  return (
    <Modal
      centered
      className={cn(styles.modal, { [styles.isPopup]: isPopup })}
      onCancel={onCancel}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      closable={false}
      open={visible}
      width={isPopup ? 'calc(100% - 50px)' : modalWidth}
      zIndex={1000}
      data-testid="delete-address-modal-container"
    >
      <div data-testid="delete-address-modal-title" className={styles.header}>
        {isDeleteAction
          ? translate('browserView.addressBook.deleteModal.title')
          : translate('addressBook.updateModal.title')}
      </div>
      <div data-testid="delete-address-modal-description" className={styles.content}>
        {isDeleteAction ? descriptionTranslations : translate('addressBook.updateModal.description')}
      </div>
      <div className={styles.footer}>
        <Button data-testid="delete-address-modal-cancel" onClick={onCancel} block color="secondary">
          {translate('browserView.addressBook.deleteModal.buttons.cancel')}
        </Button>
        <Button data-testid="delete-address-modal-confirm" block onClick={onConfirm}>
          {isDeleteAction
            ? translate('browserView.addressBook.deleteModal.buttons.confirm')
            : translate('addressBook.updateModal.button.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
