import { Cardano } from '@cardano-sdk/core';
import {
  classifyCustodyAddress,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_LOVELACE_ASSET,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
} from '@lace-lib/cardano-custody';

import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { CardanoCustodyGrantScopeRequest } from '@lace-contract/cardano-context';

/**
 * The account validator hash of every custody contract version this SDK
 * supports, oldest first: the hash of the version's account proxy, which
 * never changes for an account. It is the payment script of every custody
 * account address and the policy id of every account's state NFT and grant
 * tokens. Records name their version by it, as `accountValidatorHash`.
 */
export const CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES: readonly Hash28ByteBase16[] =
  Object.freeze(
    SUPPORTED_CUSTODY_CONTRACT_VERSIONS.map(
      ({ accountValidatorHash }) => accountValidatorHash,
    ),
  );

/** The account validator hash of the version new custody accounts use. */
export const CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH: Hash28ByteBase16 =
  CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash;

/**
 * The hash of every logic script this SDK accepts for the accounts of a
 * supported version. An account's rules live in the logic its control datum
 * names, which a device may replace; the SDK neither operates nor signs for
 * an account under any other logic, and reports its state as `invalid` with
 * the reason `unknown-logic`. A record does not name the logic: the control
 * UTxO does.
 */
export const CARDANO_CUSTODY_LOGIC_HASHES: readonly Hash28ByteBase16[] =
  Object.freeze([
    ...new Set(
      SUPPORTED_CUSTODY_CONTRACT_VERSIONS.flatMap(({ logics }) =>
        logics.map(({ hash }) => hash),
      ),
    ),
  ]);

/** The hash of the logic script new custody accounts run. */
export const CARDANO_CUSTODY_LOGIC_HASH: Hash28ByteBase16 =
  CURRENT_CUSTODY_CONTRACT_VERSION.currentLogicHash;

/**
 * The asset of a lovelace grant: the empty policy id and the empty asset
 * name. A lovelace grant sets both lovelace caps to zero.
 */
export const CARDANO_CUSTODY_LOVELACE_ASSET: CardanoCustodyGrantScopeRequest['asset'] =
  Object.freeze({ ...CUSTODY_LOVELACE_ASSET });

/**
 * Whether an address, in bech32 or hex, is a custody account address of a
 * supported contract version on any network: a base address with the
 * account validator as payment credential and a script stake credential.
 *
 * It reads the address only. It does not prove that the stake script is a
 * custody stake script or that the account exists; an account record and the
 * account's synced state do. An address that pays the account validator with
 * no, a key or a pointer stake part is not an account address, and value
 * sent there can never be spent.
 */
export const isCardanoCustodyAccountAddress = (address: string): boolean => {
  const parsed =
    typeof address === 'string' ? Cardano.Address.fromString(address) : null;
  return !!parsed && classifyCustodyAddress(parsed).kind === 'account';
};
