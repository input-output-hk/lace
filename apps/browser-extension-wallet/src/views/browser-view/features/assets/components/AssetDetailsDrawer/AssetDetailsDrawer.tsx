/* eslint-disable react/no-multi-comp */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useEffect, useState } from 'react';
import flatten from 'lodash/flatten';
import classnames from 'classnames';
import { AssetDetails, AssetDetailsProps } from './AssetDetails';
import { AssetDrawerTitle } from './AssetDrawerTitle';
import { Drawer, DrawerNavigation, Button } from '@lace/common';
import styles from './AssetDetailsDrawer.module.scss';
import { useTranslation } from 'react-i18next';
import { useWalletStore, AssetDetailsSlice } from '@src/stores';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes/wallet-paths';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { FetchWalletActivitiesReturn } from '@src/stores/slices';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { buttonIds } from '@hooks/useEnterKeyPress';

export const ASSET_DRAWER_BODY_ID = 'asset-drawer-body';

const useAssetDetailsStore = (): [AssetDetailsSlice['assetDetails'], AssetDetailsSlice['setAssetDetails']] =>
  useWalletStore((state) => [state?.assetDetails, state.setAssetDetails]);

const MAX_ASSET_ACTIVITIES_POPUP = 3;
const MAX_ASSET_ACTIVITIES_BROWSER = 10;

const renderFooter = (click: () => void, label: string, popupView?: boolean) => (
  <div className={classnames(styles.foorteContainer, { [styles.foorteContainerPopup]: popupView })}>
    <Button id={buttonIds.tokenBtnId} onClick={click} className={styles.foorteButton}>
      {label}
    </Button>
  </div>
);

const renderAssetDetails =
  (Component: React.ComponentType<AssetDetailsProps>) =>
  ({ fiatPrice, popupView, fiatCode }: { fiatCode: string; fiatPrice?: number; popupView?: boolean }) => {
    const [walletActivitiesObservable, setWalletActivitiesObservable] = useState<FetchWalletActivitiesReturn>();
    const redirectToTransactions = useRedirection(walletRoutePaths.activity);
    const { getWalletActivitiesObservable, walletActivities, walletActivitiesStatus } = useWalletStore();
    const [asset, setAssetDetails] = useAssetDetailsStore();
    const backgroundServices = useBackgroundServiceAPIContext();
    const { fiatCurrency } = useCurrencyStore();
    const analytics = useAnalyticsContext();

    const sendAnalytics = useCallback(() => {
      analytics.sendEvent({
        category: AnalyticsEventCategories.VIEW_TOKENS,
        action: AnalyticsEventActions.CLICK_EVENT,
        name: popupView
          ? AnalyticsEventNames.ViewTokens.VIEW_TOKEN_TX_DETAILS_POPUP
          : AnalyticsEventNames.ViewTokens.VIEW_TOKEN_TX_DETAILS_BROWSER
      });
    }, [analytics, popupView]);

    const fetchWalletActivities = useCallback(async () => {
      const result =
        fiatCurrency &&
        fiatPrice &&
        (await getWalletActivitiesObservable({
          fiatCurrency,
          cardanoFiatPrice: fiatPrice,
          sendAnalytics
        }));
      setWalletActivitiesObservable(result);
    }, [fiatCurrency, getWalletActivitiesObservable, sendAnalytics, fiatPrice]);

    useEffect(() => {
      fetchWalletActivities();
    }, [fetchWalletActivities]);

    useEffect(() => {
      const subscription = walletActivitiesObservable?.subscribe();
      return () => {
        if (subscription) subscription.unsubscribe();
      };
    }, [walletActivitiesObservable]);

    const setVisibility = () => setAssetDetails();

    useEffect(() => {
      const drawerElement = document.querySelector('.ant-drawer-body');
      if (drawerElement) {
        drawerElement?.setAttribute('id', ASSET_DRAWER_BODY_ID);
      }
    }, []);

    const handleOpenTransaction = async () => {
      if (popupView) {
        await backgroundServices.handleOpenBrowser({ section: BrowserViewSections.TRANSACTION });
      } else {
        setVisibility();
        redirectToTransactions();
      }
    };

    const maxAssetDisplayedTxs = popupView ? MAX_ASSET_ACTIVITIES_POPUP : MAX_ASSET_ACTIVITIES_BROWSER;

    const activitiesList = flatten(
      walletActivities
        .slice(0, maxAssetDisplayedTxs)
        .map((el, index, arr) => {
          const numberOfPrevItems = flatten(arr.slice(0, index).map((i) => i.items)).length;
          return el.items.slice(
            0,
            numberOfPrevItems < maxAssetDisplayedTxs ? maxAssetDisplayedTxs - numberOfPrevItems : 0
          );
        })
        .filter((items) => items.length > 0)
    );

    return (
      <Component
        balance={asset?.balance}
        assetSymbol={asset?.ticker}
        fiatPrice={asset?.price}
        fiatCode={fiatCode}
        fiatPriceVariation={asset?.variation || '-'}
        balanceInFiat={asset?.fiatBalance === '-' ? asset?.fiatBalance : `${asset?.fiatBalance}`}
        activityList={activitiesList}
        activityListStatus={walletActivitiesStatus}
        onViewAllClick={handleOpenTransaction}
        popupView={popupView}
        isDrawerView
      />
    );
  };

const Details = renderAssetDetails(AssetDetails);

type AssetDetailsDrawerProps = {
  fiatCode: string;
  fiatPrice?: number;
  openSendDrawer: (id: string) => void;
  popupView?: boolean;
  isBalanceDataFetchedCorrectly: boolean;
};

export const AssetDetailsDrawer = ({
  fiatCode,
  fiatPrice,
  openSendDrawer,
  popupView = false
}: AssetDetailsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { blockchainProvider } = useWalletStore();
  const [asset, setAssetDetails] = useAssetDetailsStore();

  const isVisible = !!asset;

  const setVisibility = useCallback(() => setAssetDetails(), [setAssetDetails]);

  useEffect(() => {
    const drawerElement = document.querySelector('.ant-drawer-body');
    if (drawerElement) {
      drawerElement.setAttribute('id', ASSET_DRAWER_BODY_ID);
    }
  }, []);

  const handleOpenSend = () => openSendDrawer(asset?.id);

  // Close asset details drawer if network (blockchainProvider) has changed
  useEffect(() => {
    setVisibility();
  }, [blockchainProvider, setVisibility]);

  return (
    <Drawer
      className={styles.drawer}
      navigation={<DrawerNavigation title={t('browserView.assetDetails.title')} onCloseIconClick={setVisibility} />}
      footer={renderFooter(handleOpenSend, t('browserView.assets.send'), popupView)}
      visible={isVisible}
      destroyOnClose
      onClose={setVisibility}
      popupView={popupView}
      closable
    >
      <div className={classnames(styles.container, { [styles.popupContainer]: popupView })}>
        <AssetDrawerTitle logo={asset?.logo} title={asset?.name} code={asset?.ticker} />
        <Details fiatCode={fiatCode} fiatPrice={fiatPrice} popupView={popupView} />
      </div>
    </Drawer>
  );
};
