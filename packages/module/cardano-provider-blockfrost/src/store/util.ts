// TODO: LW-12363 jest fails to load react native, but it is likely to work with esm
import { Blockchains } from '@lace-lib/ui-toolkit/src/design-system/atoms/icons/urls';
import { Timestamp } from '@lace-sdk/util';

import type { Asset, Cardano } from '@cardano-sdk/core';
import type {
  CardanoTokenMetadata,
  CardanoTokenMetadataFile,
} from '@lace-contract/cardano-context';
import type { TokenMetadata } from '@lace-contract/tokens';

const mapToRecord = (
  map?: Map<string, Cardano.Metadatum>,
): Record<string, string> | undefined =>
  [...(map?.entries() || [])]
    .map(([key, value]): [string, string | null] => [
      key,
      typeof value === 'string'
        ? value
        : typeof value === 'bigint'
        ? value.toString()
        : // currently only support string or number additional properties
          null,
    ])
    .filter((kv): kv is [string, string] => !!kv[1])
    .reduce((result, [key, value]) => {
      result[key] = value;
      return result;
    }, {} as Record<string, string>);

export const toContractTokenMetadata = (
  assetInfo: Asset.AssetInfo,
): TokenMetadata<CardanoTokenMetadata> => ({
  blockchainSpecific: {
    updatedAt: Timestamp.now(),
    policyId: assetInfo.policyId.toString(),
    files: assetInfo.nftMetadata?.files?.map(
      (file): CardanoTokenMetadataFile => ({
        mediaType: file.mediaType,
        src: file.src,
        name: file.name,
        additionalProperties: mapToRecord(file.otherProperties),
      }),
    ),
  },
  decimals: assetInfo.tokenMetadata?.decimals || 0,
  additionalProperties: mapToRecord(assetInfo.nftMetadata?.otherProperties),
  image: assetInfo.nftMetadata?.image || assetInfo.tokenMetadata?.icon,
  isNft: assetInfo.supply === 1n,
  name:
    assetInfo.nftMetadata?.name ||
    assetInfo.tokenMetadata?.name ||
    assetInfo.fingerprint,
  ticker: assetInfo.tokenMetadata?.ticker,
});

/** Base lovelace metadata; ticker is overridden per-network in Blockfrost dependencies. */
export const LOVELACE_METADATA: TokenMetadata<CardanoTokenMetadata> = {
  decimals: 6,
  name: 'Cardano',
  ticker: 'ADA',
  image: Blockchains.Cardano,
  blockchainSpecific: {
    updatedAt: Timestamp.now(),
  },
};
