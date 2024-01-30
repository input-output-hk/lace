import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, PostHogAction, useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DappTransaction } from '@lace/core';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { sectionTitle, DAPP_VIEWS } from '../config';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { AddressListType } from '@views/browser/features/activity';
import { exposeApi, RemoteApiPropertyType, WalletType } from '@cardano-sdk/web-extension';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { useFetchCoinPrice, useRedirection } from '@hooks';
import {
  assetsBurnedInspector,
  assetsMintedInspector,
  createTxInspector,
  AssetsMintedInspection,
  MintedAsset
} from '@cardano-sdk/core';
import { Skeleton } from 'antd';
import { dAppRoutePaths } from '@routes';
import type { UserPromptService } from '@lib/scripts/background/services';
import { of } from 'rxjs';
import { getAssetsInformation, TokenInfo } from '@src/utils/get-assets-information';
import { useCurrencyStore, useAnalyticsContext } from '@providers';
import { TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { signingCoordinator } from '@lib/wallet-api-ui';
import { senderToDappInfo } from '@src/utils/senderToDappInfo';

const DAPP_TOAST_DURATION = 50;

const convertMetadataArrayToObj = (arr: unknown[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const item of arr) {
    if (typeof item === 'object' && !Array.isArray(item) && item !== null) {
      Object.assign(result, item);
    }
  }
  return result;
};

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
const getAssetNameFromMintMetadata = (asset: MintedAsset, metadata: Wallet.Cardano.TxMetadata): string | undefined => {
  if (!asset || !metadata) return;
  const decodedAssetName = Buffer.from(asset.assetName, 'hex').toString();

  // Tries to find the asset name in the tx metadata under label 721 or 20
  for (const [key, value] of metadata.entries()) {
    // eslint-disable-next-line no-magic-numbers
    if (key !== BigInt(721) && key !== BigInt(20)) return;
    const cip25Metadata = Wallet.cardanoMetadatumToObj(value);
    if (!Array.isArray(cip25Metadata)) return;

    // cip25Metadata should be an array containing all policies for the minted assets in the tx
    const policyLevelMetadata = convertMetadataArrayToObj(cip25Metadata)[asset.policyId];
    if (!Array.isArray(policyLevelMetadata)) return;

    // policyLevelMetadata should be an array of objects with the minted assets names as key
    // e.g. "policyId" = [{ "AssetName1": { ...metadataAsset1 } }, { "AssetName2": { ...metadataAsset2 } }];
    const assetProperties = convertMetadataArrayToObj(policyLevelMetadata)?.[decodedAssetName];
    if (!Array.isArray(assetProperties)) return;

    // assetProperties[decodedAssetName] should be an array of objects with the properties as keys
    // e.g. [{ "name": "Asset Name" }, { "description": "An asset" }, ...]
    const assetMetadataName = convertMetadataArrayToObj(assetProperties)?.name;
    // eslint-disable-next-line consistent-return
    return typeof assetMetadataName === 'string' ? assetMetadataName : undefined;
  }
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const ConfirmTransaction = withAddressBookContext((): React.ReactElement => {
  const {
    utils: { setNextView },
    signTxRequest: { request: req, set: setSignTxRequest }
  } = useViewsFlowContext();
  const { t } = useTranslation();
  const {
    walletInfo,
    inMemoryWallet,
    walletType,
    isHardwareWallet,
    blockchainProvider: { assetProvider },
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const { list: addressList } = useAddressBookContext();
  const { priceResult } = useFetchCoinPrice();
  const analytics = useAnalyticsContext();

  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | null>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();

  // All assets' ids in the transaction body. Used to fetch their info from cardano services
  const assetIds = useMemo(() => {
    if (!req) return [];
    const tx = req.transaction.toCore();
    const uniqueAssetIds = new Set<Wallet.Cardano.AssetId>();
    // Merge all assets (TokenMaps) from the tx outputs and mint
    const assetMaps = tx.body?.outputs?.map((output) => output.value.assets) ?? [];
    if (tx.body?.mint?.size > 0) assetMaps.push(tx.body.mint);

    // Extract all unique asset ids from the array of TokenMaps
    for (const asset of assetMaps) {
      if (asset) {
        for (const id of asset.keys()) {
          !uniqueAssetIds.has(id) && uniqueAssetIds.add(id);
        }
      }
    }
    return [...uniqueAssetIds.values()];
  }, [req]);

  useEffect(() => {
    if (assetIds?.length > 0) {
      getAssetsInformation(assetIds, assets, {
        assetProvider,
        extraData: { nftMetadata: true, tokenMetadata: true }
      })
        .then((result) => setAssetsInfo(result))
        .catch((error) => {
          console.error(error);
        });
    }
  }, [assetIds, assetProvider, assets]);

  const cancelTransaction = useCallback(
    async (close = false) => {
      await req.reject('User rejected to sign');
      close && setTimeout(() => window.close(), DAPP_TOAST_DURATION);
    },
    [req]
  );

  window.addEventListener('beforeunload', cancelTransaction);

  const signWithHardwareWallet = async () => {
    setIsConfirmingTx(true);
    try {
      if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
        throw new Error('Invalid state: expected hw wallet');
      }
      await req.sign();
      redirectToSignSuccess();
    } catch (error) {
      console.error('signWithHardwareWallet error', error);
      cancelTransaction(false);
      redirectToSignFailure();
    }
  };

  useEffect(() => {
    const subscription = signingCoordinator.transactionWitnessRequest$.subscribe(async (r) => {
      setDappInfo(await senderToDappInfo(r.signContext.sender));
      setSignTxRequest(r);
    });

    const api = exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
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

    return () => {
      subscription.unsubscribe();
      api.shutdown();
    };
  }, [setSignTxRequest]);

  const createMintedList = useCallback(
    (mintedAssets: AssetsMintedInspection) => {
      if (!assetsInfo) return [];
      return mintedAssets.map((asset) => {
        const assetId = Wallet.Cardano.AssetId.fromParts(asset.policyId, asset.assetName);
        const assetInfo = assets.get(assetId) || assetsInfo?.get(assetId);
        // If it's a new asset or the name is being updated we should be getting it from the tx metadata
        const metadataName = getAssetNameFromMintMetadata(asset, req.transaction.toCore()?.auxiliaryData?.blob);
        return {
          name: assetInfo?.name.toString() || asset.fingerprint || assetId,
          ticker:
            metadataName ??
            assetInfo?.nftMetadata?.name ??
            assetInfo?.tokenMetadata?.ticker ??
            assetInfo?.tokenMetadata?.name ??
            asset.fingerprint.toString(),
          amount: Wallet.util.calculateAssetBalance(asset.quantity, assetInfo)
        };
      });
    },
    [assets, assetsInfo, req]
  );

  const createAssetList = useCallback(
    (txAssets: Wallet.Cardano.TokenMap) => {
      if (!assetsInfo) return [];
      const assetList: Wallet.Cip30SignTxAssetItem[] = [];
      txAssets.forEach(async (value, key) => {
        const walletAsset = assets.get(key) || assetsInfo?.get(key);
        assetList.push({
          name: walletAsset?.name.toString() || key.toString(),
          ticker: walletAsset?.tokenMetadata?.ticker || walletAsset?.nftMetadata?.name,
          amount: Wallet.util.calculateAssetBalance(value, walletAsset)
        });
      });
      return assetList;
    },
    [assets, assetsInfo]
  );

  const addressToNameMap = useMemo(
    () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
    [addressList]
  );

  const [txSummary, setTxSummary] = useState<Wallet.Cip30SignTxSummary | undefined>();

  useEffect(() => {
    if (!req) {
      setTxSummary(void 0);
      return;
    }
    const getTxSummary = async () => {
      const inspector = createTxInspector({
        minted: assetsMintedInspector,
        burned: assetsBurnedInspector
      });

      const tx = req.transaction.toCore();
      const { minted, burned } = await inspector(tx as Wallet.Cardano.HydratedTx);
      const isMintTransaction = minted.length > 0 || burned.length > 0;

      const txType = isMintTransaction ? 'Mint' : 'Send';

      const externalOutputs = tx.body.outputs.filter((output) => {
        if (txType === 'Send') {
          return walletInfo.addresses.every((addr) => output.address !== addr.address);
        }
        return true;
      });

      const txSummaryOutputs: Wallet.Cip30SignTxSummary['outputs'] = externalOutputs.reduce((acc, txOut) => {
        // Don't show withdrawl tx's etc
        if (txOut.address.toString() === walletInfo.addresses[0].address.toString()) return acc;

        return [
          ...acc,
          {
            coins: Wallet.util.lovelacesToAdaString(txOut.value.coins.toString()),
            recipient: addressToNameMap?.get(txOut.address.toString()) || txOut.address.toString(),
            ...(txOut.value.assets?.size > 0 && { assets: createAssetList(txOut.value.assets) })
          }
        ];
      }, []);

      // eslint-disable-next-line consistent-return
      setTxSummary({
        fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
        outputs: txSummaryOutputs,
        type: txType,
        mintedAssets: createMintedList(minted),
        burnedAssets: createMintedList(burned)
      });
    };
    getTxSummary();
  }, [req, walletInfo.addresses, createAssetList, createMintedList, addressToNameMap, setTxSummary]);

  const onConfirm = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick, {
      [TX_CREATION_TYPE_KEY]: TxCreationType.External
    });

    txSubmitted$.next({
      id: req.transaction.getId().toString(),
      date: new Date().toString(),
      creationType: TxCreationType.External
    });

    isHardwareWallet ? signWithHardwareWallet() : setNextView();
  };

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {req && txSummary ? (
        <DappTransaction
          transaction={txSummary}
          dappInfo={dappInfo}
          fiatCurrencyCode={fiatCurrency?.code}
          fiatCurrencyPrice={priceResult?.cardano?.price}
          coinSymbol={cardanoCoin.symbol}
        />
      ) : (
        <Skeleton loading />
      )}
      <div className={styles.actions}>
        <Button
          onClick={onConfirm}
          loading={isHardwareWallet && isConfirmingTx}
          data-testid="dapp-transaction-confirm"
          className={styles.actionBtn}
        >
          {isHardwareWallet
            ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: walletType })
            : t('dapp.confirm.btn.confirm')}
        </Button>
        <Button
          color="secondary"
          data-testid="dapp-transaction-cancel"
          onClick={cancelTransaction}
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
});
