import React, { useMemo, useState } from 'react';
import styles from './FundWalletBanner.module.scss';
import Icon from '@ant-design/icons';
import { Button, QRCode, useBoundingBox, toast } from '@lace/common';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Copy from '@src/assets/icons/copy.component.svg';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeInstance } from '@providers/ThemeProvider';
import LacePortalHorizontal from '../../../../assets/branding/lace-portal-horizontal.component.svg';
import LacePortalPortal from '../../../../assets/branding/lace-portal-popup.component.svg';
import LacePortalVertical from '../../../../assets/branding/lace-portal-vertical.component.svg';

export interface FundWalletBannerProps {
  title: string;
  subtitle?: string;
  walletAddress: string;
  shouldHaveVerticalContent?: boolean;
  prompt: string;
}

const TOAST_DEFAULT_DURATION = 3;
const qrCodeSize = 188;
const getQRCodeOptions = (theme: ThemeInstance): React.ComponentProps<typeof QRCode>['options'] => ({
  width: qrCodeSize,
  height: qrCodeSize,
  backgroundOptions: { color: theme.colors.bg.container },
  dotsOptions: { type: 'dots', color: theme.colors.text.primary },
  qrOptions: {
    errorCorrectionLevel: 'M' // this make more precise the qr size (docs https://www.npmjs.com/package/qr-code-styling)
  }
});

const smallScreenSizeInPx = 600;

export const FundWalletBanner = ({
  title,
  subtitle,
  prompt,
  walletAddress,
  shouldHaveVerticalContent
}: FundWalletBannerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qrCodeOptions = useMemo(() => getQRCodeOptions(theme), [theme]);

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

  const copyAddressButton = (
    <CopyToClipboard text={walletAddress}>
      <div className={styles.copyButtonWrapper}>
        <Button
          data-testid="copy-address"
          onClick={() =>
            toast.notify({ duration: TOAST_DEFAULT_DURATION, text: t('general.clipboard.copiedToClipboard') })
          }
          color="secondary"
          className={styles.copyButton}
        >
          <Icon component={Copy} className={styles.icon} />
          {t('browserView.fundWalletBanner.copyAddress')}
        </Button>
      </div>
    </CopyToClipboard>
  );

  const largeSizeScreenContent = shouldHaveVerticalContent ? (
    <div className={styles.verticalContent}>
      <LacePortalHorizontal className={styles.horizontalPortal} />
      <div className={styles.title}>
        <h1 data-testid="fund-wallet-banner-title">{title}</h1>
      </div>
      <div className={styles.bottomContent}>
        <div className={styles.leftSide}>{qrCodeElement}</div>
        <div className={styles.rightSide}>
          {subtitle && (
            <div className={styles.title}>
              <h2 data-testid="fund-wallet-banner-subtitle">{subtitle}</h2>
            </div>
          )}
          <div className={styles.address}>
            <p data-testid="info-wallet-full-address">{walletAddress}</p>
          </div>
          {copyAddressButton}
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
        {copyAddressButton}
      </div>
    </>
  );

  const [container, setContainer] = useState<HTMLElement | undefined>();
  const boundingBox = useBoundingBox(container);

  return (
    <div data-testid="fund-wallet-banner" ref={setContainer} className={styles.fundWalletBanner}>
      {boundingBox?.width > smallScreenSizeInPx ? (
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
              {copyAddressButton}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
