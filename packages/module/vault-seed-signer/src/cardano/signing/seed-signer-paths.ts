import {
  accountDerivationPath,
  DerivationPath,
  Xfp,
} from '@lace-lib/cardano-seed-signer-protocol';

import type { MasterFingerprint } from '@lace-contract/cardano-context';

/** CIP-1852 role index for the stake key. */
export const ROLE_STAKE = 2;

/** CIP-1852 role index for the DRep key. */
export const ROLE_DREP = 3;

const EMPTY_XFP = Xfp(new Uint8Array(0), { allowEmpty: true });

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
 * requests. Absent fingerprints map to the empty 'unspecified' value the device
 * tolerates on optional fields.
 */
export const xfpFromMasterFingerprint = (
  masterFingerprint: MasterFingerprint | undefined,
): Xfp =>
  masterFingerprint === undefined
    ? EMPTY_XFP
    : Xfp.fromHex(masterFingerprint, { allowEmpty: true });
