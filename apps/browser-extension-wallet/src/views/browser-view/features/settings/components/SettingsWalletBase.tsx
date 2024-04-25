/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { DappList as DappListDrawer } from '@views/browser/features/dapp';
import { SettingsCard, SettingsLink, GeneralSettingsDrawer, Collateral } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { NetworkChoiceDrawer } from './NetworkChoiceDrawer';
import { useWalletStore } from '@src/stores';
import { AboutDrawer } from './AboutDrawer';
import { config } from '@src/config';
import { COLLATERAL_AMOUNT_LOVELACES, useCustomSubmitApi, useRedirection } from '@hooks';
import { BrowserViewSections, MessageTypes } from '@lib/scripts/types';
import { useAnalyticsContext, useBackgroundServiceAPIContext } from '@providers';
import { useSearchParams, useObservable, Button } from '@lace/common';
import { walletRoutePaths } from '@routes/wallet-paths';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import uniq from 'lodash/uniq';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { AddressesDiscoveryStatus } from '@lib/communication/addresses-discoverer';
import { CustomSubmitApiDrawer } from './CustomSubmitApiDrawer';

const { Title } = Typography;

export enum SettingsDrawer {
  about = 'about',
  collateral = 'collateral',
  dappList = 'dappList',
  general = 'general',
  networkChoice = 'networkChoice',
  customSubmitApi = 'customSubmitApi'
}

export type SettingsSearchParams<AdditionalDrawers extends string> = {
  activeDrawer?: SettingsDrawer | AdditionalDrawers;
};

interface RenderLocalNodeSlotParams<AdditionalDrawers extends string> {
  activeDrawer: string;
  closeDrawer: () => void;
  openDrawer: (drawer: SettingsDrawer | AdditionalDrawers) => void;
}

export interface SettingsWalletProps<AdditionalDrawers extends string = never> {
  renderLocalNodeSlot?: (params: RenderLocalNodeSlotParams<AdditionalDrawers>) => ReactNode;
  popupView?: boolean;
}

