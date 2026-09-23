import { Cardano, Serialization } from '@cardano-sdk/core';
import { blake2b } from '@cardano-sdk/crypto';

import type * as Crypto from '@cardano-sdk/crypto';

const CBOR_EMPTY_MAP = new Uint8Array([0xa0]);

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(
    hex.match(/.{1,2}/g)?.map(byte => Number.parseInt(byte, 16)) ?? [],
  );

const encodeDatumsSet = (datums: Cardano.PlutusData[]): Uint8Array =>
  // CborSet is what TransactionWitnessSet serializes field 4 (plutus_data)
  // with, so the preimage byte-matches the wire bytes the node re-hashes — in
  // the Conway era a tag-258 nonempty_set, NOT the plain Alonzo/Babbage array.
  hexToBytes(
    Serialization.CborSet.fromCore(
      datums,
      Serialization.PlutusData.fromCore,
    ).toCbor(),
  );

/**
 * Conway-era script-data hash. Reproduces the ledger's `hashScriptIntegrity`
 * preimage — redeemers ‖ datums ‖ language views — encoding redeemers and
 * datums with the SAME serializers the witness set uses (Conway redeemer MAP,
 * tag-258 datum set).
 *
 * `@cardano-sdk/tx-construction`'s `computeScriptDataHash` still emits the
 * Alonzo ARRAY forms here regardless of the era, so the node recomputes a
 * different hash from the witness bytes and rejects submit with
 * PPViewHashesDontMatch. Requires `setInConwayEra(true)` (set in the
 * TransactionBuilder ctor) so the serializers select the Conway forms.
 *
 * @throws Error When a used language has no cost model in `costModels`.
 */
export const computeConwayScriptDataHash = (params: {
  costModels: Cardano.CostModels;
  usedLanguages: Cardano.PlutusLanguageVersion[];
  redeemers: Cardano.Redeemer[];
  datums: Cardano.PlutusData[] | undefined;
}): Crypto.Hash32ByteBase16 | undefined => {
  const { costModels, usedLanguages, redeemers, datums } = params;
  const hasRedeemers = redeemers.length > 0;
  const hasDatums = (datums?.length ?? 0) > 0;
  if (!hasRedeemers && !hasDatums) return undefined;

  const requiredCostModels = new Serialization.Costmdls();
  for (const language of usedLanguages) {
    const costModel = costModels.get(language);
    // Skipping the language would hash an incomplete language view while the
    // node hashes the full one — an unexplained PPViewHashesDontMatch at submit
    // rather than a diagnosable failure here.
    if (!costModel) {
      throw new Error(
        `Missing cost model for Plutus${Cardano.PlutusLanguageVersion[language]} in the protocol parameters`,
      );
    }
    requiredCostModels.insert(new Serialization.CostModel(language, costModel));
  }

  const writer = new Serialization.CborWriter();

  if (hasDatums && !hasRedeemers) {
    // Datums but no redeemers: the ledger brackets the datums with an empty
    // redeemer map and an empty language-view map.
    writer.writeEncodedValue(CBOR_EMPTY_MAP);
    writer.writeEncodedValue(encodeDatumsSet(datums!));
    writer.writeEncodedValue(CBOR_EMPTY_MAP);
  } else {
    writer.writeEncodedValue(
      hexToBytes(Serialization.Redeemers.fromCore(redeemers).toCbor()),
    );
    if (hasDatums) {
      writer.writeEncodedValue(encodeDatumsSet(datums!));
    }
    writer.writeEncodedValue(
      hexToBytes(requiredCostModels.languageViewsEncoding()),
    );
  }

  return blake2b.hash(writer.encodeAsHex(), 32);
};
