/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useEffect } from 'react';
import classnames from 'classnames';
import { AssetDrawerTitle } from './AssetDrawerTitle';
import { Drawer, DrawerNavigation, Button } from '@lace/common';
import styles from './AssetDetailsDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { ASSET_DRAWER_BODY_ID, AssetDetailsContainer } from './AssetDetailsContainer';
import { useWalletStore } from '@src/stores';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const renderFooter = (click: () => void, label: string, popupView?: boolean) => (
  <div className={classnames(styles.footerContainer, { [styles.footerContainerPopup]: popupView })}>
    <Button id={buttonIds.tokenBtnId} onClick={click} className={styles.footerButton}>
      {label}
    </Button>
  </div>
);

type AssetDetailsDrawerProps = {
  fiatCode: string;
  openSendDrawer: (id: string) => void;
  popupView?: boolean;
  isBalanceDataFetchedCorrectly: boolean;
};

export const AssetDetailsDrawer = ({
  fiatCode,
  openSendDrawer,
  popupView = false
}: AssetDetailsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { blockchainProvider, assetDetails, setAssetDetails } = useWalletStore();
  const analytics = useAnalyticsContext();

  const isVisible = !!assetDetails;

  const setVisibility = useCallback(() => setAssetDetails(), [setAssetDetails]);

  useEffect(() => {
    const drawerElement = document.querySelector('.ant-drawer-body');
    if (drawerElement) {
      drawerElement.setAttribute('id', ASSET_DRAWER_BODY_ID);
    }
  }, []);

  const handleOpenSend = () => openSendDrawer(assetDetails?.id);

  // Close asset details drawer if network (blockchainProvider) has changed
  useEffect(() => {
    setVisibility();
  }, [blockchainProvider, setVisibility]);

  return (
    <Drawer
      className={styles.drawer}
      navigation={
        <DrawerNavigation
          title={t('browserView.assetDetails.title')}
          onCloseIconClick={() => {
            analytics.sendEventToPostHog(PostHogAction.TokenTokenDetailXClick);
            setVisibility();
          }}
        />
      }
      footer={renderFooter(handleOpenSend, t('browserView.assets.send'), popupView)}
      open={isVisible}
      destroyOnClose
      onClose={setVisibility}
      popupView={popupView}
      closable
    >
      <div className={classnames(styles.container, { [styles.popupContainer]: popupView })}>
        <AssetDrawerTitle
          logo={assetDetails?.logo}
          defaultLogo={assetDetails?.defaultLogo}
          title={assetDetails?.name}
          code={assetDetails?.ticker}
        />
        <AssetDetailsContainer fiatCode={fiatCode} popupView={popupView} />
      </div>
    </Drawer>
  );
};
