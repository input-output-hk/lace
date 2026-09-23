import { Serialization } from '@cardano-sdk/core';
import {
  datumMatchesStakeKey,
  decodeDustMappingDatum,
} from '@lace-lib/cnight-dust-designation';

import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoStakeKeyHash,
  DustMappingDatumValue,
} from '@lace-lib/cnight-dust-designation';

type NightDesignationRegistrationUtxo = {
  utxo: Cardano.Utxo;
  datum: DustMappingDatumValue;
};

// Re-encoding is the one step that can THROW rather than return `undefined`:
// `fromCore` rejects a core datum it cannot serialize, and that would abort the
// whole scan. Every account's marker sits at this ONE address, so an escaping
// throw would block one account on another account's datum, with no retry able
// to clear it.
const decodeDatumOrSkip = (
  datum: Cardano.PlutusData,
): DustMappingDatumValue | undefined => {
  try {
    return decodeDustMappingDatum(
      Serialization.PlutusData.fromCore(datum).toCbor(),
    );
  } catch {
    return undefined;
  }
};

/**
 * Pick the account's registration out of the UTxOs sitting at the dust
 * generator's script address.
 *
 * A registration is identified by the singleton DUST-mapping NFT plus an
 * inline `DustMappingDatum` whose `c_wallet` verification-key hash is the
 * account's stake key hash. Undecodable datums belong to other accounts (or
 * to a future datum revision) and are skipped rather than treated as errors.
 */
export const findRegistrationUtxo = (
  scriptUtxos: readonly Cardano.Utxo[],
  nftAssetId: Cardano.AssetId,
  stakeKeyHash: CardanoStakeKeyHash,
): NightDesignationRegistrationUtxo | undefined => {
  for (const utxo of scriptUtxos) {
    const [, out] = utxo;
    if (out.value.assets?.get(nftAssetId) !== 1n) continue;
    if (!out.datum) continue;
    const datum = decodeDatumOrSkip(out.datum);
    if (datum && datumMatchesStakeKey(datum, stakeKeyHash)) {
      return { utxo, datum };
    }
  }
  return undefined;
};
