import {
  deriveCustodyAccountIdentity,
  findCustodyContractVersion,
} from '@lace-lib/cardano-custody';

import type { CardanoCustodyAccountProps } from '../types';
import type {
  CustodyAccountIdentity,
  CustodyAccountIdentityError,
  CustodyResult,
  CustodyUnsupportedContractVersion,
} from '@lace-lib/cardano-custody';

/** A persisted identity field that differs from the one the contract derives. */
interface CardanoCustodyIdentityMismatch {
  readonly code: 'identity-mismatch';
  readonly field: 'address' | 'rewardAccount' | 'stakeScriptHash';
  readonly stored: string;
  readonly derived: string;
}

export type CardanoCustodyAccountIdentityError =
  | CardanoCustodyIdentityMismatch
  | CustodyAccountIdentityError
  | CustodyUnsupportedContractVersion;

export type CardanoCustodyStoredIdentity = Pick<
  CardanoCustodyAccountProps,
  | 'accountValidatorHash'
  | 'address'
  | 'chainId'
  | 'creatorKeyHash'
  | 'rewardAccount'
  | 'stakeScriptHash'
>;

/**
 * Re-derives a persisted custody account's identity from its contract
 * version, creator key hash and chain, and refuses it unless the stored
 * stake script hash, address and reward account are exactly the derived
 * ones. Persisted props are only as trustworthy as storage, and an address
 * the contract does not govern for this creator must never be synced or
 * shown as the account.
 */
export const verifyCardanoCustodyAccountIdentity = (
  stored: CardanoCustodyStoredIdentity,
): CustodyResult<
  CustodyAccountIdentity,
  CardanoCustodyAccountIdentityError
> => {
  const contractVersion = findCustodyContractVersion(
    stored.accountValidatorHash,
  );
  if (!contractVersion.ok) return contractVersion;

  const derived = deriveCustodyAccountIdentity({
    contractVersion: contractVersion.value,
    creatorKeyHash: stored.creatorKeyHash,
    chainId: stored.chainId,
  });
  if (!derived.ok) return derived;

  const mismatch = (
    [
      [
        'stakeScriptHash',
        stored.stakeScriptHash,
        derived.value.stakeScriptHash,
      ],
      ['address', stored.address, derived.value.address],
      ['rewardAccount', stored.rewardAccount, derived.value.rewardAccount],
    ] as const
  ).find(([, storedValue, derivedValue]) => storedValue !== derivedValue);

  return mismatch
    ? {
        ok: false,
        error: {
          code: 'identity-mismatch',
          field: mismatch[0],
          stored: mismatch[1],
          derived: mismatch[2],
        },
      }
    : derived;
};
