import React, { ReactPortal, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AnalyticsConfirmationBanner.module.scss';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';

type ConfirmationBannerProps = {
  message: string | React.ReactElement;
  onConfirm: () => void;
  onReject: () => void;
  show?: boolean;
};

export const AnalyticsConfirmationBanner = ({
  message,
  onConfirm,
  onReject,
  show = true
}: ConfirmationBannerProps): ReactPortal | null => {
  const [isVisible, setIsVisible] = useState(show);
  const { t } = useTranslation();

  const handleConfirm = () => {
    setIsVisible(false);
    onConfirm();
  };

  const handleReject = () => {
    setIsVisible(false);
    onReject();
  };

  return isVisible
    ? createPortal(
        <>
          <div className={styles.overlay} />
          <div className={styles.confirmationBanner} data-testid="analytics-banner-container">
            <div className={styles.confirmationBannerMessage}>{message}</div>
            <div className={styles.buttons}>
              <Button onClick={handleConfirm} className={styles.secondaryButton} data-testid="analytics-accept-button">
                {t('core.confirmationBanner.agree')}
              </Button>
              <Button onClick={handleReject} data-testid="analytics-reject-button">
                {t('core.confirmationBanner.reject')}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )
    : // eslint-disable-next-line unicorn/no-null
      null;
};
