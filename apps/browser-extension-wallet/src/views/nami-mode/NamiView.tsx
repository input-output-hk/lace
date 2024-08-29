/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DappConnector, Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import {
  useCustomSubmitApi,
  useWalletAvatar,
  useCollateral,
  useFetchCoinPrice,
  useWalletManager,
  useBuildDelegation,
  useBalances
} from '@hooks';
import { signingCoordinator, walletManager, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useAnalytics } from './hooks';
import { useDappContext, withDappContext } from '@src/features/dapp/context';
import { localDappService } from '../browser-view/features/dapp/components/DappList/localDappService';
import { isValidURL } from '@src/utils/is-valid-url';
import { CARDANO_COIN_SYMBOL } from './constants';
import { useDelegationTransaction } from '../browser-view/features/staking/hooks';
import { useSecrets } from '@lace/core';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { getPoolInfos } from '@src/stores/slices';
import { Wallet } from '@lace/cardano';
import { walletBalanceTransformer } from '@src/api/transformers';
import { useObservable } from '@lace/common';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { useWrapWithTimeout } from '../browser-view/features/multi-wallet/hardware-wallet/useWrapWithTimeout';
import { certificateInspectorFactory } from '@src/features/dapp/components/confirm-transaction/utils';
import { useWalletState } from '@hooks/useWalletState';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { BackgroundStorage, DappDataService } from '@lib/scripts/types';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import * as cip30 from '@cardano-sdk/dapp-connector';
import { UserPromptService } from '@lib/scripts/background/services';
import { finalize, firstValueFrom, map, of } from 'rxjs';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';

const { AVAILABLE_CHAINS, DEFAULT_SUBMIT_API } = config();

