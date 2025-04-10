/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
import React, { useEffect, useState, ComponentType, useMemo } from 'react';
import { Location } from 'history';
import { Wallet } from '@lace/cardano';
import { Switch, Redirect, Route, useLocation } from 'react-router-dom';
import { useWalletStore } from '../../../stores';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { AddressBook } from '../features/adress-book';
import { ActivityLayout } from '../features/activity';
import { StakingContainer } from '../features/staking';
import { StakingWarningModals } from '../features/staking/components/StakingModals';
import { WalletSetup } from '../features/wallet-setup';
import { AssetsView } from '../features/assets';
import { SettingsLayout } from '../features/settings';
import { Lock } from '../components/Lock';
import { NftsLayout } from '../features/nfts';
import { getValueFromLocalStorage, onStorageChangeEvent } from '@src/utils/local-storage';
import { tabs } from 'webextension-polyfill';
import { useEnterKeyPress } from '@hooks/useEnterKeyPress';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { config } from '@src/config';
import { Portal } from '../features/wallet-setup/components/Portal';
import { MultiWallet } from '../features/multi-wallet';
import { MultiWallet as BitcoinMultiWallet } from '../../bitcoin-mode/features/multi-wallet/MultiWallet';
import { MainLoader } from '@components/MainLoader';
import { useAppInit } from '@hooks';
import { SharedWallet } from '@views/browser/features/shared-wallet';
import { MultiAddressBalanceVisibleModal } from '@views/browser/features/multi-address';
import { SignMessageDrawer } from '@views/browser/features/sign-message/SignMessageDrawer';
import warningIcon from '@src/assets/icons/browser-view/warning-icon.svg';
import LaceLogoMark from '@src/assets/branding/lace-logo-mark.svg';
import { useBackgroundServiceAPIContext } from '@providers';
import { BackgroundStorage, Message, MessageTypes } from '@lib/scripts/types';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { Trans, useTranslation } from 'react-i18next';
import { POPUP_WINDOW_NAMI_TITLE } from '@src/utils/constants';
import { DAppExplorer } from '@views/browser/features/dapp/explorer/components/DAppExplorer';
import { useFatalError } from '@hooks/useFatalError';
import { Crash } from '@components/ErrorBoundary';
import { useIsPosthogClientInitialized } from '@providers/PostHogClientProvider/useIsPosthogClientInitialized';
import { logger } from '@lace/common';
import { VotingLayout } from '../features/voting-beta';
import { catchAndBrandExtensionApiError } from '@utils/catch-and-brand-extension-api-error';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';

export const defaultRoutes: RouteMap = [
  {
    path: routes.assets,
    component: AssetsView
  },
  {
    path: routes.addressBook,
    component: AddressBook
  },
  {
    path: routes.activity,
    component: ActivityLayout
  },
  {
    path: routes.staking,
    component: StakingContainer
  },
  {
    path: routes.signMessage,
    component: SignMessageDrawer
  },
  {
    path: routes.voting,
    component: VotingLayout
  },
  {
    path: routes.settings,
    component: SettingsLayout
  },
  {
    path: routes.dapps,
    component: DAppExplorer
  },
  {
    path: routes.nfts,
    component: NftsLayout
  }
];

type RouteMap = {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
}[];

const { CHAIN, GOV_TOOLS_URLS } = config();

/**
 * Queries tabs through `webextension-polyfill` to discard other tabs than the one already focused.
 * Discarding means `freezing` the tab just like in RAM saver browser features. Focusing on different tab again activates it (with page refresh).
 * @param {number} currentTabId - Tab not to discard (freeze)
 */
const discardStaleTabs = async (currentTabId: number) => {
  const allTabs = [
    ...(await catchAndBrandExtensionApiError(tabs.query({ title: 'Lace' }), 'Failed to query for stale lace tabs')),
    ...(await catchAndBrandExtensionApiError(
      tabs.query({ title: POPUP_WINDOW_NAMI_TITLE }),
      'Failed to query for stale nami mode tabs'
    ))
  ];
  const isLaceOrigin = allTabs.find((tab) => tab.id === currentTabId);
  if (!isLaceOrigin) return;
  allTabs.forEach((tab) => {
    if (currentTabId === tab.id) return;
    void catchAndBrandExtensionApiError(tabs.discard(tab.id), 'Failed to discard stale tab');
  });
};

