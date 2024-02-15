import React, { useEffect } from 'react';
import flatten from 'lodash/flatten';
import { AssetDetails } from './AssetDetails';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes/wallet-paths';
import { BrowserViewSections } from '@lib/scripts/types';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useWalletStore } from '@src/stores';
import { useWalletActivities } from '@hooks/useWalletActivities';

export const ASSET_DRAWER_BODY_ID = 'asset-drawer-body';

const MAX_ASSET_ACTIVITIES = 3;

export const AssetDetailsContainer = ({
  popupView,
  fiatCode
}: {
  fiatCode: string;
  popupView?: boolean;
}): React.ReactElement => {
  const redirectToTransactions = useRedirection(walletRoutePaths.activity);
  const { assetDetails, setAssetDetails } = useWalletStore();
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const { walletActivities, walletActivitiesStatus } = useWalletActivities();

  const setVisibility = () => setAssetDetails();

  useEffect(() => {
    const drawerElement = document.querySelector('.ant-drawer-body');
    if (drawerElement) {
      drawerElement?.setAttribute('id', ASSET_DRAWER_BODY_ID);
    }
  }, []);

  const handleOpenTransaction = async () => {
    analytics.sendEventToPostHog(PostHogAction.TokenTokenDetailViewAllClick);
    if (popupView) {
      await backgroundServices.handleOpenBrowser({ section: BrowserViewSections.TRANSACTION });
    } else {
      setVisibility();
      redirectToTransactions();
    }
  };

  const activitiesList = flatten(
    walletActivities
      .slice(0, MAX_ASSET_ACTIVITIES)
      .map((el, index, arr) => {
        const numberOfPrevItems = flatten(arr.slice(0, index).map((i) => i.items)).length;
        return el.items.slice(
          0,
          numberOfPrevItems < MAX_ASSET_ACTIVITIES ? MAX_ASSET_ACTIVITIES - numberOfPrevItems : 0
        );
      })
      .filter((items) => items.length > 0)
  );

  return (
    <AssetDetails
      balance={assetDetails?.balance}
      assetSymbol={assetDetails?.ticker}
      fiatPrice={assetDetails?.price}
      policyId={assetDetails?.policyId}
      fingerprint={assetDetails?.fingerprint}
      fiatCode={fiatCode}
      fiatPriceVariation={assetDetails?.variation || '-'}
      balanceInFiat={assetDetails?.fiatBalance === '-' ? assetDetails?.fiatBalance : `${assetDetails?.fiatBalance}`}
      activityList={activitiesList}
      activityListStatus={walletActivitiesStatus}
      onViewAllClick={handleOpenTransaction}
      popupView={popupView}
      isDrawerView
    />
  );
};
