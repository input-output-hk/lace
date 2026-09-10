import { Cardano } from '@cardano-sdk/core';

import { truncateMiddle } from './truncate-middle';

/**
 * What to call an asset with nothing but its id. The id carries the name on
 * chain — the second half of `policyId + assetNameHex` — so the tokens the user
 * would recognise ("HOSKY", "SpaceBud1234") name themselves without any
 * metadata lookup.
 *
 * The id is the fallback, elided, for the two cases that have no name to show:
 * assets minted without one, and names that are arbitrary bytes rather than
 * text. The SDK throws on the latter (CIP-68 prefixes and binary names are
 * legal on chain), and a label is never worth failing a migration over, so the
 * throw is caught rather than allowed to take down the review screen.
 */
export const assetLabel = (assetId: string): string => {
  try {
    return (
      Cardano.AssetName.toUTF8(
        Cardano.AssetId.getAssetName(Cardano.AssetId(assetId)),
        true,
      ).trim() || truncateMiddle(assetId)
    );
  } catch {
    return truncateMiddle(assetId);
  }
};
