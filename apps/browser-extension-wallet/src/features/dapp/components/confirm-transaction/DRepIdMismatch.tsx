import React, { useEffect } from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '../../../../assets/icons/empty.svg';
import styles from '../Layout.module.scss';
import { Button } from '@lace/common';

type DRepIdMismatchProps = {
  onMount: () => void;
};

export const DRepIdMismatch = ({ onMount }: DRepIdMismatchProps): React.ReactElement => {
  const { t } = useTranslation();

  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="drep-id-mismatch-container" className={styles.noWalletContainer}>
      <div className={styles.noWalletContent}>
        <Image data-testid="drep-id-mismatch-image" preview={false} width={112} src={Empty} />
        <div className={styles.heading} data-testid="drep-id-mismatch-heading">
          {t('core.DRepRetirement.drepIdMismatchScreen.title')}
        </div>
        <div className={styles.description} data-testid="drep-id-mismatch-description">
          {t('core.DRepRetirement.drepIdMismatchScreen.description')}
        </div>
      </div>
      <div className={styles.footer}>
        <Button data-testid="cancel-transaction-btn" className={styles.footerBtn} onClick={() => window.close()}>
          {t('core.DRepRetirement.drepIdMismatchScreen.cancel')}
        </Button>
      </div>
    </div>
  );
};
