import React, { ReactNode } from 'react';
import { toast } from '@lace/common';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.svg';
import styles from './Base.module.scss';

const TOAST_DEFAULT_DURATION = 3;

interface Props {
  children: ReactNode;
  copiedMessage: string;
  copyText: string;
  onCopyClick?: () => void;
}

export const Base = ({ copyText, children, copiedMessage, onCopyClick }: Readonly<Props>): JSX.Element => {
  const doToast = (): void => {
    toast.notify({
      duration: TOAST_DEFAULT_DURATION,
      text: copiedMessage,
      icon: CopyIcon
    });
    onCopyClick();
  };

  return (
    <CopyToClipboard text={copyText}>
      <div className={styles.root} data-testid="address-card" onClick={doToast}>
        {children}
        <div className={styles.copyButtonContainer}>
          <CopyIcon className={styles.copyButton} data-testid="copy-address-btn" />
        </div>
      </div>
    </CopyToClipboard>
  );
};
