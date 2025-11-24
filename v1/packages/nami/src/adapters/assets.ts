import { useEffect, useState } from 'react';

import { useObservable } from '@lace/common';
import isNil from 'lodash/isNil';

import {
  convertMetadataPropToString,
  fromAssetUnit,
  linkToSrc,
} from '../api/util';

import type { useBalance } from './balance';
import type { Asset as NamiAsset, CardanoAsset } from '../types/assets';
import type { Asset, Cardano } from '@cardano-sdk/core';
import type { HandleInfo, Assets } from '@cardano-sdk/wallet';
import type { Wallet } from '@lace/cardano';

export type AssetOrHandleInfo = Asset.AssetInfo | HandleInfo;
export type AssetOrHandleInfoMap = Map<Cardano.AssetId, AssetOrHandleInfo>;

export const withHandleInfo = (
  assets: Readonly<Assets>,
  handles: HandleInfo[] = [],
): AssetOrHandleInfoMap => {
  const assetsWithHandleInfo: AssetOrHandleInfoMap = new Map(assets);

  for (const handle of handles) {
    if (assetsWithHandleInfo.has(handle.assetId)) {
      assetsWithHandleInfo.set(handle.assetId, handle);
    }
  }

  return assetsWithHandleInfo;
};

export const toAsset = (
  assetInfo: Readonly<AssetOrHandleInfo>,
  quantity: bigint,
): Readonly<NamiAsset> => {
  const { name, label } = fromAssetUnit(assetInfo.assetId);
  const bufferName = Buffer.from(name, 'hex').toString();

  const labeledName = Number.isInteger(label)
    ? `(${label}) ${bufferName}`
    : bufferName;
  const displayName =
    assetInfo.tokenMetadata?.name ?? assetInfo.nftMetadata?.name ?? bufferName;

  let image = assetInfo.tokenMetadata?.icon ?? assetInfo.nftMetadata?.image;
  if ('handle' in assetInfo) {
    image = assetInfo.image ?? image;
  }

  return {
    name: bufferName,
    labeledName,
    displayName,
    fingerprint: assetInfo.fingerprint,
    policy: assetInfo.policyId,
    quantity: quantity.toString(),
    unit: assetInfo.assetId,
    decimals: assetInfo.tokenMetadata?.decimals ?? 0,
    image: linkToSrc(
      convertMetadataPropToString(image) ?? '',
      Boolean(assetInfo.tokenMetadata?.icon),
    ),
  };
};

export const isNFT = (assetInfo: Readonly<Wallet.Asset.AssetInfo>): boolean =>
  (assetInfo?.nftMetadata && !fromAssetUnit(assetInfo?.assetId).label) ||
  fromAssetUnit(assetInfo?.assetId).label === 222;

interface Props {
  inMemoryWallet: Wallet.ObservableWallet;
  balance: ReturnType<typeof useBalance>;
}

export const useAssets = ({ inMemoryWallet, balance }: Readonly<Props>) => {
  const [fullAssetList, setFullAssetList] = useState<{
    assets: (CardanoAsset | NamiAsset)[];
    nfts: NamiAsset[];
  }>({ assets: [], nfts: [] });
  const utxoTotal = useObservable(inMemoryWallet.balance.utxo.total$);
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);

  useEffect(() => {
    const tokens: NamiAsset[] = [];
    const nfts: NamiAsset[] = [];

    if (!isNil(utxoTotal?.assets) && utxoTotal?.assets?.size > 0) {
      for (const [assetId, assetBalance] of utxoTotal.assets) {
        const assetInfo = assetsInfo?.get(assetId);
        if (assetBalance <= 0 || !assetInfo) continue;

        const asset = toAsset(assetInfo, assetBalance);
        if (isNFT(assetInfo)) {
          nfts.push(asset);
        } else {
          tokens.push(asset);
        }
      }
    }

    const cardano =
      balance.totalCoins > BigInt(0)
        ? [
            {
              unit: 'lovelace',
              quantity: (
                balance.totalCoins -
                balance.lockedCoins -
                balance.unspendableCoins
              ).toString(),
            },
          ]
        : [];

    setFullAssetList({ assets: [...cardano, ...tokens], nfts });
  }, [assetsInfo, utxoTotal, balance?.totalCoins]);

  return fullAssetList;
};

export const searchTokens = (
  data: readonly NamiAsset[],
  searchValue: string,
) => {
  const fields = ['name', 'displayName', 'policy', 'fingerprint'] as const;
  const lowerSearchValue = searchValue.toLowerCase();

  return data.filter(item =>
    fields.some(
      field =>
        field in item && item[field]?.toLowerCase().includes(lowerSearchValue),
    ),
  );
};
