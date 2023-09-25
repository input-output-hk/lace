/* eslint-disable no-magic-numbers */
import React, { useEffect, useState, ComponentType } from 'react';
import { Wallet } from '@lace/cardano';
import { Switch, Redirect, Route } from 'react-router-dom';
import { useWalletStore } from '../../../stores';
import { walletRoutePaths as routes } from '@routes/wallet-paths';
import { AddressBook } from '../features/adress-book';
import { ActivityLayout } from '../features/activity';
import { StakingContainer } from '../features/staking';
import { StakingWarningModals } from '../features/staking/components/StakingModals';
import { VotingLayout } from '../features/voting';
import { WalletSetup } from '../features/wallet-setup';
import { AssetsView } from '../features/assets';
import { SettingsLayout } from '../features/settings';
import { Lock } from '../components/Lock';
import { useWalletManager } from '@src/hooks/useWalletManager';
import { NftsLayout } from '../features/nfts';
import { getValueFromLocalStorage, onStorageChangeEvent } from '@src/utils/local-storage';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { runtime, tabs } from 'webextension-polyfill';
import debounce from 'lodash/debounce';
import { useEnterKeyPress } from '@hooks/useEnterKeyPress';
import { useAppSettingsContext } from '@providers/AppSettings';
import { config } from '@src/config';
import { Portal } from '../features/wallet-setup/components/Portal';
import { MainLoader } from '@components/MainLoader';
import { useAppInit } from '@hooks';
import { DappBetaModal } from '../features/dapp';

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
    path: routes.voting,
    component: VotingLayout
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
    inMemoryWallet,
    setWalletManagerUi,
    setKeyAgentData,
    keyAgentData,
    setCardanoCoin,
    currentChain,
    setCurrentChain,
    getKeyAgentType,
    addressesDiscoveryCompleted
  } = useWalletStore();
  const { loadWallet } = useWalletManager();
  const [{ chainName }] = useAppSettingsContext();
  const [isLoadingWalletInfo, setIsLoadingWalletInfo] = useState(true);

  useAppInit();
  useEnterKeyPress();

  // Register event listeners
  useEffect(() => {
    // This allows locking/unlocking the browser view when locked from the popup.
    onStorageChangeEvent(['keyAgentData'], 'reload', 'delete');
    onStorageChangeEvent(['keyAgentData'], 'reload', 'create');

    // This allows updating the browser view current chain when changed from the popup without reloading
    onStorageChangeEvent(
      ['keyAgentData'],
      () => {
        const appSettings = getValueFromLocalStorage('appSettings');
        setCurrentChain(appSettings?.chainName || CHAIN);
      },
      'change'
    );
  }, [setCurrentChain]);

  useEffect(() => {
    setIsLoadingWalletInfo(true);
    // try to get key agent data from local storage if exist and initialize state
    const keyAgentFromStorage = getValueFromLocalStorage('keyAgentData');
    setKeyAgentData(keyAgentFromStorage);
    setCardanoCoin(currentChain || Wallet.Cardano.ChainIds[chainName]);
    setIsLoadingWalletInfo(false);
  }, [currentChain, chainName, setKeyAgentData, setCardanoCoin]);

  useEffect(() => {
    let time: NodeJS.Timeout;
    const resetTimer = debounce(() => {
      clearTimeout(time);
      time = setTimeout(() => {
        window.addEventListener('focus', () => {
          const walletManager = new WalletManagerUi(
            { walletName: process.env.WALLET_NAME },
            { logger: console, runtime }
          );
          setWalletManagerUi(walletManager);
        });
      }, 600_000);
    }, 500);
    window.addEventListener('load', resetTimer);
    document.addEventListener('onmousemove', resetTimer);
    document.addEventListener('onkeydown', resetTimer);
    () => resetTimer();
  }, [setWalletManagerUi]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const keyAgentType = getKeyAgentType();
    const isHardwareWallet = Wallet.AVAILABLE_WALLETS.includes(keyAgentType as Wallet.HardwareWallets);
    if (isHardwareWallet) {
      tabs.onActivated.addListener(tabsOnActivatedCallback);
    }
    return () => {
      if (isHardwareWallet) {
        tabs.onActivated.addListener(tabsOnActivatedCallback);
      }
    };
  });

  if (isWalletLocked()) {
    return (
      <Portal>
        <Lock />
      </Portal>
    );
  }

  if (!keyAgentData && !isLoadingWalletInfo) {
    return (
      <Switch>
        <Route path={'/setup'} component={WalletSetup} />
        <Route path="*" render={() => <Redirect to={'/setup'} />} />
      </Switch>
    );
  }

  if (!isLoadingWalletInfo && keyAgentData && walletInfo && inMemoryWallet) {
    return (
      <>
        {!addressesDiscoveryCompleted && <MainLoader overlay />}
        <Switch>
          {routesMap.map((route) => (
            <Route key={route.path} path={route.path} component={route.component} />
          ))}
          <Route path="*" render={() => <Redirect to={routes.assets} />} />
        </Switch>
        <StakingWarningModals />
        <DappBetaModal />
      </>
    );
  }

  return <MainLoader />;
};
