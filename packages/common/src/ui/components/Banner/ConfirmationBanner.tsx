import React, { ReactPortal, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmationBanner.module.scss';
import { Button } from '@ui/components/Button';

type ConfirmationBannerProps = {
  message: string | React.ReactElement;
  onConfirm: () => void;
  onReject: () => void;
};

export const ConfirmationBanner = ({
  message,
  onConfirm,
  onReject
}: ConfirmationBannerProps): ReactPortal | undefined => {
  const [isVisible, setIsVisible] = useState(true);

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
          <div className={styles.confirmationBanner}>
            <div className={styles.confirmationBannerMessage}>{message}</div>
            <div className={styles.buttons}>
              <Button onClick={handleConfirm} className={styles.secondaryButton}>
                Accept
              </Button>
              <Button onClick={handleReject}>Reject</Button>
            </div>
          </div>
        </>,
        document.body
      )
    : // eslint-disable-next-line unicorn/no-null
      null;
};
