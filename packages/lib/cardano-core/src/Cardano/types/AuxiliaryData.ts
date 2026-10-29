import * as Crypto from '@lace-lib/cardano-crypto';

import * as Serialization from '../../Serialization/AuxiliaryData';

import type { Script } from './Script';
import type { Hash32ByteBase16 } from '@lace-lib/cardano-crypto';

export type MetadatumMap = Map<Metadatum, Metadatum>;

export type Metadatum =
  | Metadatum[]
  | MetadatumMap
  | Uint8Array
  | bigint
  | string;

export type TxMetadata = Map<bigint, Metadatum>;

export interface AuxiliaryData {
  blob?: TxMetadata;
  scripts?: Script[];
}

export const computeAuxiliaryDataHash = (
  data: AuxiliaryData | undefined,
): Hash32ByteBase16 | undefined =>
  data
    ? Crypto.blake2b.hash<Hash32ByteBase16>(
        Serialization.AuxiliaryData.fromCore(data).toCbor(),
        32,
      )
    : undefined;
