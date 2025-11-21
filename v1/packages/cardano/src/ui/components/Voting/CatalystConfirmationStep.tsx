import React from 'react';
import styles from './Voting.module.scss';
import { Button } from '@lace/common';
import CatalystLogo from '../../assets/images/catalyst-logo.png';
import { InfoCircleOutlined } from '@ant-design/icons';
import { TranslationsFor } from '@wallet/util/types';

export interface CatalystConfirmationStepProps {
  walletPreview: React.ReactNode;
  passwordForm: React.ReactNode;
  fundNumber: number;
  fee: string;
  stage?: 'confirm' | 'unlock';
  onConfirm: () => void;
  onCancel: () => void;
  translations: TranslationsFor<
    'confirmHeader' | 'confirmBody' | 'register' | 'totalFee' | 'cancelButton' | 'confirmButton'
  >;
}

export const CatalystConfirmationStep = ({
  walletPreview,
  passwordForm,
  fundNumber,
  fee,
  stage = 'confirm',
  onConfirm,
  onCancel,
  translations
}: CatalystConfirmationStepProps): React.ReactElement => (
  <div className={styles.stepContainer}>
    <div className={styles.confirmHeader}>
      <h5>{translations.confirmHeader}</h5>
      <p>{translations.confirmBody}</p>
    </div>
    <div className={styles.confirmContent}>
      {stage === 'confirm' ? (
        passwordForm
      ) : (
        <>
          <div className={styles.walletPreview}>{walletPreview}</div>
          <h5>{translations.register}</h5>
          <div className={styles.fund}>
            <img src={CatalystLogo} />
            <b>Catalyst</b> <p>Fund {fundNumber}</p>
          </div>
        </>
      )}
    </div>
    <div className={styles.confirmFooter}>
      {stage === 'unlock' && (
        <>
          <div className={styles.fee}>
            <p>
              {translations.totalFee} <InfoCircleOutlined />
            </p>
            <b>{fee}</b>
          </div>
          <Button color="secondary" onClick={onCancel}>
            {translations.cancelButton}
          </Button>
          <Button onClick={onConfirm}>{translations.confirmButton}</Button>
        </>
      )}
    </div>
  </div>
);
