import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { Skeleton } from 'antd';
import { DappTransaction } from '@lace/core';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { useCurrencyStore } from '@providers/currency';
import { useFetchCoinPrice } from '@hooks';
import { useViewsFlowContext } from '@providers';
import { Wallet } from '@lace/cardano';
import {
  AssetsMintedInspection,
  createTxInspector,
  assetsMintedInspector,
  assetsBurnedInspector,
  MintedAsset
} from '@cardano-sdk/core';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';

interface Props {
  errorMessage?: string;
}

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

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export const DappTransactionContainer = withAddressBookContext(({ errorMessage }: Props): React.ReactElement => {
  const {
    walletInfo,
    inMemoryWallet,
    blockchainProvider: { assetProvider },
    walletUI: { cardanoCoin },
    walletState
  } = useWalletStore();
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();
  const currencyStore = useCurrencyStore();
  const coinPrice = useFetchCoinPrice();
  const { list: addressList } = useAddressBookContext() as { list: AddressListType[] };
  const tx = useMemo(() => request?.transaction.toCore(), [request?.transaction]);
  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | null>();

  const txCollateral = useComputeTxCollateral(walletState, tx);

  const assetIds = useMemo(() => {
    if (!tx) return [];
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
  }, [tx]);

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

  const createMintedList = useCallback(
    (mintedAssets: AssetsMintedInspection) => {
      if (!assetsInfo) return [];
      return mintedAssets.map((asset) => {
        const assetId = Wallet.Cardano.AssetId.fromParts(asset.policyId, asset.assetName);
        const assetInfo = assets.get(assetId) || assetsInfo?.get(assetId);
        // If it's a new asset or the name is being updated we should be getting it from the tx metadata
        const metadataName = getAssetNameFromMintMetadata(asset, tx?.auxiliaryData?.blob);
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
    [assets, assetsInfo, tx]
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
    if (!tx) {
      setTxSummary(void 0);
      return;
    }
    const getTxSummary = async () => {
      const inspector = createTxInspector({
        minted: assetsMintedInspector,
        burned: assetsBurnedInspector
      });

      const { minted, burned } = await inspector(tx as Wallet.Cardano.HydratedTx);
      const isMintTransaction = minted.length > 0 || burned.length > 0;

      const txType = isMintTransaction ? Wallet.Cip30TxType.Mint : Wallet.Cip30TxType.Send;

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
        burnedAssets: createMintedList(burned),
        collateral: txCollateral ? Wallet.util.lovelacesToAdaString(txCollateral.toString()) : undefined
      });
    };
    getTxSummary();
  }, [tx, walletInfo.addresses, createAssetList, createMintedList, addressToNameMap, setTxSummary, txCollateral]);

  return tx && txSummary ? (
    <DappTransaction
      transaction={txSummary}
      dappInfo={dappInfo}
      errorMessage={errorMessage}
      fiatCurrencyCode={currencyStore.fiatCurrency?.code}
      fiatCurrencyPrice={coinPrice.priceResult?.cardano?.price}
      coinSymbol={cardanoCoin.symbol}
    />
  ) : (
    <Skeleton loading />
  );
});