const DAPP_TOAST_DURATION = 100;
const dappConnector: DappConnector = {
  getDappInfo: () => {
    const dappDataService = consumeRemoteApi<Pick<DappDataService, 'getDappInfo'>>(
      {
        baseChannel: DAPP_CHANNELS.dappData,
        properties: {
          getDappInfo: RemoteApiPropertyType.MethodReturningPromise
        }
      },
      { logger: console, runtime }
    );
    return dappDataService.getDappInfo();
  },
  authorizeDapp: (authorization: 'deny' | 'allow', url: string, onCleanup: () => void) => {
    const api$ = of({
      allowOrigin(origin: cip30.Origin): Promise<'deny' | 'allow'> {
        if (!url.startsWith(origin)) {
          return Promise.reject();
        }
        return Promise.resolve(authorization);
      }
    });

    const userPromptService = exposeApi<Pick<UserPromptService, 'allowOrigin'>>(
      {
        api$,
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { allowOrigin: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    setTimeout(() => {
      userPromptService.shutdown();
      onCleanup();
    }, DAPP_TOAST_DURATION);
  },
  getSignTxRequest: async () => {
    const userPromptService = exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
      {
        api$: of({
          async readyToSignTx(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return firstValueFrom(
      signingCoordinator.transactionWitnessRequest$.pipe(
        map(async (r) => ({
          dappInfo: await senderToDappInfo(r.signContext.sender),
          request: {
            data: { tx: r.transaction.toCbor(), addresses: r.signContext.knownAddresses },
            reject: async (onCleanup: () => void) => {
              await r.reject('User declined to sign');
              setTimeout(() => {
                onCleanup();
              }, DAPP_TOAST_DURATION);
            },
            sign: async (password: string) => {
              const passphrase = Buffer.from(password, 'utf8');
              await r.sign(passphrase, { willRetryOnFailure: true });
            }
          }
        })),
        finalize(() => userPromptService.shutdown())
      )
    );
  },
  getSignDataRequest: async () => {
    const userPromptService = exposeApi<Pick<UserPromptService, 'readyToSignData'>>(
      {
        api$: of({
          async readyToSignData(): Promise<boolean> {
            return Promise.resolve(true);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { readyToSignData: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );

    return firstValueFrom(
      signingCoordinator.signDataRequest$.pipe(
        map(async (r) => ({
          dappInfo: await senderToDappInfo(r.signContext.sender),
          request: {
            data: { payload: r.signContext.payload, address: r.signContext.signWith },
            reject: async (onCleanup: () => void) => {
              await r.reject('User rejected to sign');
              setTimeout(() => {
                onCleanup();
              }, DAPP_TOAST_DURATION);
            },
            sign: async (password: string) => {
              const passphrase = Buffer.from(password, 'utf8');
              return r.sign(passphrase, { willRetryOnFailure: true });
            }
          }
        })),
        finalize(() => userPromptService.shutdown())
      )
    );
  }
};

export const NamiView = withDappContext((): React.ReactElement => {
  const { setFiatCurrency, fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const backgroundServices = useBackgroundServiceAPIContext();
  const {
    createWallet,
    getMnemonic,
    deleteWallet,
    switchNetwork,
    enableCustomNode,
    addAccount,
    walletRepository,
    connectHardwareWalletRevamped,
    createHardwareWalletRevamped,
    saveHardwareWallet
  } = useWalletManager();
  const {
    walletUI,
    inMemoryWallet,
    walletType,
    walletInfo,
    currentChain,
    environmentName,
    blockchainProvider: { stakePoolProvider, chainHistoryProvider }
  } = useWalletStore();
  const { theme, setTheme } = useTheme();
  const { handleAnalyticsChoice, isAnalyticsOptIn, sendEventToPostHog } = useAnalytics();
  const connectedDapps = useDappContext();
  const removeDapp = useCallback((origin: string) => localDappService.removeAuthorizedDapp(origin), []);
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();
  const cardanoCoin = useMemo(
    () => ({
      ...walletUI.cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[currentChain.networkId]
    }),
    [currentChain.networkId, walletUI.cardanoCoin]
  );
  const { txFee, isInitializing, initializeCollateralTx, submitCollateralTx } = useCollateral();

  const cardanoPrice = priceResult.cardano.price;
  const walletAddresses = walletInfo?.addresses
    .filter((address) => isKeyHashAddress(address))
    .map(({ address }) => address);
  const { setAvatar } = useWalletAvatar();
  const { delegationTxFee, setDelegationTxFee, setSelectedStakePool, setDelegationTxBuilder, delegationTxBuilder } =
    useDelegationStore();
  const { buildDelegation } = useBuildDelegation();
  const { signAndSubmitTransaction } = useDelegationTransaction();
  const { isBuildingTx, stakingError, setIsBuildingTx } = useStakePoolDetails();
  const walletState = useWalletState();
  const passwordUtil = useSecrets();
  const openExternalLink = useExternalLinkOpener();
  const getStakePoolInfo = useCallback(
    (id: Wallet.Cardano.PoolId) => getPoolInfos([id], stakePoolProvider),
    [stakePoolProvider]
  );

  const resetDelegationState = useCallback(() => {
    passwordUtil.clearSecrets();
    setDelegationTxFee();
    setDelegationTxBuilder();
    setIsBuildingTx(false);
  }, [passwordUtil, setDelegationTxBuilder, setDelegationTxFee, setIsBuildingTx]);

  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const isStakeRegistered =
    rewardAccounts && rewardAccounts[0].credentialStatus === Wallet.Cardano.StakeCredentialStatus.Registered;
  const { balance } = useBalances(priceResult?.cardano?.price);
  const { coinBalance: minAda } = walletBalanceTransformer(protocolParameters?.stakeKeyDeposit.toString());
  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(console.error);
  }, []);

  const switchWalletMode = async () => {
    const mode = namiMigration?.mode === 'lace' ? 'nami' : 'lace';
    const migration: BackgroundStorage['namiMigration'] = {
      ...namiMigration,
      mode
    };

    setNamiMigration(migration);
    backgroundServices.handleChangeMode({ mode });
    await setBackgroundStorage({
      namiMigration: migration
    });
  };
  const getTxInputsValueAndAddress = useCallback(
    async (inputs: Wallet.Cardano.TxIn[] | Wallet.Cardano.HydratedTxIn[]) =>
      await Wallet.getTxInputsValueAndAddress(inputs, chainHistoryProvider, inMemoryWallet),
    [chainHistoryProvider, inMemoryWallet]
  );

  const sortedHistoryTx = useMemo(
    () => walletState?.transactions.history.sort((tx1, tx2) => tx2.blockHeader.slot - tx1.blockHeader.slot),
    [walletState]
  );

  const openHWFlow = useCallback(
    (path: string) => {
      backgroundServices.handleOpenNamiBrowser({ path });
    },
    [backgroundServices]
  );
  const connectHW = useWrapWithTimeout(connectHardwareWalletRevamped);

  return (
    <OutsideHandlesProvider
      {...{
        collateralFee: txFee,
        isInitializingCollateral: isInitializing,
        initializeCollateralTx,
        submitCollateralTx,
        addAccount,
        removeDapp,
        connectedDapps,
        isAnalyticsOptIn,
        handleAnalyticsChoice,
        sendEventToPostHog,
        createWallet,
        getMnemonic,
        deleteWallet,
        fiatCurrency: fiatCurrency.code,
        setFiatCurrency,
        theme: theme.name,
        setTheme,
        inMemoryWallet,
        currentChain,
        cardanoPrice,
        withSignTxConfirmation,
        walletManager,
        walletRepository,
        switchNetwork,
        environmentName,
        availableChains: AVAILABLE_CHAINS,
        enableCustomNode,
        getCustomSubmitApiForNetwork,
        defaultSubmitApi: DEFAULT_SUBMIT_API,
        cardanoCoin,
        isValidURL,
        dappConnector,
        buildDelegation,
        signAndSubmitTransaction,
        passwordUtil,
        delegationTxFee: !!delegationTxBuilder && delegationTxFee,
        setSelectedStakePool,
        isBuildingTx,
        stakingError,
        getStakePoolInfo,
        resetDelegationState,
        hasNoFunds,
        setAvatar,
        switchWalletMode,
        openExternalLink,
        walletAddresses,
        transactions: sortedHistoryTx,
        eraSummaries: walletState?.eraSummaries,
        getTxInputsValueAndAddress,
        certificateInspectorFactory,
        openHWFlow,
        walletType,
        connectHW,
        createHardwareWalletRevamped,
        saveHardwareWallet
      }}
    >
      <Nami />
    </OutsideHandlesProvider>
  );
});
