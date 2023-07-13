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
  isSmall?: boolean;
} & ModalProps;

export const AddressActionsModal = ({
  action,
  onCancel,
  onConfirm,
  visible,
  isSmall
}: AddressActionsModalProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  const getdescriptiontranslations = isSmall ? (
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
        {action === ACTIONS.DELETE
          ? translate('browserView.addressBook.deleteModal.title')
          : translate('addressBook.updateModal.title')}
      </div>
      <div data-testid="delete-address-modal-description" className={styles.content}>
        {action === ACTIONS.DELETE ? getdescriptiontranslations : translate('addressBook.updateModal.description')}
      </div>
      <div className={styles.footer}>
        <Button data-testid="delete-address-modal-cancel" onClick={onCancel} block color="secondary">
          {translate('browserView.addressBook.deleteModal.buttons.cancel')}
        </Button>
        <Button data-testid="delete-address-modal-confirm" block onClick={onConfirm}>
          {action === ACTIONS.DELETE
            ? translate('browserView.addressBook.deleteModal.buttons.confirm')
            : translate('addressBook.updateModal.button.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
