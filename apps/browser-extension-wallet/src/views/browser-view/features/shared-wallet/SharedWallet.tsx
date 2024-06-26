import React, { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { AddSharedWalletModal, SharedWalletCreationFlow, AddSharedWalletMainPageFlow } from '@lace/shared-wallets';
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

  const sharedKeys: string = undefined;

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
              navigateToParentFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
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
              onImportSharedWalletClick={() => void 0}
              onKeysGenerateClick={() => void 0}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
