import React from 'react';
import { QRCode, toast, Button } from '@lace/common';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import styles from './InfoWallet.module.scss';
import { ReactComponent as CopyIcon } from '../../assets/icons/copy-icon.svg';
import cn from 'classnames';
import { TranslationsFor } from '@ui/utils/types';

const TOAST_DEFAULT_DURATION = 3;

export interface InfoWalletProps {
  walletInfo: { qrData: string; name: string };
  isPopupView?: boolean;
  translations: TranslationsFor<'copiedMessage' | 'copy'>;
  getQRCodeOptions?: () => React.ComponentProps<typeof QRCode>['options'];
  inlineCopy?: boolean;
  onClick?: () => void;
}

export const InfoWallet = ({
  walletInfo,
  isPopupView,
  translations,
  getQRCodeOptions,
  inlineCopy,
  onClick
}: InfoWalletProps): React.ReactElement => {
  const doToast = () => {
    toast.notify({
      duration: TOAST_DEFAULT_DURATION,
      text: translations.copiedMessage,
      icon: CopyIcon
    });
    onClick?.();
  };

  return (
    <div className={styles.infoWalletContainer} data-testid="info-wallet">
      <div className={styles.qrCodeContainer} data-testid="qr-code-container">
        <QRCode data={walletInfo.qrData} options={getQRCodeOptions ? getQRCodeOptions() : undefined} />
      </div>
      <h6
        className={cn(styles.walletName, {
          [styles.smallWalletName]: isPopupView,
          [styles.largeWalletName]: !isPopupView
        })}
        data-testid="info-wallet-name"
      >
        {walletInfo.name}
      </h6>
      <div className={styles.walletAddressBox}>
        <p
          className={cn(styles.walletAddress, {
            [styles.smallWalletAddress]: isPopupView,
            [styles.largeWalletAddress]: !isPopupView
          })}
          data-testid="info-wallet-full-address"
        >
          {walletInfo.qrData}
          {inlineCopy && (
            <CopyToClipboard text={walletInfo.qrData}>
              <CopyIcon className={styles.inlineCopy} data-testid="copy-address-btn" onClick={doToast} />
            </CopyToClipboard>
          )}
        </p>
      </div>
      {!inlineCopy && (
        <CopyToClipboard text={walletInfo.qrData}>
          <Button
            block={isPopupView}
            className={styles.copyBtn}
            color="secondary"
            onClick={doToast}
            data-testid="copy-address-btn"
          >
            {translations.copy}
          </Button>
        </CopyToClipboard>
      )}
    </div>
  );
};
