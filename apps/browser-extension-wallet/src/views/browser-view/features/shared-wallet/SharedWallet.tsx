import React, { useCallback, useEffect, useState } from 'react';
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
import { useCurrentWallet, useWalletManager } from '@hooks';
import { useWalletStore } from '@stores';
import { WalletConflictError, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import * as KeyManagement from '@cardano-sdk/key-management';
import { WalletConflictModal } from './components/NonRegisteredUserModal/WalletConflictModal';
import { Cardano } from '@cardano-sdk/core';

type CreateWalletParams = {
  coSigners: CoSigner[];
  name: string;
  quorumRules: QuorumOptionValue;
};

export const SharedWallet = (): JSX.Element => {
  const analytics = useAnalyticsContext();
  const history = useHistory();
  const { walletRepository, generateSharedWalletKey, createMultiSigAccount, createInMemorySharedWallet } =
    useWalletManager();
  const { walletInfo, cardanoWallet, environmentName, isHardwareWallet, isSharedWallet } = useWalletStore();
  const { page, setBackgroundPage } = useBackgroundPage();

  const [sharedWalletKey, setSharedWalletKey] = useState<Cardano.Cip1854ExtendedAccountPublicKey>();
  const [initialWalletName, setInitialWalletName] = useState('');
  const [isWalletConflictModalVisible, setIsWalletConflictModalVisible] = useState(false);
  const activeWallet = useCurrentWallet();

  useEffect(() => {
    (async () => {
      const wallets = await firstValueFrom(walletRepository.wallets$);
      setInitialWalletName(`Wallet ${wallets.length + 1}`);

      if (!activeWallet || activeWallet.type === WalletType.Script) return;
      const parentMultiSigAccount = activeWallet.accounts.find(
        ({ accountIndex, purpose }) => accountIndex === 0 && purpose === KeyManagement.KeyPurpose.MULTI_SIG
      );
      setSharedWalletKey(
        Cardano.Cip1854ExtendedAccountPublicKey.fromBip32PublicKeyHex(parentMultiSigAccount?.extendedAccountPublicKey)
      );
    })();
  }, [activeWallet, cardanoWallet.source.wallet.walletId, walletRepository]);

  useEffect(() => {
    if (isSharedWallet) setBackgroundPage();
  }, [isSharedWallet, setBackgroundPage]);

  const handleCreateWallet = useCallback(
    async (data: CreateWalletParams) => {
      const activeWalletId = cardanoWallet.source.wallet.walletId;

      try {
        await createInMemorySharedWallet({
          name: data.name,
          chainId: Wallet.Cardano.ChainIds[environmentName],
          ownSignerWalletId: activeWalletId,
          quorumRules: data.quorumRules,
          coSigners: data.coSigners
        });
      } catch (error: unknown) {
        if (error instanceof WalletConflictError) {
          setIsWalletConflictModalVisible(true);
        }
        throw error;
      }
    },
    [cardanoWallet.source.wallet.walletId, environmentName, createInMemorySharedWallet]
  );

  const generateKey = useCallback(
    async (enteredPassword?: string) => {
      if (sharedWalletKey) return sharedWalletKey;
      const activeWalletId = cardanoWallet.source.wallet.walletId;
      const key = await generateSharedWalletKey(enteredPassword);
      const keyInBip32 = Cardano.Cip1854ExtendedAccountPublicKey.toBip32PublicKeyHex(key);
      await createMultiSigAccount({
        ownSignerWalletId: activeWalletId,
        sharedWalletKey: keyInBip32
      });
      setSharedWalletKey(key);
      return key;
    },
    [cardanoWallet.source.wallet.walletId, createMultiSigAccount, generateSharedWalletKey, sharedWalletKey]
  );

  const navigateToRoot = useCallback(() => history.push(walletRoutePaths.sharedWallet.root), [history]);
  const navigateToAppHome = useCallback(() => setBackgroundPage(), [setBackgroundPage]);

  return (
    <>
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
                activeWalletType={activeWallet.type as LinkedWalletType}
                generateKey={generateKey}
                onGenerateKeys={() => analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateKeyClick)}
                onCopyKeys={() => analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateCopyKeyClick)}
                onClose={async () => await analytics.sendEventToPostHog(PostHogAction.SharedWalletsGenerateCloseClick)}
                navigateToParentFlow={navigateToRoot}
              />
            )}
          />
          {sharedWalletKey && (
            <Route
              exact
              path={walletRoutePaths.sharedWallet.create}
              render={() => (
                <SharedWalletCreationFlow
                  walletKind={isHardwareWallet ? 'cold' : 'hot'}
                  activeWalletName={walletInfo?.name || ''}
                  initialWalletName={initialWalletName}
                  navigateToAppHome={navigateToAppHome}
                  exitTheFlow={navigateToRoot}
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
                  exitTheFlow={navigateToRoot}
                  navigateToAppHome={navigateToAppHome}
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
      <WalletConflictModal
        visible={isWalletConflictModalVisible}
        onConfirm={() => {
          setIsWalletConflictModalVisible(false);
          navigateToRoot();
        }}
      />
    </>
  );
};