// eslint-disable-next-line complexity
export const SettingsWalletBase = <AdditionalDrawers extends string>({
  renderLocalNodeSlot,
  popupView = false
}: SettingsWalletProps<AdditionalDrawers>): React.ReactElement => {
  const { activeDrawer } = useSearchParams<keyof SettingsSearchParams<AdditionalDrawers>>(['activeDrawer']);
  const redirectToSettings = useRedirection<{ search: SettingsSearchParams<AdditionalDrawers> }>(
    walletRoutePaths.settings
  );
  const openDrawer = useCallback(
    (drawer: SettingsDrawer | AdditionalDrawers) => redirectToSettings({ search: { activeDrawer: drawer } }),
    [redirectToSettings]
  );
  const closeDrawer = useRedirection(walletRoutePaths.settings);

  const { t } = useTranslation();
  const { environmentName, inMemoryWallet, walletInfo, setHdDiscoveryStatus } = useWalletStore();
  const { AVAILABLE_CHAINS } = config();
  const unspendable = useObservable(inMemoryWallet.balance.utxo.unspendable$);

  const hasCollateral = useMemo(() => unspendable?.coins >= COLLATERAL_AMOUNT_LOVELACES, [unspendable?.coins]);
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

  const isNetworkChoiceEnabled = AVAILABLE_CHAINS.length > 1;
  const authorizedAppsEnabled = process.env.USE_DAPP_CONNECTOR === 'true';

  useEffect(() => {
    const openCollateralDrawer = async () => {
      const backgroundStorage = await backgroundServices.getBackgroundStorage();
      if (!backgroundStorage) return;
      if (
        backgroundStorage.message?.type === MessageTypes.OPEN_COLLATERAL_SETTINGS &&
        backgroundStorage.message?.data.section === BrowserViewSections.COLLATERAL_SETTINGS
      ) {
        await backgroundServices.clearBackgroundStorage({ keys: ['message'] });
        openDrawer(SettingsDrawer.collateral);
      }
    };
    openCollateralDrawer();
  }, [backgroundServices, openDrawer]);

  const handleOpenDrawer = (drawer: SettingsDrawer, postHogEvent: PostHogAction) => {
    openDrawer(drawer);
    analytics.sendEventToPostHog(postHogEvent);
  };

  const handleCloseDrawer = (postHogEvent: PostHogAction) => {
    closeDrawer();
    analytics.sendEventToPostHog(postHogEvent);
  };

  const handleOpenNetworkChoiceDrawer = () =>
    handleOpenDrawer(SettingsDrawer.networkChoice, PostHogAction.SettingsNetworkClick);

  const handleOpenDappListDrawer = () =>
    handleOpenDrawer(SettingsDrawer.dappList, PostHogAction.SettingsAuthorizedDappsClick);

  const handleOpenCollateralDrawer = () =>
    handleOpenDrawer(SettingsDrawer.collateral, PostHogAction.SettingsCollateralClick);

  const handleOpenGeneralSettingsDrawer = () =>
    handleOpenDrawer(SettingsDrawer.general, PostHogAction.SettingsYourKeysClick);

  const handleOpenCustomSubmitApiDrawer = () =>
    handleOpenDrawer(SettingsDrawer.customSubmitApi, PostHogAction.SettingsCustomSubmitApiClick);

  const handleCloseNetworkChoiceDrawer = () => handleCloseDrawer(PostHogAction.SettingsNetworkXClick);

  const handleCloseGeneralSettingsDrawer = () => handleCloseDrawer(PostHogAction.SettingsYourKeysShowPublicKeyXClick);

  const handleCloseCustomSubmitApiDrawer = () => handleCloseDrawer(PostHogAction.SettingsCustomSubmitApiXClick);

  const handleSendAnalyticsEvent = (postHogEvent: PostHogAction) => analytics.sendEventToPostHog(postHogEvent);

  const syncButton = (
    <Button
      size="medium"
      className={styles.settingsButton}
      onClick={async () => {
        analytics.sendEventToPostHog(PostHogAction.SettingsWalletHdWalletSyncSyncClick);

        const oldHdAddressesCount = uniq((walletInfo?.addresses ?? []).map(({ index }) => index)).length;
        setHdDiscoveryStatus(AddressesDiscoveryStatus.InProgress);
        try {
          const newAddresses = await inMemoryWallet.discoverAddresses();
          // TODO: script address support LW-9574
          // eslint-disable-next-line unicorn/no-array-callback-reference
          const newHdAddressesCount = uniq(newAddresses.filter(isKeyHashAddress).map(({ index }) => index)).length;
          const newHdWalletAddressesDiscovered = newHdAddressesCount > oldHdAddressesCount;
          setHdDiscoveryStatus(AddressesDiscoveryStatus.Idle);

          if (newHdWalletAddressesDiscovered) {
            analytics.sendEventToPostHog(PostHogAction.SettingsWalletHdWalletSyncSyncNewAddresses);
          }
        } catch {
          setHdDiscoveryStatus(AddressesDiscoveryStatus.Error);
        }
      }}
      block={popupView}
      data-testid="settings-wallet-wallet-sync-cta"
    >
      {t('browserView.settings.wallet.walletSync.ctaLabel')}
    </Button>
  );

  return (
    <>
      <GeneralSettingsDrawer
        visible={activeDrawer === SettingsDrawer.general}
        onClose={handleCloseGeneralSettingsDrawer}
        popupView={popupView}
        sendAnalyticsEvent={handleSendAnalyticsEvent}
      />
      <CustomSubmitApiDrawer
        visible={activeDrawer === SettingsDrawer.customSubmitApi}
        onClose={handleCloseCustomSubmitApiDrawer}
        popupView={popupView}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="wallet-settings-heading">
          {t('browserView.settings.wallet.title')}
        </Title>
        {popupView && (
          <>
            <AboutDrawer visible={activeDrawer === SettingsDrawer.about} onClose={closeDrawer} popupView={popupView} />
            <SettingsLink
              onClick={() => openDrawer(SettingsDrawer.about)}
              description={t('browserView.settings.wallet.about.description')}
              data-testid="settings-wallet-about-link"
            >
              {t('browserView.settings.wallet.about.title')}
            </SettingsLink>
          </>
        )}
        {isNetworkChoiceEnabled && (
          <>
            <NetworkChoiceDrawer
              visible={activeDrawer === SettingsDrawer.networkChoice}
              onClose={handleCloseNetworkChoiceDrawer}
              popupView={popupView}
            />
            <SettingsLink
              onClick={handleOpenNetworkChoiceDrawer}
              description={t('browserView.settings.wallet.network.description')}
              addon={environmentName}
              data-testid="settings-wallet-network-link"
            >
              {t('browserView.settings.wallet.network.title')}
            </SettingsLink>
          </>
        )}
        <SettingsLink
          description={t('browserView.settings.wallet.customSubmitApi.settingsLinkDescription')}
          onClick={handleOpenCustomSubmitApiDrawer}
          addon={
            getCustomSubmitApiForNetwork(environmentName).status
              ? t('browserView.settings.wallet.customSubmitApi.enabled')
              : t('browserView.settings.wallet.customSubmitApi.disabled')
          }
        >
          {t('browserView.settings.wallet.customSubmitApi.settingsLinkTitle')}
        </SettingsLink>
        {authorizedAppsEnabled && (
          <>
            <DappListDrawer
              visible={activeDrawer === SettingsDrawer.dappList}
              onCancelClick={closeDrawer}
              popupView={popupView}
              sendAnalyticsEvent={handleSendAnalyticsEvent}
            />
            <SettingsLink
              onClick={handleOpenDappListDrawer}
              description={t('browserView.settings.wallet.authorizedDApps.description')}
              data-testid="settings-wallet-authorized-dapps-link"
            >
              {t('browserView.settings.wallet.authorizedDApps.title')}
            </SettingsLink>
          </>
        )}
        <SettingsLink
          onClick={handleOpenGeneralSettingsDrawer}
          description={t('browserView.settings.wallet.general.description')}
          data-testid="settings-wallet-general-link"
        >
          {t('browserView.settings.wallet.general.title')}
        </SettingsLink>
        {renderLocalNodeSlot && renderLocalNodeSlot({ activeDrawer, closeDrawer, openDrawer })}
        <SettingsLink
          onClick={handleOpenCollateralDrawer}
          description={t('browserView.settings.wallet.collateral.description')}
          data-testid="settings-wallet-collateral-link"
          addon={
            hasCollateral
              ? t('browserView.settings.wallet.collateral.active')
              : t('browserView.settings.wallet.collateral.inactive')
          }
        >
          {t('browserView.settings.wallet.collateral.title')}
        </SettingsLink>
        <Collateral.CollateralDrawer
          visible={activeDrawer === SettingsDrawer.collateral}
          onClose={closeDrawer}
          hasCollateral={hasCollateral}
          unspendableLoaded={unspendable?.coins !== undefined}
          sendAnalyticsEvent={handleSendAnalyticsEvent}
        />
        <SettingsLink
          description={t('browserView.settings.wallet.walletSync.description')}
          data-testid="settings-wallet-wallet-sync"
          addon={!popupView && syncButton}
        >
          {t('browserView.settings.wallet.walletSync.title')}
        </SettingsLink>
        {popupView && syncButton}
      </SettingsCard>
    </>
  );
};
