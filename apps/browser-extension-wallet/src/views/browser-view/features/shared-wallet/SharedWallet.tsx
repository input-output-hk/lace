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
import { Wallet } from '@lace/cardano';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

type CreateWalletParams = {
  coSigners: CoSigner[];
  name: string;
  quorumRules: QuorumOptionValue;
};

export const SharedWallet = (): JSX.Element => {
  const analytics = useAnalyticsContext();
  const history = useHistory();
  const { walletRepository, generateSharedWalletKey, saveSharedWalletKey, createInMemorySharedWallet } =
    useWalletManager();
  const { walletInfo, cardanoWallet, environmentName } = useWalletStore();
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
      chainId: Wallet.Cardano.ChainIds[environmentName],
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
              onGenerateKeys={() => analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateKeyClick)}
              onCopyKeys={() => analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateCopyKeyClick)}
              onClose={async () => await analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateCloseClick)}
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
                onWalletNameNextClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateWalletNameNextClick);
                }}
                onAddCosignersNextClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateAddCosignersNextClick);
                }}
                onImportantInfoNextClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateImportantInfoContinueClick);
                }}
                onImportantInfoBackClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateImportantInfoBackClick);
                }}
                onDefineQuorumNextClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateDefineQuorumNextClick);
                }}
                onDefineQuorumDownloadClick={() => {
                  analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateDefineQuorumDownloadClick);
                }}
                onOpenSharedWalletClick={() => {
                  analytics.sendEventToPostHog(
                    PostHogAction.SharedWalletsCreateShareWalletDetailsOpenSharedWalletClick
                  );
                }}
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
                onRestoreSharedWallet={async (data: CreateWalletParams) => {
                  await analytics.sendEventToPostHog(PostHogAction.SharedWalletsLocateWalletOpenWalletClick);
                  await handleCreateWallet(data);
                }}
                sharedKeys={sharedWalletKey}
                exitTheFlow={() => history.push(walletRoutePaths.sharedWallet.root)}
                navigateToAppHome={() => setBackgroundPage()}
                onImportJsonError={async () =>
                  await analytics.sendEventToPostHog(PostHogAction.SharedWalletsLocateWalletImportJsonError)
                }
              />
            )}
          />
        )}
        <Route
          exact
          path={walletRoutePaths.sharedWallet.root}
          render={() => (
            <AddSharedWalletMainPageFlow
              onCreateSharedWalletClick={async () => {
                await analytics.sendEventToPostHog(PostHogAction.SharedWalletsCreateClick);
                history.push(walletRoutePaths.sharedWallet.create);
              }}
              onImportSharedWalletClick={async () => {
                await analytics.sendEventToPostHog(PostHogAction.SharedWalletsConnectClick);
                history.push(walletRoutePaths.sharedWallet.import);
              }}
              onKeysGenerateClick={async () => {
                await analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateClick);
                history.push(walletRoutePaths.sharedWallet.generateKeys);
              }}
              sharedWalletKey={sharedWalletKey}
            />
          )}
        />
        <Redirect from="/" to={walletRoutePaths.sharedWallet.root} />
      </Switch>
    </AddSharedWalletModal>
  );
};
