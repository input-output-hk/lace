import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

export const drepIDasBech32FromHash = (value: Hash28ByteBase16): Cardano.DRepID =>
  // eslint-disable-next-line new-cap
  Cardano.DRepID(HexBlob.toTypedBech32('drep', HexBlob(value)));
