import { GRANTEE_WITHDRAWAL_CIRCUITS } from './grant-circuits';

/** Gated circuit bases the contract exports once per authorisation arm. */
const GATED_CIRCUIT_BASES = [
  'withdraw_unshielded',
  'append_inbox',
  'withdraw_shielded',
  'withdraw_shielded_to_contract',
  'rotate_enc_key',
  'add_device',
  'remove_device',
] as const;

/** Every impure circuit of the jubjub arm, activation included. */
const JUBJUB_ARM_CIRCUITS = [
  'activate_initial_device',
  ...GATED_CIRCUIT_BASES,
].map(base => `${base}_with_jubjub`);

/** Permissionless deposit circuits shared by all arms. */
const SHARED_CIRCUITS = ['deposit_unshielded', 'deposit_shielded'];

/** The grant lifecycle circuits, authorised by a jubjub device. */
const GRANT_LIFECYCLE_BASES = [
  'issue_grant',
  'revoke_grant',
  'revoke_all_grants',
] as const;

/**
 * The scoped grant circuits: the lifecycle a jubjub device authorises,
 * then the withdrawals of a jubjub grantee and of a secp256k1 grantee.
 */
const GRANT_CIRCUITS = [
  ...GRANT_LIFECYCLE_BASES.map(base => `${base}_with_jubjub`),
  ...GRANTEE_WITHDRAWAL_CIRCUITS['jubjub-schnorr'],
  ...GRANTEE_WITHDRAWAL_CIRCUITS['secp256k1-ecdsa'],
];

/**
 * The complete operation set this module deploys, in installation order:
 * the deposits, the jubjub device arm and the grant circuits. The device
 * arm is jubjub only: the compiled contract also carries k256 and P-256
 * device arms, their grant lifecycles and the recovery circuits, and none
 * of their verifier keys are installed, so on an account deployed here
 * only jubjub devices can ever authorise. A grant may name a jubjub or a
 * secp256k1 grantee, so the withdrawals of both grantee arms are
 * installed.
 */
export const DEPLOYED_OPERATIONS: readonly string[] = [
  ...SHARED_CIRCUITS,
  ...JUBJUB_ARM_CIRCUITS,
  ...GRANT_CIRCUITS,
];
