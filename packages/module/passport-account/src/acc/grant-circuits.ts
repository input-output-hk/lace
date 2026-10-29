import type { GrantOperation, GranteeScheme } from '@lace-contract/passport';

/**
 * The gated circuits the grant flows authorise, named once so the flow
 * that submits a call, the authoriser that builds its challenge and the
 * signer that scopes a key session to it agree on the circuit.
 */
export const ISSUE_GRANT_CIRCUIT = 'issue_grant_with_jubjub';
export const REVOKE_GRANT_CIRCUIT = 'revoke_grant_with_jubjub';
export const REVOKE_ALL_GRANTS_CIRCUIT = 'revoke_all_grants_with_jubjub';

/** The withdrawal each grant operation runs, before its arm suffix. */
const GRANT_WITHDRAWAL_BASES: Record<GrantOperation, string> = {
  'withdraw-unshielded': 'withdraw_unshielded',
  'withdraw-shielded': 'withdraw_shielded',
  'withdraw-shielded-to-contract': 'withdraw_shielded_to_contract',
};

/** The arm suffix of the grant withdrawals a grantee of each scheme runs. */
const GRANTEE_ARMS: Record<GranteeScheme, string> = {
  'jubjub-schnorr': 'with_grant_jubjub',
  'secp256k1-ecdsa': 'with_grant_k256',
};

/**
 * The withdrawal circuit a grantee of `scheme` runs to perform
 * `operation` under its grant.
 */
export const grantWithdrawalCircuit = (
  scheme: GranteeScheme,
  operation: GrantOperation,
): string => `${GRANT_WITHDRAWAL_BASES[operation]}_${GRANTEE_ARMS[scheme]}`;

/** The operations in the order the contract declares their withdrawals. */
const GRANT_OPERATIONS: readonly GrantOperation[] = [
  'withdraw-unshielded',
  'withdraw-shielded',
  'withdraw-shielded-to-contract',
];

/**
 * The withdrawal circuits a grantee of each scheme spends through. An
 * account holds them only when its deployment installed them, and a grant
 * to a grantee whose withdrawals the account lacks can never be spent.
 */
export const GRANTEE_WITHDRAWAL_CIRCUITS: Record<
  GranteeScheme,
  readonly string[]
> = {
  'jubjub-schnorr': GRANT_OPERATIONS.map(operation =>
    grantWithdrawalCircuit('jubjub-schnorr', operation),
  ),
  'secp256k1-ecdsa': GRANT_OPERATIONS.map(operation =>
    grantWithdrawalCircuit('secp256k1-ecdsa', operation),
  ),
};
