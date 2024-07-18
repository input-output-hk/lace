import React, { useEffect, useState } from 'react';
import { firstValueFrom } from 'rxjs';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import {
  AddSharedWalletMainPageFlow,
  AddSharedWalletModal,
  CoSigner,
  GenerateSharedWalletKeyFlow,
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
  const { walletRepository, generateSharedWalletKey, saveSharedWalletKey, createInMemorySharedWallet } =
    useWalletManager();
  const { walletInfo, cardanoWallet } = useWalletStore();
  const { page, setBackgroundPage } = useBackgroundPage();

  const [sharedWalletKey, setSharedWalletKey] = useState<Wallet.Crypto.Bip32PublicKeyHex>();
  const [initialWalletName, setInitialWalletName] = useState('');
  const [activeWalletType, setActiveWalletType] = useState<LinkedWalletType>();

  useEffect(() => {
    (async () => {
      const wallets = await firstValueFrom(walletRepository.wallets$);
      setInitialWalletName(`Wallet ${wallets.length + 1}`);

      const activeWalletId = cardanoWallet.source.wallet.walletId;
      const activeWallet = wallets.find(({ walletId }) => walletId === activeWalletId);
      setSharedWalletKey(activeWallet.metadata.multiSigExtendedPublicKey);
      if (!activeWallet || activeWallet.type === WalletType.Script) return;
      setActiveWalletType(activeWallet.type);
    })();
  }, [cardanoWallet.source.wallet.walletId, walletRepository]);

  const handleCreateWallet = async (data: CreateWalletParams) => {
    const activeWalletId = cardanoWallet.source.wallet.walletId;

    await createInMemorySharedWallet({
      name: data.name,
      chainId: DEFAULT_CHAIN_ID,
      ownSignerWalletId: activeWalletId,
      quorumRules: data.quorumRules,
      coSigners: data.coSigners,
      sharedWalletKey
    });
  };

  const generateKey = async (enteredPassword: string) => {
    if (sharedWalletKey) return sharedWalletKey;
    const key = await generateSharedWalletKey(enteredPassword);
    await saveSharedWalletKey(key);
    setSharedWalletKey(key);
    return key;
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
            <GenerateSharedWalletKeyFlow
              activeWalletName={walletInfo?.name || ''}
              activeWalletType={activeWalletType}
              generateKey={generateKey}
              navigateToParentFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
            />
          )}
        />
        {sharedWalletKey && (
          <Route
            exact
            path={walletRoutePaths.sharedWallet.create}
            render={() => (
              <SharedWalletCreationFlow
                activeWalletName={walletInfo?.name || ''}
                initialWalletName={initialWalletName}
                navigateToAppHome={() => setBackgroundPage()}
                exitTheFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
                sharedWalletKey={sharedWalletKey}
                onCreateSharedWallet={handleCreateWallet}
              />
            )}
          />
        )}
        {sharedWalletKey && (
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
              sharedWalletKey={sharedWalletKey}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
