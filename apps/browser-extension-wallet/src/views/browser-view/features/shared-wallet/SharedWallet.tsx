import React, { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import {
  AddSharedWalletMainPageFlow,
  AddSharedWalletModal,
  CoSigner,
  GenerateSharedKeysFlow,
  LinkedWalletType,
  QuorumOptionValue,
  SharedWalletCreationFlow,
  SharedWalletRestorationFlow
} from '@lace/core';
import { useBackgroundPage } from '@providers/BackgroundPageProvider';
import { walletRoutePaths } from '@routes';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { WalletType } from '@cardano-sdk/web-extension';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';

const { CHAIN } = config();
const DEFAULT_CHAIN_ID = Wallet.Cardano.ChainIds[CHAIN];

type CreateWalletParams = {
  coSigners: CoSigner[];
  name: string;
  quorumRules: QuorumOptionValue;
};

export const SharedWallet = (): JSX.Element => {
  const history = useHistory();
  const { walletRepository, generateSharedWalletKey, createInMemorySharedWallet } = useWalletManager();
  const { walletInfo, cardanoWallet } = useWalletStore();
  const { page, setBackgroundPage } = useBackgroundPage();

  const [sharedKey, setSharedKey] = useState<Wallet.Crypto.Bip32PublicKeyHex>();
  const [initialWalletName, setInitialWalletName] = useState('');
  const [activeWalletType, setActiveWalletType] = useState<LinkedWalletType>();

  useEffect(() => {
    (async () => {
      const wallets = await firstValueFrom(walletRepository.wallets$);
      setInitialWalletName(`Wallet ${wallets.length + 1}`);

      const activeWalletId = cardanoWallet.source.wallet.walletId;
      const activeWallet = wallets.find(({ walletId }) => walletId === activeWalletId);
      setSharedKey(activeWallet.metadata.extendedAccountPublicKey);
      if (!activeWallet || activeWallet.type === WalletType.Script) return;
      setActiveWalletType(activeWallet.type);
    })();
  }, [cardanoWallet.source.wallet.walletId, walletRepository]);

  const handleCreateWallet = async (data: CreateWalletParams) => {
    const activeWalletId = cardanoWallet.source.wallet.walletId;

    const publicKeys = data.coSigners.map(({ keys }: CoSigner) => Wallet.Crypto.Bip32PublicKeyHex(keys));

    await createInMemorySharedWallet({
      name: data.name,
      chainId: DEFAULT_CHAIN_ID,
      publicKeys,
      ownSignerWalletId: activeWalletId
    });
  };

  const generateKeys = async (enteredPassword: string) => {
    if (sharedKey) return sharedKey;
    const sharedWalletKey = await generateSharedWalletKey(enteredPassword, cardanoWallet.source.wallet.walletId);
    setSharedKey(sharedWalletKey);
    return sharedWalletKey;
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
        {sharedKey && (
          <Route
            exact
            path={walletRoutePaths.sharedWallet.create}
            render={() => (
              <SharedWalletCreationFlow
                activeWalletName={walletInfo?.name || ''}
                initialWalletName={initialWalletName}
                navigateToAppHome={() => setBackgroundPage()}
                exitTheFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
                sharedKeys={sharedKey}
                onCreateSharedWallet={handleCreateWallet}
              />
            )}
          />
        )}
        {sharedKey && (
          <Route
            exact
            path={walletRoutePaths.sharedWallet.import}
            render={() => (
              <SharedWalletRestorationFlow
                exitTheFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
                navigateToAppHome={() => setBackgroundPage()}
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
              onImportSharedWalletClick={() => history.push(walletRoutePaths.sharedWallet.import)}
              onKeysGenerateClick={() => history.push(walletRoutePaths.sharedWallet.generateKeys)}
              sharedKeys={sharedKey}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
