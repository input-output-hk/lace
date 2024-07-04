import Icon from '@ant-design/icons';
import { useTheme } from '@input-output-hk/lace-ui-toolkit';
import { Button, QRCode, toast, useBoundingBox } from '@lace/common';
import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useTranslation } from 'react-i18next';
import Copy from '../staking/copy.component.svg';
import styles from './FundWalletBanner.module.scss';
import LacePortalHorizontal from './lace-portal-horizontal.component.svg';
import LacePortalPortal from './lace-portal-popup.component.svg';
import LacePortalVertical from './lace-portal-vertical.component.svg';

const QR_COLOR_BLACK = '#252525';
const QR_COLOR_WHITE = '#ffffff';

export interface FundWalletBannerProps {
  title: string;
  subtitle?: string;
  walletAddress: string;
  shouldHaveVerticalContent?: boolean;
  prompt: string;
}

const TOAST_DEFAULT_DURATION = 3;
const qrCodeSize = 188;

const smallScreenSizeInPx = 600;

export const FundWalletBanner = ({
  title,
  subtitle,
  prompt,
  walletAddress,
  shouldHaveVerticalContent,
}: FundWalletBannerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { colorScheme } = useTheme();
  const qrCodeOptions: React.ComponentProps<typeof QRCode>['options'] = {
    backgroundOptions: { color: colorScheme === 'dark' ? QR_COLOR_BLACK : QR_COLOR_WHITE },
    dotsOptions: { color: colorScheme === 'dark' ? QR_COLOR_WHITE : QR_COLOR_BLACK, type: 'dots' },
    height: qrCodeSize,
    qrOptions: {
      errorCorrectionLevel: 'M', // this makes more precise the qr size (docs https://www.npmjs.com/package/qr-code-styling)
    },
    width: qrCodeSize,
  };

  const titleElement = (
    <div className={styles.title}>
      <h1 data-testid="fund-wallet-banner-title">{title}</h1>
      {subtitle && <h2 data-testid="fund-wallet-banner-subtitle">{subtitle}</h2>}
    </div>
  );

  const qrCodeElement = (
    <div className={styles.qrCode}>
      <QRCode options={qrCodeOptions} data={walletAddress} />
    </div>
  );

  // eslint-disable-next-line react/no-multi-comp
  const CopyAddressButton = () => (
    // @ts-ignore
    <CopyToClipboard text={walletAddress}>
      <div className={styles.copyButtonWrapper}>
        <Button
          data-testid="copy-address"
          onClick={() => toast.notify({ duration: TOAST_DEFAULT_DURATION, text: 'Copied to clipboard' })}
          color="secondary"
          className={styles.copyButton}
        >
          <Icon component={Copy} className={styles.icon} />
          {t('overview.noFunds.button')}
        </Button>
      </div>
    </CopyToClipboard>
  );

  const largeSizeScreenContent = shouldHaveVerticalContent ? (
    <div className={styles.verticalContent}>
      <LacePortalHorizontal className={styles.horizontalPortal} />

      <div className={styles.bottomContent}>
        <div className={styles.leftSide}>{qrCodeElement}</div>
        <div className={styles.rightSide}>
          <div className={styles.title}>
            <h1 data-testid="fund-wallet-banner-title">{title}</h1>
          </div>
          {subtitle && (
            <div className={styles.title}>
              <h2 data-testid="fund-wallet-banner-subtitle">{subtitle}</h2>
            </div>
          )}
          <div className={styles.address}>
            <p data-testid="info-wallet-full-address">{walletAddress}</p>
          </div>
          <CopyAddressButton />
        </div>
      </div>
    </div>
  ) : (
    <>
      <LacePortalVertical className={styles.verticalPortal} />

      <div className={styles.leftSide}>{qrCodeElement}</div>
      <div className={styles.rightSide}>
        {titleElement}
        <div className={styles.address}>
          <p data-testid="info-wallet-full-address">{walletAddress}</p>
        </div>
        <CopyAddressButton />
      </div>
    </>
  );

  const [container, setContainer] = useState<HTMLElement | undefined>();
  const boundingBox = useBoundingBox(container);

  return (
    <div
      data-testid="fund-wallet-banner"
      ref={setContainer as React.LegacyRef<HTMLDivElement>}
      className={styles.fundWalletBanner}
    >
      {boundingBox && boundingBox?.width > smallScreenSizeInPx ? (
        <>{largeSizeScreenContent}</>
      ) : (
        <>
          <LacePortalPortal className={styles.popupPortal} />
          <div className={styles.smallContent}>
            {titleElement}
            <div className={styles.addressContent}>
              {qrCodeElement}
              <div className={styles.address}>
                <h5 data-testid="fund-wallet-banner-prompt">{prompt}</h5>
                <p data-testid="info-wallet-full-address">{walletAddress}</p>
              </div>
              <CopyAddressButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
