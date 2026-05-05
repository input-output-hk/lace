import { Asset, Cardano } from '@cardano-sdk/core';

import { constructTokenId } from './asset-utils';

import type { TokensMetadataMap } from './asset-utils';
import type { AssetProvider } from '@cardano-sdk/core';
import type { StoredTokenMetadata } from '@lace-contract/tokens';
import type { Logger } from 'ts-log';

type AssetInfo = Asset.AssetInfo;

export type DispatchLoadTokenMetadata = (args: {
  tokenId: ReturnType<typeof constructTokenId>;
}) => void;

export interface CreateDappAssetProviderArgs {
  /** Cached token metadata keyed by TokenId from the `tokens` contract slice. */
  tokensMetadata: TokensMetadataMap;
  /** The transaction being inspected — needed for mint witness / CIP-68 lookup. */
  tx: Cardano.Tx;
  /** Dispatch to kick off async loading of metadata for unknown assets. */
  dispatchLoadTokenMetadata: DispatchLoadTokenMetadata;
  /** Logger for NFT metadata decoders (CIP-25 / CIP-68). */
  logger: Logger;
}

const DUMMY_BLOCK = {
  healthCheck: async () => ({ ok: true }),
};

/**
 * Look up CIP-68 reference-NFT metadata for an asset by scanning the outputs
 * of the transaction for the reference token and decoding its datum.
 *
 * Ported directly from `@cardano-sdk/wallet`'s `createWalletAssetProvider` so
 * minted-in-this-tx NFTs display with rich metadata on first render.
 */
type NftMetadataArgs = {
  policyId: Cardano.PolicyId;
  name: Cardano.AssetName;
  tx: Cardano.Tx;
  logger: Logger;
};

const tryCip68NftMetadata = ({
  policyId,
  name,
  tx,
  logger,
}: NftMetadataArgs): Asset.NftMetadata | null => {
  const decoded = Asset.AssetNameLabel.decode(name);
  if (!decoded || decoded.label !== Asset.AssetNameLabelNum.UserNFT)
    return null;

  const referenceAssetId = Cardano.AssetId.fromParts(
    policyId,
    Asset.AssetNameLabel.encode(
      decoded.content,
      Asset.AssetNameLabelNum.ReferenceNFT,
    ),
  );
  for (const output of tx.body.outputs) {
    if (output.value.assets?.get(referenceAssetId)) {
      return Asset.NftMetadata.fromPlutusData(output.datum, logger);
    }
  }
  return null;
};

/**
 * Synthesize NFT metadata from either CIP-68 reference tokens or the CIP-25
 * auxiliary data metadatum.
 */
const getNftMetadata = (args: NftMetadataArgs): Asset.NftMetadata | null => {
  const cip68 = tryCip68NftMetadata(args);
  if (cip68) return cip68;
  const { name, policyId, tx, logger } = args;
  return tx.auxiliaryData?.blob
    ? Asset.NftMetadata.fromMetadatum(
        { name, policyId },
        tx.auxiliaryData.blob,
        logger,
      )
    : null;
};

type CreateMintedAssetInfoArgs = {
  assetId: Cardano.AssetId;
  quantity: bigint;
  tx: Cardano.Tx;
  logger: Logger;
};

/**
 * Build an `AssetInfo` stub from an asset minted in this transaction, pulling
 * NFT metadata from CIP-68 reference NFTs or CIP-25 auxiliary data.
 */
const createMintedAssetInfo = ({
  assetId,
  quantity,
  tx,
  logger,
}: CreateMintedAssetInfoArgs): AssetInfo => {
  const name = Cardano.AssetId.getAssetName(assetId);
  const policyId = Cardano.AssetId.getPolicyId(assetId);
  return {
    assetId,
    fingerprint: Cardano.AssetFingerprint.fromParts(policyId, name),
    name,
    policyId,
    quantity,
    supply: quantity,
    nftMetadata: getNftMetadata({ name, policyId, tx, logger }) ?? undefined,
  };
};

const mintedAssetsFromTx = (tx: Cardano.Tx, logger: Logger): AssetInfo[] => {
  if (!tx.body.mint) return [];
  return [...tx.body.mint.entries()]
    .filter(([, amount]) => amount > 0n)
    .map(([assetId, amount]) =>
      createMintedAssetInfo({ assetId, quantity: amount, tx, logger }),
    );
};

const createFallbackAssetInfo = (assetId: Cardano.AssetId): AssetInfo => {
  const name = Cardano.AssetId.getAssetName(assetId);
  const policyId = Cardano.AssetId.getPolicyId(assetId);
  return {
    assetId,
    fingerprint: Cardano.AssetFingerprint.fromParts(policyId, name),
    name,
    policyId,
    quantity: 0n,
    supply: 0n,
  };
};

/**
 * Merge our locally-cached `StoredTokenMetadata` (pulled from the tokens slice)
 * onto the synthesized `AssetInfo` so the SDK inspectors can emit names,
 * tickers, and images.
 */
const withTokenMetadata = (
  info: AssetInfo,
  stored: StoredTokenMetadata | undefined,
): AssetInfo => {
  if (!stored) return info;
  return {
    ...info,
    name: stored.name
      ? (stored.name as unknown as AssetInfo['name'])
      : info.name,
    tokenMetadata: {
      assetId: info.assetId,
      assetName: info.name,
      fingerprint: info.fingerprint,
      name: stored.name ?? '',
      ticker: stored.ticker,
      decimals: stored.decimals,
      desc: '',
      icon: stored.image,
      url: '',
    } as AssetInfo['tokenMetadata'],
  };
};

/**
 * v2 port of `@cardano-sdk/wallet`'s `createWalletAssetProvider`.
 *
 * Provides the `AssetProvider` interface expected by the SDK's
 * `tokenTransferInspector` and `transactionSummaryInspector`, built entirely
 * from v2 state:
 *
 * - cached token metadata from the `tokens` contract slice
 * - mint-witness synthesis from `tx.body.mint`
 * - CIP-68 reference-NFT metadata read from `output.datum`
 * - CIP-25 NFT metadata read from `tx.auxiliaryData.blob`
 *
 * On cache miss we also dispatch `loadTokenMetadata` so subsequent renders
 * pick up the richer data once the fetch completes.
 */
export const createDappAssetProvider = ({
  tokensMetadata,
  tx,
  dispatchLoadTokenMetadata,
  logger,
}: CreateDappAssetProviderArgs): AssetProvider => {
  const mintedAssets = mintedAssetsFromTx(tx, logger);
  const mintedAssetsById = new Map(mintedAssets.map(a => [a.assetId, a]));

  const resolveOne = (assetId: Cardano.AssetId): AssetInfo => {
    const tokenId = constructTokenId(assetId);
    const stored = tokensMetadata[tokenId];
    const minted = mintedAssetsById.get(assetId);

    if (!stored && !minted) {
      dispatchLoadTokenMetadata({ tokenId });
      return createFallbackAssetInfo(assetId);
    }

    const base = minted ?? createFallbackAssetInfo(assetId);
    const withMeta = withTokenMetadata(base, stored);

    if (!minted) {
      const cip68 = tryCip68NftMetadata({
        policyId: withMeta.policyId,
        name: withMeta.name,
        tx,
        logger,
      });
      if (cip68) return { ...withMeta, nftMetadata: cip68 };
    }

    return withMeta;
  };

  return {
    ...DUMMY_BLOCK,
    getAsset: async ({ assetId }) => resolveOne(assetId),
    getAssets: async ({ assetIds }) => assetIds.map(resolveOne),
  };
};
