/* eslint-disable react/prop-types */
import React from 'react';
import { Modal } from 'antd';
import cn from 'classnames';
import { Button, ButtonProps } from '@lace/common';
import styles from './CreateFolder/CreateFolderModal.module.scss';

type actionProps = {
  dataTestId: string;
  body?: React.ReactNode;
  color?: ButtonProps['color'];
  onClick: () => void;
};

export type ModalProps = {
  title: React.ReactNode;
  visible: boolean;
  description: React.ReactNode;
  actions: actionProps[];
  popupView?: boolean;
  onCancel: () => void;
};

const popupModalWidth = 312;
const extendedModalWidth = 479;

export const NftFolderConfirmationModal = ({
  title,
  description,
  visible,
  actions,
  onCancel,
  popupView
}: ModalProps): React.ReactElement<ModalProps> => (
  <Modal
    destroyOnClose
    centered
    className={cn(styles.modal, { [styles.popupView]: popupView })}
    onCancel={onCancel}
    // eslint-disable-next-line unicorn/no-null
    footer={null}
    open={visible}
    width={popupView ? popupModalWidth : extendedModalWidth}
    data-testid="create-folder-modal-container"
  >
    <div data-testid="create-folder-modal-title" className={styles.header}>
      {title}
    </div>
    <div data-testid="create-folder-modal-description" className={styles.content}>
      {description}
    </div>
    <div data-testid="create-folder-modal-actions" className={styles.footer}>
      {actions.map(
        ({ dataTestId, body, ...action }: actionProps): React.ReactElement => (
          <Button key={dataTestId} data-testid={dataTestId} {...action} block>
            {body}
          </Button>
        )
      )}
    </div>
  </Modal>
);
