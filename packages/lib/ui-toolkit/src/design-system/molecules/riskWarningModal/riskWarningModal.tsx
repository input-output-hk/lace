import React from 'react';

import { Modal } from '../modal/modal';

export type RiskWarningModalProps = {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  testIdPrefix?: string;
};

/**
 * Presentational modal used to display regulatory/risk acknowledgement copy
 * (e.g. UK FCA crypto-asset promotion notices). Consumers supply the already
 * localized strings and the acknowledgement handler — the component is
 * intentionally props-only so it can be reused across modules per ADR 14.
 */
export const RiskWarningModal = ({
  title,
  body,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel,
  testIdPrefix = 'risk-warning-modal',
}: RiskWarningModalProps) => (
  <Modal
    heading={title}
    description={body}
    confirmText={confirmLabel}
    onConfirm={onConfirm}
    cancelText={cancelLabel}
    onCancel={onCancel}
    testIdPrefix={testIdPrefix}
  />
);
