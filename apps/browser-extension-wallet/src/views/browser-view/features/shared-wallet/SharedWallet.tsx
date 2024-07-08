import React, { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import {
  AddSharedWalletMainPageFlow,
  AddSharedWalletModal,
  GenerateSharedKeysFlow,
  LinkedWalletType,
  SharedWalletCreationFlow,
  SharedWalletRestorationFlow
} from '@lace/core';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { WalletType } from '@cardano-sdk/web-extension';

export const SharedWallet = (): JSX.Element => {
  const history = useHistory();
  const { walletRepository, walletManager } = useWalletManager();
  const { walletInfo } = useWalletStore();
  const { page, setBackgroundPage } = useBackgroundPage();

  const [initialWalletName, setInitialWalletName] = useState('');
  const [activeWalletType, setActiveWalletType] = useState<LinkedWalletType>();
  const [sharedKeys, setSharedKeys] = useState<string>();

  useEffect(() => {
    (async () => {
      const wallets = await firstValueFrom(walletRepository.wallets$);
      setInitialWalletName(`Wallet ${wallets.length + 1}`);

      const activeWalletData = await firstValueFrom(walletManager.activeWalletId$);
      if (!activeWalletData) return;
      const activeWallet = wallets.find(({ walletId }) => walletId === activeWalletData.walletId);
      if (!activeWallet || activeWallet.type === WalletType.Script) return;
      setActiveWalletType(activeWallet.type);
    })();
  }, [walletManager.activeWalletId$, walletRepository.wallets$]);

  const generateKeys = async () => {
    const keys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';
    setSharedKeys(keys);
    return keys;
  };

  return (
    <AddSharedWalletModal
      onClose={() => {
        setBackgroundPage();
        history.push(page);
      }}
    >
      <Switch>
        <Route
          exact
          path={walletRoutePaths.sharedWallet.generateKeys}
          render={() => (
            <GenerateSharedKeysFlow
              activeWalletName={walletInfo?.name || ''}
              activeWalletType={activeWalletType}
              generateKeys={generateKeys}
              navigateToParentFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
            />
          )}
        />
        {sharedKeys && (
          <Route
            exact
            path={walletRoutePaths.sharedWallet.create}
            render={() => (
              <SharedWalletCreationFlow
                activeWalletName={walletInfo?.name || ''}
                initialWalletName={initialWalletName}
                navigateToAppHome={() => setBackgroundPage()}
                navigateToStart={() => history.push(walletRoutePaths.sharedWallet.root)}
              />
            )}
          />
        )}
        {sharedKeys && (
          <Route
            exact
            path={walletRoutePaths.sharedWallet.import}
            render={() => (
              <SharedWalletRestorationFlow
                navigateToAppHome={() => setBackgroundPage()}
                navigateToStart={() => history.push(walletRoutePaths.sharedWallet.root)}
              />
            )}
          />
        )}
        <Route
          exact
          path={walletRoutePaths.sharedWallet.root}
          render={() => (
            <AddSharedWalletMainPageFlow
              onCreateSharedWalletClick={() => history.push(walletRoutePaths.sharedWallet.create)}
              sharedKeys={sharedKeys}
              onImportSharedWalletClick={() => history.push(walletRoutePaths.sharedWallet.import)}
              onKeysGenerateClick={() => history.push(walletRoutePaths.sharedWallet.generateKeys)}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
