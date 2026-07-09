import { Serialization } from '@cardano-sdk/core';

import type { HexBlob } from '@cardano-sdk/util';

/**
 * Encodes a CBOR set from its serialized elements, as a plain array or with the
 * tag-258 set wrapper. Written explicitly to avoid the global 'inConwayEra' flag.
 */
export const encodeCborSet = (
  elementsCbor: HexBlob[],
  tagged: boolean,
): HexBlob => {
  const writer = new Serialization.CborWriter();
  if (tagged) writer.writeTag(Serialization.CborTag.Set);
  writer.writeStartArray(elementsCbor.length);
  for (const element of elementsCbor) {
    writer.writeEncodedValue(Buffer.from(element, 'hex'));
  }
  return writer.encodeAsHex();
};
