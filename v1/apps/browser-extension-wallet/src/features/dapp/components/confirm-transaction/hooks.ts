import isPlainObject from 'lodash/isPlainObject';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AssetProvider, AssetsMintedInspection, MintedAsset } from '@cardano-sdk/core';
import { dAppRoutePaths } from '@routes';
import { Wallet } from '@lace/cardano';
import { useRedirection } from '@hooks';
import { CardanoTxOut } from '@src/types';
import { config } from '@src/config';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { getTransactionAssetsId } from '@src/stores/slices';
import { allowSignTx, pubDRepKeyToHash, disallowSignTx } from './utils';
import { useWalletStore } from '@stores';
import { TransactionWitnessRequest, WalletType } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { parseError } from '@src/utils/parse-error';
import { useViewsFlowContext } from '@providers';

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
          logger.error(error);
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
          logger.error(error);
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
): ((close?: boolean, reason?: string) => Promise<void>) =>
  useCallback(async (close, reason) => await disallowSignTx(req, close, reason), [req]);

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
  const { signError } = useViewsFlowContext();
  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
        throw new Error('Invalid state: expected hw wallet');
      }
      await req.sign();
      redirectToSignSuccess();
    } catch (error) {
      logger.error('signWithHardwareWallet error', error);
      signError.set(parseError(error));
      disallow(false);
      redirectToSignFailure();
    }
  }, [disallow, redirectToSignFailure, redirectToSignSuccess, req, signError]);
  return { isConfirmingTx, signWithHardwareWallet };
};

export const useOnUnload = (callBack: () => void): void => {
  useEffect(() => {
    window.addEventListener('unload', callBack);
    return () => {
      window.removeEventListener('unload', callBack);
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
      const ownPubDRepKey = await inMemoryWallet.governance.getPubDRepKey();
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
