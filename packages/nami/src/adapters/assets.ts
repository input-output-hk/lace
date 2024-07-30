import {
  convertMetadataPropToString,
  fromAssetUnit,
  linkToSrc,
} from '../api/util';

import type { Asset as NamiAsset } from '../types/assets';
import type { Asset, Cardano } from '@cardano-sdk/core';
import type { HandleInfo, Assets } from '@cardano-sdk/wallet';

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

  const image = assetInfo.tokenMetadata?.icon ?? assetInfo.nftMetadata?.image;

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
