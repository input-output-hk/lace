import type { CardanoCustodyBuildError } from './build-transaction';
import type { Bip32PublicKeyHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { CustodyAccountRecord } from '@lace-lib/cardano-custody';

/**
 * A request to read what the chain holds at one creator index of one
 * contract version, on the current network. Nothing is built and no funding
 * is involved.
 *
 * The creator key is `m/1854'/1815'/a'/0/creatorIndex`, derived from
 * `deviceAccountPublicKey`: the CIP-1854 account key of account
 * `custodyDeviceAccountIndex(version, networkMagic)`. `creatorIndex` is a
 * soft (non-hardened) derivation index.
 */
export type CardanoCustodyCreatorIndexProbeRequest = {
  requestId: string;
  /** The contract version, named by its account validator hash. */
  accountValidatorHash: Hash28ByteBase16;
  deviceAccountPublicKey: Bip32PublicKeyHex;
  creatorIndex: number;
};

/**
 * What one creator index holds:
 *
 * - `unregistered`: nobody registered the stake credential; a creation
 *   could build here.
 * - `account`: the account of this creator key, with its record.
 * - `pre-registered`: the credential is registered but its address holds
 *   no state NFT. Someone registered it first, which blocks creation at the
 *   index forever.
 */
export type CardanoCustodyCreatorIndexProbeResult = {
  accountValidatorHash: Hash28ByteBase16;
  creatorIndex: number;
} & (
  | { status: 'account'; record: CustodyAccountRecord }
  | { status: 'pre-registered' }
  | { status: 'unregistered' }
);

/**
 * Why a creator index was not read: chain data was unavailable, the device
 * key or index does not derive (`invalid-operation`), or the contract
 * version is not a supported one.
 */
export type CardanoCustodyCreatorIndexProbeError =
  | Extract<CardanoCustodyBuildError, { code: 'build-failed' | 'unavailable' }>
  | {
      code: 'invalid-operation';
      reason: 'invalid-device-key' | 'invalid-start-index';
      message: string;
    }
  | {
      code: 'unsupported-contract-version';
      accountValidatorHash: string;
    };
