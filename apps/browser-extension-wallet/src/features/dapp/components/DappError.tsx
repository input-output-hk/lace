import React, { ReactNode, useCallback, useEffect } from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '../../../assets/icons/empty.svg';
import styles from './Layout.module.scss';
import { Button } from '@lace/common';

type DappErrorProps = {
  title: string;
  description: ReactNode;
  closeButtonLabel?: string;
  onCloseClick?: () => void;
  onMount?: () => void;
  containerTestId: string;
  imageTestId: string;
  titleTestId: string;
  descriptionTestId: string;
  closeButtonTestId: string;
};
export const DappError = ({
  title,
  description,
  closeButtonLabel,
  onCloseClick,
  onMount,
  containerTestId,
  imageTestId,
  titleTestId,
  descriptionTestId,
  closeButtonTestId
}: DappErrorProps): React.ReactElement => {
  const { t } = useTranslation();
  const handleClose = useCallback(() => {
    if (onCloseClick) onCloseClick();
    window.close();
  }, [onCloseClick]);

  useEffect(() => {
    if (onMount) onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid={containerTestId} className={styles.dappErrorContainer}>
      <div className={styles.dappErrorContent}>
        <Image data-testid={imageTestId} preview={false} width={112} src={Empty} />
        <div className={styles.heading} data-testid={titleTestId}>
          {title}
        </div>
        <div className={styles.description} data-testid={descriptionTestId}>
          {description}
        </div>
      </div>
      <div className={styles.footer}>
        <Button data-testid={closeButtonTestId} className={styles.footerBtn} onClick={handleClose}>
          {closeButtonLabel || t('dapp.dappErrorPage.closeButton')}
        </Button>
      </div>
    </div>
  );
};
