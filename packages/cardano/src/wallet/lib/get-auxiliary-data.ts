import { Cardano } from '@cardano-sdk/core';

const metadatumLabel = '674';
const defaultSizeInBytes = 64;

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

const getSizeInBytes = (character: string) => Buffer.from(character, 'utf8').length;

export const getChunks = (input: string, chunkByteSize: number): string[] => {
  let size = 0;
  let start = 0;

  const lines = [];

  for (let char = 0; char < input.length; char++) {
    const isEndOfArray = char === input.length - 1;

    const currentSize = size + getSizeInBytes(input[char]);
    const nextCharSize = !isEndOfArray ? currentSize + getSizeInBytes(input[char + 1]) : chunkByteSize + 1;

    const shouldSliceString = currentSize === chunkByteSize || nextCharSize > chunkByteSize || isEndOfArray;

    if (shouldSliceString) {
      const chunk = input.slice(start, char + 1);

      lines.push(chunk);
      start = char + 1;
      size = 0;
    } else {
      size = currentSize;
    }
  }

  return lines;
};

const getCIP20Metadata = (msg: Cardano.Metadatum) => {
  // this follows https://github.com/cardano-foundation/CIPs/blob/master/CIP-0020/README.md basic JSON schema spec
  const label = BigInt(metadatumLabel);
  const msgMap = new Map([['msg', msg]]);
  return new Map([[label, msgMap]]);
};

export const createMetadata = (metadataString: string, customSizeInBytes?: number): Cardano.TxMetadata => {
  const sizeInBytes = customSizeInBytes ?? defaultSizeInBytes;

  if (getSizeInBytes(metadataString) <= sizeInBytes) {
    return getCIP20Metadata(metadataString);
  }

  // splits string into chunks no greater than n bytes in size
  const splittedMsg = getChunks(metadataString, sizeInBytes);
  return getCIP20Metadata(splittedMsg);
};

export const getAuxiliaryData = (auxiliaryData: { metadataString: string }): Cardano.AuxiliaryData => ({
  blob: createMetadata(auxiliaryData.metadataString)
});
