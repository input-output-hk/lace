import { Cardano } from '@cardano-sdk/core';
import { CIP20 } from '@cardano-sdk/tx-construction';

export const cardanoMetadatumToObj = (metadatum: Cardano.Metadatum): string | unknown[] => {
  if (typeof metadatum === 'string') {
    return metadatum;
  }

  if (typeof metadatum === 'bigint') {
    return metadatum.toString();
  }

  if (metadatum instanceof Map) {
    // Should we call cardanometadatumToObj on the key and stringify the returned value?
    // key can be a Metadatum as well
    return [...metadatum.entries()].map(([key, value]) => ({ [key.toString()]: cardanoMetadatumToObj(value) }));
  }

  if (Array.isArray(metadatum)) {
    return metadatum.map((item) => cardanoMetadatumToObj(item));
  }

  return new TextDecoder().decode(metadatum);
};

export const getAuxiliaryData = (auxiliaryData: { metadataString: string }): Cardano.AuxiliaryData => ({
  blob: CIP20.toTxMetadata(auxiliaryData.metadataString)
});
