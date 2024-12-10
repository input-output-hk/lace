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
import { MainLoader } from '@components/MainLoader';
import { useAppInit } from '@hooks';
import { SharedWallet } from '@views/browser/features/shared-wallet';
import { MultiAddressBalanceVisibleModal } from '@views/browser/features/multi-address';
import { useExperimentsContext } from '@providers/ExperimentsProvider';
import { SignMessageDrawer } from '@views/browser/features/sign-message/SignMessageDrawer';
import warningIcon from '@src/assets/icons/browser-view/warning-icon.svg';
import { useBackgroundServiceAPIContext } from '@providers';
import { BackgroundStorage, Message, MessageTypes } from '@lib/scripts/types';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { useTranslation } from 'react-i18next';
import { POPUP_WINDOW_NAMI_TITLE } from '@src/utils/constants';

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
    path: routes.settings,
    component: SettingsLayout
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

const { CHAIN } = config();

/**
 * Queries tabs through `webextension-polyfill` to discard other tabs than the one already focused.
 * Discarding means `freezing` the tab just like in RAM saver browser features. Focusing on different tab again activates it (with page refresh).
 * @param {number} currentTabId - Tab not to discard (freeze)
 */
const discardStaleTabs = async (currentTabId: number) => {
  const allTabs = await tabs.query({ title: 'Lace' });
  const namiTabs = await tabs.query({ title: POPUP_WINDOW_NAMI_TITLE });
  allTabs.push(...namiTabs);
  const isLaceOrigin = allTabs.find((tab) => tab.id === currentTabId);
  if (!isLaceOrigin) return;
  allTabs.forEach(async (tab) => {
    if (currentTabId !== tab.id) await tabs.discard(tab.id);
  });
};

const tabsOnActivatedCallback = (activeInfo: { tabId: number }) => discardStaleTabs(activeInfo.tabId);

// TODO: unify providers and logic to load wallet and such for popup, dapp and browser view in one place
export const BrowserViewRoutes = ({ routesMap = defaultRoutes }: { routesMap?: RouteMap }): React.ReactElement => {
  const {
    walletInfo,
    isWalletLocked,
    setCardanoCoin,
    currentChain,
    setCurrentChain,
    walletState,
    walletType,
    deletingWallet,
    stayOnAllDonePage,
    cardanoWallet,
    initialHdDiscoveryCompleted,
    isSharedWallet
  } = useWalletStore();
  const [{ chainName }] = useAppSettingsContext();
  const { areExperimentsLoading } = useExperimentsContext();
  const [isLoadingWalletInfo, setIsLoadingWalletInfo] = useState(true);
  const { page, setBackgroundPage } = useBackgroundPage();
  const { t } = useTranslation();

  const location = useLocation<{ background?: Location<unknown> }>();

  const currentRoutes = isSharedWallet ? routesMap.filter((route) => route.path !== routes.staking) : routesMap;
  const backgroundServices = useBackgroundServiceAPIContext();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(console.error);
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
    const isCreatingWallet = [routes.newWallet.root, routes.sharedWallet.root].some((path) =>
      location.pathname.startsWith(path)
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
    () => !areExperimentsLoading && !isLoadingWalletInfo && walletInfo && walletState && initialHdDiscoveryCompleted,
    [areExperimentsLoading, isLoadingWalletInfo, walletInfo, walletState, initialHdDiscoveryCompleted]
  );

  const isOnboarding = useMemo(
    () =>
      !areExperimentsLoading &&
      !isLoadingWalletInfo &&
      !deletingWallet &&
      (cardanoWallet === null || stayOnAllDonePage),
    [areExperimentsLoading, isLoadingWalletInfo, deletingWallet, cardanoWallet, stayOnAllDonePage]
  );

  useEffect(() => {
    if (isLoaded || isOnboarding) {
      document.querySelector('#preloader')?.remove();
    }
  }, [isLoaded, isOnboarding]);

  if (namiMigration?.mode === 'nami' && !isLoadingWalletInfo && cardanoWallet) {
    return (
      <Lock
        message={t('general.lock.namiMode.message')}
        description={t('general.lock.namiMode.description')}
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
          {currentRoutes.map((route) => (
            <Route key={route.path} path={route.path} component={route.component} />
          ))}
          <Route path="*" render={() => <Redirect to={routes.assets} />} />
        </Switch>
        {page && (
          <Switch>
            <Route path={routes.newWallet.root} component={MultiWallet} />
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
