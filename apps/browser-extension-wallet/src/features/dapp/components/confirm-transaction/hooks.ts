/* eslint-disable no-console */
import isPlainObject from 'lodash/isPlainObject';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AssetProvider,
  assetsBurnedInspector,
  AssetsMintedInspection,
  assetsMintedInspector,
  createTxInspector,
  MintedAsset
} from '@cardano-sdk/core';
import { dAppRoutePaths } from '@routes';
import { Wallet } from '@lace/cardano';
import { useRedirection } from '@hooks';
import { CardanoTxOut, WalletInfo } from '@src/types';
import { config } from '@src/config';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { getTransactionAssetsId } from '@src/stores/slices';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { allowSignTx, pubDRepKeyToHash, disallowSignTx, getTxType } from './utils';
import { useWalletStore } from '@stores';
import { TransactionWitnessRequest, WalletType } from '@cardano-sdk/web-extension';
import { useComputeTxCollateral } from '@hooks/useComputeTxCollateral';
import { ObservableWalletState } from '@hooks/useWalletState';

export const useCreateAssetList = ({
  assets,
  outputs,
  assetProvider
}: {
  assets?: TokenInfo;
  outputs?: CardanoTxOut[];
  assetProvider: AssetProvider;
}): ((txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[]) => {
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | undefined>();
  const assetIds = useMemo(() => outputs && getTransactionAssetsId(outputs), [outputs]);

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

  return useCallback(
    (txAssets: Wallet.Cardano.TokenMap) => {
      if (!assetsInfo) return [];
      const assetList: Wallet.Cip30SignTxAssetItem[] = [];
      // eslint-disable-next-line unicorn/no-array-for-each
      txAssets.forEach(async (value, key) => {
        const walletAsset = assets.get(key) || assetsInfo?.get(key);
        assetList.push({
          name: walletAsset?.name.toString() || key.toString(),
          ticker: walletAsset?.tokenMetadata?.ticker || walletAsset.nftMetadata?.name,
          amount: Wallet.util.calculateAssetBalance(value, walletAsset)
        });
      });
      return assetList;
    },
    [assets, assetsInfo]
  );
};
const convertMetadataArrayToObj = (arr: unknown[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const item of arr) {
    if (isPlainObject(item)) {
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

export const useCreateMintedAssetList = ({
  assets,
  outputs,
  assetProvider,
  metadata,
  mint
}: {
  assets?: TokenInfo;
  outputs?: CardanoTxOut[];
  assetProvider: AssetProvider;
  mint?: Wallet.Cardano.TokenMap;
  metadata?: Wallet.Cardano.TxMetadata;
}): ((txAssets: AssetsMintedInspection) => Wallet.Cip30SignTxAssetItem[]) => {
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | undefined>();
  const assetIds = useMemo(() => outputs && getTransactionAssetsId(outputs, mint), [outputs, mint]);

  // eslint-disable-next-line sonarjs/no-identical-functions
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

  return useCallback(
    (mintedAssets: AssetsMintedInspection) => {
      if (!assetsInfo) return [];
      return mintedAssets.map((asset) => {
        const assetId = Wallet.Cardano.AssetId.fromParts(asset.policyId, asset.assetName);
        const assetInfo = assets.get(assetId) || assetsInfo?.get(assetId);
        // If it's a new asset or the name is being updated we should be getting it from the tx metadata
        const metadataName = getAssetNameFromMintMetadata(asset, metadata);
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
    [assets, assetsInfo, metadata]
  );
};

export const useDisallowSignTx = (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>
): ((close?: boolean) => void) => useCallback((close) => disallowSignTx(req, close), [req]);

export const useAllowSignTx = (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>
): (() => void) => useCallback(() => allowSignTx(req), [req]);

export const useSignWithHardwareWallet = (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>
): {
  signWithHardwareWallet: () => Promise<void>;
  isConfirmingTx: boolean;
} => {
  const disallow = useDisallowSignTx(req);
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const redirectToSignSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>(false);
  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
        throw new Error('Invalid state: expected hw wallet');
      }
      await req.sign();
      redirectToSignSuccess();
    } catch (error) {
      console.error('signWithHardwareWallet error', error);
      disallow(false);
      redirectToSignFailure();
    }
  }, [disallow, redirectToSignFailure]);
  return { isConfirmingTx, signWithHardwareWallet };
};

export const useTxSummary = ({
  req,
  addressList,
  walletInfo,
  createAssetList,
  createMintedAssetList,
  walletState
}: {
  addressList: AddressListType[];
  walletInfo: WalletInfo;
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  createAssetList: (txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[];
  createMintedAssetList: (txAssets: AssetsMintedInspection) => Wallet.Cip30SignTxAssetItem[];
  walletState: ObservableWalletState | null;
}): Wallet.Cip30SignTxSummary | undefined => {
  const [txSummary, setTxSummary] = useState<Wallet.Cip30SignTxSummary | undefined>();
  const tx = useMemo(() => req?.transaction.toCore(), [req?.transaction]);
  const txCollateral = useComputeTxCollateral(walletState, tx);

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

      const txType = await getTxType(tx);
      const addressToNameMap = new Map<string, string>(
        addressList?.map((item: AddressListType) => [item.address, item.name])
      );

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
        mintedAssets: createMintedAssetList(minted),
        burnedAssets: createMintedAssetList(burned),
        collateral: txCollateral ? Wallet.util.lovelacesToAdaString(txCollateral.toString()) : undefined
      });
    };
    getTxSummary();
  }, [tx, walletInfo.addresses, createAssetList, createMintedAssetList, setTxSummary, addressList, txCollateral]);

  return txSummary;
};

export const useOnBeforeUnload = (callBack: () => void): void => {
  useEffect(() => {
    window.addEventListener('beforeunload', callBack);
    return () => {
      window.removeEventListener('beforeunload', callBack);
    };
  }, [callBack]);
};

type UseGetOwnPubDRepKeyHash = {
  loading: boolean;
  ownPubDRepKeyHash: Wallet.Crypto.Hash28ByteBase16;
};

export const useGetOwnPubDRepKeyHash = (): UseGetOwnPubDRepKeyHash => {
  const [ownPubDRepKeyHash, setOwnPubDRepKeyHash] = useState<Wallet.Crypto.Hash28ByteBase16>();
  const { inMemoryWallet } = useWalletStore();

  useEffect(() => {
    if (!inMemoryWallet) return;
    const get = async () => {
      const ownPubDRepKey = await inMemoryWallet.getPubDRepKey();
      const ownDRepKeyHash = await pubDRepKeyToHash(ownPubDRepKey);

      setOwnPubDRepKeyHash(ownDRepKeyHash);
    };

    get();
  }, [inMemoryWallet]);

  return { loading: ownPubDRepKeyHash === undefined, ownPubDRepKeyHash };
};

export const useCexplorerBaseUrl = (): string => {
  const [explorerBaseUrl, setExplorerBaseUrl] = useState('');
  const { environmentName } = useWalletStore();

  const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();

  useEffect(() => {
    const explorerUrl = `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`;
    if (explorerUrl !== explorerBaseUrl) {
      setExplorerBaseUrl(explorerUrl);
    }
  }, [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName, explorerBaseUrl]);

  return explorerBaseUrl;
};
