import React, { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import {
  AddSharedWalletModal,
  SharedWalletCreationFlow,
  AddSharedWalletMainPageFlow,
  SharedWalletRestorationFlow
} from '@lace/shared-wallets';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';

export const SharedWallet = (): JSX.Element => {
  const history = useHistory();
  const { walletRepository } = useWalletManager();
  const { walletInfo } = useWalletStore();
  const { page, setBackgroundPage } = useBackgroundPage();

  const [initialWalletName, setInitialWalletName] = useState('');

  useEffect(() => {
    (async () => {
      const wallets = await firstValueFrom(walletRepository.wallets$);
      setInitialWalletName(`Wallet ${wallets.length + 1}`);
    })();
  }, [walletRepository]);

  const sharedKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';

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
        <Route
          exact
          path={walletRoutePaths.sharedWallet.root}
          render={() => (
            <AddSharedWalletMainPageFlow
              onCreateSharedWalletClick={() => history.push(walletRoutePaths.sharedWallet.create)}
              sharedKeys={sharedKeys}
              onImportSharedWalletClick={() => history.push(walletRoutePaths.sharedWallet.import)}
              onKeysGenerateClick={() => void 0}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
