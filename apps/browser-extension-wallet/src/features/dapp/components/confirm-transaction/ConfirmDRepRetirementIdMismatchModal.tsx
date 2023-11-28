/* eslint-disable unicorn/no-null */
import React from 'react';
import { Modal } from 'antd';
import { Button, Ellipsis } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './ConfirmDRepRetirementIdMismatchModal.module.scss';

// TODO: add a JIRA ticket to unify modals in one reusable component
// right now we have this component repeated in several places https://input-output.atlassian.net/browse/LW-5295
const modalPopupWidth = 312;

export type ConfirmDRepRetirementIdMismatchDialogProps = {
  open: boolean;
  expectedDRepId: string;
  givenDRepId: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmDRepRetirementIdMismatchModal = ({
  open,
  expectedDRepId = 'abc',
  givenDRepId = 'cba',
  onCancel,
  onConfirm
}: ConfirmDRepRetirementIdMismatchDialogProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Modal open={open} centered className={styles.modal} closable={false} footer={null} width={modalPopupWidth}>
      <div data-testid="drep-id-mismatch-modal-title" className={styles.header}>
        {t('core.DRepRetirement.drepIdMismatchModal.title')}
      </div>
      <div data-testid="drep-id-mismatch-modal-description" className={styles.content}>
        {t('core.DRepRetirement.drepIdMismatchModal.description')}
        <span className={styles.label}>{t('core.DRepRetirement.drepIdMismatchModal.givenDRepId')}</span>
        <Ellipsis theme="addressGray" beforeEllipsis={10} afterEllipsis={0} text={givenDRepId} />
        <span className={styles.label}>{t('core.DRepRetirement.drepIdMismatchModal.expectedDRepId')}</span>
        <Ellipsis theme="addressGray" beforeEllipsis={10} afterEllipsis={0} text={expectedDRepId} />
      </div>
      <div className={styles.footer}>
        <Button data-testid="drep-id-mismatch-modal-confirm" onClick={onConfirm} block>
          {t('core.DRepRetirement.drepIdMismatchModal.confirm')}
        </Button>
        <Button data-testid="drep-id-mismatch-modal-cancel" onClick={onCancel} color="secondary" block>
          {t('core.DRepRetirement.drepIdMismatchModal.cancel')}
        </Button>
      </div>
    </Modal>
  );
};
