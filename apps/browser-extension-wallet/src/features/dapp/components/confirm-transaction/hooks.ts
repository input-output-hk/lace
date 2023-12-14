import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AssetProvider,
  assetsBurnedInspector,
  AssetsMintedInspection,
  assetsMintedInspector,
  createTxInspector,
  MintedAsset
} from '@cardano-sdk/core';
import * as HardwareLedger from '@cardano-sdk/hardware-ledger';
import { dAppRoutePaths } from '@routes';
import { Wallet } from '@lace/cardano';
import { useRedirection } from '@hooks';
import { CardanoTxOut, WalletInfo } from '@src/types';
import { config } from '@src/config';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { getTransactionAssetsId } from '@src/stores/slices';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { allowSignTx, pubDRepKeyToHash, disallowSignTx, getTxType } from './utils';
import { GetSignTxData, SignTxData } from './types';
import { useWalletStore } from '@stores';

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
export const useSignTxData = (getSignTxData: GetSignTxData): { signTxData?: SignTxData; errorMessage?: string } => {
  const [signTxData, setSignTxData] = useState<{ dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx }>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    getSignTxData()
      .then((result) => {
        setSignTxData(result);
      })
      .catch((error) => {
        setErrorMessage(error);
        // TODO: consider mocking or removing this log
        console.error(error);
      });
  }, [getSignTxData, setSignTxData, setErrorMessage]);

  return { signTxData, errorMessage };
};

export const useDisallowSignTx = (): ((close?: boolean) => void) => useCallback(disallowSignTx, []);

export const useAllowSignTx = (): (() => void) => useCallback(allowSignTx, []);

export const useSignWithHardwareWallet = (): {
  signWithHardwareWallet: () => Promise<void>;
  isConfirmingTx: boolean;
} => {
  const allow = useAllowSignTx();
  const disallow = useDisallowSignTx();
  const redirectToSignFailure = useRedirection<Record<string, never>>(dAppRoutePaths.dappTxSignFailure);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(Wallet.KeyManagement.CommunicationType.Web);
      allow();
    } catch (error) {
      console.error('error', error);
      disallow(false);
      redirectToSignFailure({});
    }
  }, [allow, disallow, redirectToSignFailure]);

  return { isConfirmingTx, signWithHardwareWallet };
};

export const useTxSummary = ({
  tx,
  addressList,
  walletInfo,
  createAssetList,
  createMintedAssetList
}: {
  addressList: AddressListType[];
  walletInfo: WalletInfo;
  tx: Wallet.Cardano.Tx;
  createAssetList: (txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[];
  createMintedAssetList: (txAssets: AssetsMintedInspection) => Wallet.Cip30SignTxAssetItem[];
}): Wallet.Cip30SignTxSummary | undefined =>
  useMemo((): Wallet.Cip30SignTxSummary | undefined => {
    const txType = getTxType(tx);
    const inspector = createTxInspector({
      minted: assetsMintedInspector,
      burned: assetsBurnedInspector
    });

    const { minted, burned } = inspector(tx as Wallet.Cardano.HydratedTx);

    const addressToNameMap = new Map<string, string>(
      addressList?.map((item: AddressListType) => [item.address, item.name])
    );

    const externalOutputs = tx.body.outputs.filter((output) => {
      if (txType === Wallet.Cip30TxType.Send) {
        return walletInfo.addresses.every((addr) => output.address !== addr.address);
      }
      // Don't show withdrawal tx's etc
      return output.address.toString() !== walletInfo.addresses[0].address.toString();
    });

    // eslint-disable-next-line unicorn/no-array-reduce
    const txSummaryOutputs: Wallet.Cip30SignTxSummary['outputs'] = externalOutputs.reduce(
      (acc, txOut) => [
        ...acc,
        {
          coins: Wallet.util.lovelacesToAdaString(txOut.value.coins.toString()),
          recipient: addressToNameMap?.get(txOut.address.toString()) || txOut.address.toString(),
          ...(txOut.value.assets?.size > 0 && { assets: createAssetList(txOut.value.assets) })
        }
      ],
      []
    );

    return {
      fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
      outputs: txSummaryOutputs,
      type: txType,
      mintedAssets: createMintedAssetList(minted),
      burnedAssets: createMintedAssetList(burned)
    };
  }, [tx, addressList, createMintedAssetList, walletInfo.addresses, createAssetList]);

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

  // TODO consider using Zustand or at least some common abstraction e.g. https://github.com/streamich/react-use/blob/master/src/useAsync.ts
  return { loading: ownPubDRepKeyHash === undefined, ownPubDRepKeyHash };
};

export const useCExpolorerBaseUrl = (): string => {
  const [explorerBaseUrl, setExplorerBaseUrl] = useState('');
  const { environmentName } = useWalletStore();

  const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();

  useEffect(() => {
    const newUrl =
      environmentName === 'Sanchonet' ? '' : `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`;
    if (newUrl !== explorerBaseUrl) {
      setExplorerBaseUrl(newUrl);
    }
  }, [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName, explorerBaseUrl]);

  return explorerBaseUrl;
};