const tabsOnActivatedCallback = (activeInfo: { tabId: number }) => discardStaleTabs(activeInfo.tabId);

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place
export const BrowserViewRoutes = ({ routesMap = defaultRoutes }: { routesMap?: RouteMap }): React.ReactElement => {
  const {
    walletInfo,
    isWalletLocked,
    walletDisplayInfo,
    setCardanoCoin,
    currentChain,
    setCurrentChain,
    walletState,
    walletType,
    deletingWallet,
    stayOnAllDonePage,
    cardanoWallet,
    initialHdDiscoveryCompleted,
    isSharedWallet,
    environmentName
  } = useWalletStore();
  const [{ chainName }] = useAppSettingsContext();
  const [isLoadingWalletInfo, setIsLoadingWalletInfo] = useState(true);
  const { page, setBackgroundPage } = useBackgroundPage();
  const { t } = useTranslation();
  const posthogClientInitialized = useIsPosthogClientInitialized();
  const location = useLocation<{ background?: Location<unknown> }>();
  const isVotingCenterEnabled = !!GOV_TOOLS_URLS[environmentName];

  const availableRoutes = routesMap.filter((route) => {
    if (route.path === routes.staking && isSharedWallet) return false;
    if (route.path === routes.voting && !isVotingCenterEnabled) return false;
    return true;
  });

  const backgroundServices = useBackgroundServiceAPIContext();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(logger.error);
  }, []);

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }: Message): void => {
      if (type === MessageTypes.CHANGE_MODE && data.mode !== namiMigration?.mode) {
        const migration: BackgroundStorage['namiMigration'] = {
          ...namiMigration,
          mode: data.mode
        };

        setNamiMigration(migration);
      }
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, namiMigration]);

  useEffect(() => {
    const isCreatingWallet = [routes.newBitcoinWallet.root, routes.newWallet.root, routes.sharedWallet.root].some(
      (path) => location.pathname.startsWith(path)
    );
    if (page === undefined) {
      if (isCreatingWallet) {
        setBackgroundPage({ pathname: '/assets', search: '', hash: '', state: undefined });
      }
    } else if (!isCreatingWallet) {
      setBackgroundPage();
    }
  }, [location, page, setBackgroundPage]);

  useAppInit();
  useEnterKeyPress();

  // Register event listeners
  useEffect(() => {
    // This allows locking/unlocking the browser view when locked from the popup.
    onStorageChangeEvent(['lock'], 'reload', 'delete');
    onStorageChangeEvent(['lock'], 'reload', 'create');

    // This allows updating the browser view current chain when changed from the popup without reloading
    onStorageChangeEvent(
      ['appSettings'],
      () => {
        const appSettings = getValueFromLocalStorage('appSettings');
        setCurrentChain(appSettings?.chainName || CHAIN);
      },
      'change'
    );
  }, [setCurrentChain]);

  useEffect(() => {
    setCardanoCoin(currentChain || Wallet.Cardano.ChainIds[chainName]);
    setIsLoadingWalletInfo(false);
  }, [currentChain, chainName, setCardanoCoin]);

  useEffect(() => {
    const isHardwareWallet = Wallet.AVAILABLE_WALLETS.includes(walletType as Wallet.HardwareWallets);
    if (isHardwareWallet) {
      tabs.onActivated.addListener(tabsOnActivatedCallback);
    }
    return () => {
      if (isHardwareWallet) {
        tabs.onActivated.addListener(tabsOnActivatedCallback);
      }
    };
  });

  const isLoaded = useMemo(
    () =>
      !!walletDisplayInfo &&
      posthogClientInitialized &&
      !isLoadingWalletInfo &&
      walletInfo &&
      walletState &&
      initialHdDiscoveryCompleted,
    [
      posthogClientInitialized,
      isLoadingWalletInfo,
      walletInfo,
      walletState,
      initialHdDiscoveryCompleted,
      walletDisplayInfo
    ]
  );

  const isOnboarding = useMemo(
    () =>
      posthogClientInitialized &&
      !isLoadingWalletInfo &&
      !deletingWallet &&
      (cardanoWallet === null || stayOnAllDonePage),
    [posthogClientInitialized, isLoadingWalletInfo, deletingWallet, cardanoWallet, stayOnAllDonePage]
  );

  const isInNamiMode = useMemo(
    () => namiMigration?.mode === 'nami' && !isLoadingWalletInfo && cardanoWallet,
    [cardanoWallet, isLoadingWalletInfo, namiMigration?.mode]
  );

  const fatalError = useFatalError();

  useEffect(() => {
    if (isLoaded || isOnboarding || isInNamiMode || fatalError) {
      removePreloaderIfExists();
    }
  }, [isLoaded, isOnboarding, isInNamiMode, fatalError]);

  if (fatalError) {
    return <Crash />;
  }

  if (isInNamiMode) {
    return (
      <Lock
        message={t('general.lock.namiMode.message')}
        description={
          <Trans
            i18nKey="general.lock.namiMode.description"
            components={[<img key="lace-logo" src={LaceLogoMark} width="22" />]}
          />
        }
        icon={warningIcon}
      />
    );
  }

  if (isWalletLocked()) {
    return (
      <Portal>
        <Lock />
      </Portal>
    );
  }

  if (isOnboarding) {
    return (
      <Switch>
        <Route path={'/setup'} component={WalletSetup} />
        <Route path="*" render={() => <Redirect to={'/setup'} />} />
      </Switch>
    );
  }

  if (isLoaded) {
    return (
      <>
        <Switch location={page || location}>
          {availableRoutes.map((route) => (
            <Route key={route.path} path={route.path} component={route.component} />
          ))}
          <Route path="*" render={() => <Redirect to={routes.assets} />} />
        </Switch>
        {page && (
          <Switch>
            <Route path={routes.newWallet.root} component={MultiWallet} />
            <Route path={routes.newBitcoinWallet.root} component={BitcoinMultiWallet} />
            <Route path={routes.sharedWallet.root} component={SharedWallet} />
          </Switch>
        )}
        <StakingWarningModals />
        <MultiAddressBalanceVisibleModal />
      </>
    );
  }

  return <MainLoader />;
};
