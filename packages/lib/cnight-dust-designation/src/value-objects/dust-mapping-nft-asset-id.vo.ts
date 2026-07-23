import { getDustMappingNftAssetId } from '../plutus/script-address';

import type { CardanoDustNetwork } from './network-id.vo';
import type { Cardano } from '@cardano-sdk/core';
import type { Tagged } from 'type-fest';

// =====================================================================
// DustMappingNftAssetId — a narrowing of `Cardano.AssetId` for the
// specific DUST-mapping NFT minted by the dust generator validator.
// =====================================================================
// Same underlying type as `Cardano.AssetId` (already opaque). The
// extra Tagged layer makes it impossible to confuse with cNIGHT's
// `Cardano.AssetId` at call sites where both flow through the same
// hooks (`useCNightDesignation`, the "already designated?" filter,
// etc.). Construction is via the network's derived script hash;
// callers should not hand-construct.
// =====================================================================
export type DustMappingNftAssetId = Tagged<
  Cardano.AssetId,
  'DustMappingNftAssetId'
>;

export const DustMappingNftAssetId = (
  network: CardanoDustNetwork,
): DustMappingNftAssetId =>
  getDustMappingNftAssetId(network) as DustMappingNftAssetId;
