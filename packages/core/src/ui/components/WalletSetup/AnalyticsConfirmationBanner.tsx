import React, { ReactPortal, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AnalyticsConfirmationBanner.module.scss';
import { useTranslate } from '@ui/hooks';
import { Button } from '@lace/common';

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
  const { t } = useTranslate();

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
                {t('package.core.confirmationBanner.agree')}
              </Button>
              <Button onClick={handleReject} data-testid="analytics-reject-button">
                {t('package.core.confirmationBanner.reject')}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )
    : // eslint-disable-next-line unicorn/no-null
      null;
};
