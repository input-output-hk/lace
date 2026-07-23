import {
  accountDerivationPath,
  DerivationPath,
  Xfp,
} from '@lace-lib/cardano-keystone-protocol';

import type { MasterFingerprint } from '@lace-contract/cardano-context';

/** CIP-1852 role index for the stake key. */
export const ROLE_STAKE = 2;

/** CIP-1852 role index for the DRep key. */
export const ROLE_DREP = 3;

/**
 * Builds the full CIP-1852 derivation path for an account role/index, appending
 * the role and address index to the hardened account prefix
 * (m/1852'/1815'/account'/role/index).
 */
export const fullDerivationPath = (
  accountIndex: number,
  role: number,
  index: number,
): DerivationPath =>
  DerivationPath([...accountDerivationPath(accountIndex), role, index]);

/**
 * Resolves the account master fingerprint to an Xfp for stamping signing
 * requests. Keystone requires a real 4-byte fingerprint to match the request
 * to the seed loaded on the device, so an absent fingerprint is an error.
 */
export const xfpFromMasterFingerprint = (
  masterFingerprint: MasterFingerprint | undefined,
): Xfp => {
  if (masterFingerprint === undefined) {
    throw new Error(
      'Keystone signing requires the account master fingerprint (xfp)',
    );
  }
  return Xfp.fromHex(masterFingerprint);
};
