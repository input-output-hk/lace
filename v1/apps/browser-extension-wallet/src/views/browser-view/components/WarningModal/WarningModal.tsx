import React from 'react';
import { Modal } from 'antd';
import { Button } from '@lace/common';
import styles from './WarningModal.module.scss';
import { useTranslation } from 'react-i18next';

interface WarningModalProps {
  header: React.ReactNode;
  content: React.ReactNode;
  visible: boolean;
  isPopupView?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  confirmCustomClassName?: string;
  dataTestId?: string;
  destroyOnClose?: boolean;
}

const modalWidth = 480;
const modalHeight = 264;

export const WarningModal = ({
  header,
  content,
  visible,
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
  confirmCustomClassName,
  isPopupView,
  dataTestId,
  destroyOnClose = false
}: WarningModalProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  const modalsWithFixedHeight = [translate('general.warnings.youHaveToStartAgain')];
  const useFixedModalHeight = modalsWithFixedHeight.includes(String(header));

  return (
    <Modal
      bodyStyle={{ height: isPopupView || !useFixedModalHeight ? '100%' : modalHeight }}
      centered
      className={styles.modal}
      onCancel={onCancel}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={visible}
      width={isPopupView ? '100%' : modalWidth}
      data-testid={dataTestId}
      destroyOnClose={destroyOnClose}
    >
      <div data-testid="delete-address-modal-title" className={styles.header}>
        {header}
      </div>
      <div data-testid="delete-address-modal-description" className={styles.content}>
        {content}
      </div>
      <div className={styles.footer}>
        {!!onCancel && (
          <Button data-testid="delete-address-modal-cancel" block onClick={onCancel} color="secondary">
            {cancelLabel ?? translate('general.button.cancel')}
          </Button>
        )}
        {!!onConfirm && (
          <Button
            className={confirmCustomClassName}
            data-testid="delete-address-modal-confirm"
            block
            onClick={onConfirm}
          >
            {confirmLabel ?? translate('general.button.agree')}
          </Button>
        )}
      </div>
    </Modal>
  );
};
