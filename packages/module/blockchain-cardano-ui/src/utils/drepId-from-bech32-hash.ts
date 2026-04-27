import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

export const drepIDasBech32FromHash = (
  value: Hash28ByteBase16,
): Cardano.DRepID =>
  Cardano.DRepID(HexBlob.toTypedBech32('drep', HexBlob(value)));
