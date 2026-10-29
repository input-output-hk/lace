import { GrantSlot, GrantSpendRefusedError } from '@lace-contract/passport';
import { sha256 } from '@lace-lib/crypto';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { grantWithdrawalCircuit } from './grant-circuits';
import { granteePoint, RECIPIENT_KINDS, zero32 } from './grant-rules';
import { grantSpendChallenges } from './grant-spend-challenges';
import { deriveGrantId, K256_GRANT_ENVELOPE, originHash } from './grants';

import type {
  GrantShieldedWithdrawal,
  GrantSpendContext,
  GrantSpendJubjubChallenge,
  GrantUnshieldedWithdrawal,
} from './grant-spend-challenges';
import type {
  GrantOperation,
  GrantRecipient,
  GranteeScheme,
} from '@lace-contract/passport';

export { grantSpendChallenges } from './grant-spend-challenges';

/**
 * The fields of an agent policy a spend is prepared from, in the form the
 * policy carries them: hex for the account, ids, keys, salt and colour,
 * decimal strings for amounts, and `expiresAt` in POSIX seconds, or null
 * for a grant that never expires.
 */
export type GrantSpendPolicy = {
  account: string;
  grantId: string;
  slot: number;
  granteeScheme: GranteeScheme;
  granteePublicKey: string;
  scopeSalt: string;
  color: string;
  recipient: GrantRecipient;
  maxCoinValue: string;
  perCallCap: string;
  cap: string;
  operations: readonly GrantOperation[];
  origin: string;
  expiresAt: number | null;
};

/**
 * One spend under a grant: the operation, the withdrawal's own arguments
 * but the colour, which is the grant's, and what the call is bound to on
 * the ledger. `issuedAt` and `nonce` are the values the grant's record in
 * the account's grants map holds before the call, and `spent` is the
 * total the grant has spent before it, which the contract checks against
 * the commitment it keeps; it starts at zero and grows by each amount the
 * chain accepts. A shielded spend's `coin` is bound into the challenge
 * but is not a call argument: the contract reads it through its
 * `held_coin` witness.
 */
export type GrantSpend = { issuedAt: bigint; nonce: bigint; spent: bigint } & (
  | (Omit<GrantShieldedWithdrawal, 'color'> & {
      operation: 'withdraw-shielded-to-contract' | 'withdraw-shielded';
    })
  | (Omit<GrantUnshieldedWithdrawal, 'color'> & {
      operation: 'withdraw-unshielded';
    })
);

/**
 * A grant spend ready to sign: the withdrawal circuit to call, its
 * arguments up to the signature, and the challenge the grantee signs. A
 * secp256k1 grantee signs `digest`, the SHA-256 of `challenge`, as an
 * ECDSA prehash; a jubjub grantee Schnorr-signs the challenge function.
 * The call's full arguments are `args` followed by the
 * authorisation arguments of the signature. A shielded call must run
 * with the `held_coin` witness returning exactly the spend's `coin`,
 * `mt_index` included, for the grant's colour.
 */
export type GrantSpendCall =
  | {
      scheme: 'jubjub-schnorr';
      circuit: string;
      args: unknown[];
      challenge: GrantSpendJubjubChallenge;
    }
  | {
      scheme: 'secp256k1-ecdsa';
      circuit: string;
      args: unknown[];
      challenge: Uint8Array;
      digest: Uint8Array;
    };

/** The recipient kind each withdrawal pays, which a pinned grant must name. */
const PAID_RECIPIENT_KINDS: Record<GrantOperation, GrantRecipient['kind']> = {
  'withdraw-unshielded': 'user-address',
  'withdraw-shielded': 'coin-public-key',
  'withdraw-shielded-to-contract': 'contract-address',
};

const refuse = (reason: string): never => {
  throw new GrantSpendRefusedError(
    `The grant does not allow this spend: ${reason}.`,
  );
};

const bytesOf = (hex: string): Uint8Array => ByteArray.fromHex(HexBytes(hex));

/**
 * Checks a spend against the grant's scope as its policy states it, in
 * the contract's order, so a spend the contract would refuse is caught
 * before it is signed and proved. Expiry is checked against this
 * machine's clock, which the contract checks again against the block's.
 */
const assertSpendAllowed = (
  policy: GrantSpendPolicy,
  spend: GrantSpend,
): void => {
  const { expiresAt } = policy;
  if (expiresAt !== null && Math.floor(Date.now() / 1000) >= expiresAt) {
    refuse(`it expired at ${expiresAt}`);
  }
  if (!policy.operations.includes(spend.operation)) {
    refuse(`${spend.operation} is not in its scope`);
  }
  if (spend.amount > BigInt(policy.perCallCap)) {
    refuse(`${spend.amount} is above the per-call cap ${policy.perCallCap}`);
  }
  if (spend.spent + spend.amount > BigInt(policy.cap)) {
    refuse(
      `${spend.amount} after ${spend.spent} spent exceeds the cap ${policy.cap}`,
    );
  }
  const { recipient } = policy;
  if (recipient.kind !== 'any') {
    if (recipient.kind !== PAID_RECIPIENT_KINDS[spend.operation]) {
      refuse(
        `it pins a ${recipient.kind} recipient, which ${spend.operation} does not pay`,
      );
    }
    if (HexBytes.fromByteArray(spend.recipient) !== recipient.value) {
      refuse('the recipient is not the one it pins');
    }
  }
  if (spend.operation !== 'withdraw-unshielded') {
    if (HexBytes.fromByteArray(spend.coin.color) !== policy.color) {
      refuse('the coin is not of its colour');
    }
    if (spend.coin.value > BigInt(policy.maxCoinValue)) {
      refuse(
        `the coin of ${spend.coin.value} is above its coin bound ${policy.maxCoinValue}`,
      );
    }
    if (spend.coin.value < spend.amount) {
      refuse(
        `the coin of ${spend.coin.value} cannot pay the amount ${spend.amount}`,
      );
    }
  }
};

/** The withdrawal's own arguments, in the circuit's declaration order. */
const withdrawalArgs = (spend: GrantSpend, color: Uint8Array): unknown[] =>
  spend.operation === 'withdraw-unshielded'
    ? [color, spend.amount, { bytes: spend.recipient }]
    : [
        { bytes: spend.recipient },
        color,
        spend.amount,
        spend.changeEntry,
        spend.encPublicKey,
      ];

const k256Challenge = (
  context: GrantSpendContext,
  spend: GrantSpend,
  color: Uint8Array,
): Uint8Array => {
  const builders = grantSpendChallenges['secp256k1-ecdsa'];
  switch (spend.operation) {
    case 'withdraw-unshielded':
      return builders[spend.operation](context, { ...spend, color });
    case 'withdraw-shielded':
      return builders[spend.operation](context, { ...spend, color });
    case 'withdraw-shielded-to-contract':
      return builders[spend.operation](context, { ...spend, color });
  }
};

const jubjubChallenge = (
  context: GrantSpendContext,
  spend: GrantSpend,
  color: Uint8Array,
): GrantSpendJubjubChallenge => {
  const builders = grantSpendChallenges['jubjub-schnorr'];
  switch (spend.operation) {
    case 'withdraw-unshielded':
      return builders[spend.operation](context, { ...spend, color });
    case 'withdraw-shielded':
      return builders[spend.operation](context, { ...spend, color });
    case 'withdraw-shielded-to-contract':
      return builders[spend.operation](context, { ...spend, color });
  }
};

/**
 * Prepares a spend under the grant a policy describes: checks it against
 * the grant's scope, checks that the policy's grant id derives from its
 * account, grantee key, origin and slot, and returns the withdrawal
 * circuit, its arguments up to the signature and the challenge to sign.
 * The arguments carry the grantee key, the origin hash, the slot, the
 * scope salt and the object fields the contract opens its commitments
 * with, and on the secp256k1 arm the plain ECDSA envelope.
 *
 * @throws {@link GrantSpendRefusedError} when the grant does not allow
 * the spend, or the policy's grant id is not its own.
 */
export const prepareGrantSpend = async (
  policy: GrantSpendPolicy,
  spend: GrantSpend,
): Promise<GrantSpendCall> => {
  assertSpendAllowed(policy, spend);
  const contractAddress = bytesOf(policy.account);
  const grantee = granteePoint({
    scheme: policy.granteeScheme,
    publicKey: policy.granteePublicKey,
  });
  const origin = await originHash(policy.origin);
  const grantId = deriveGrantId({
    contractAddress,
    granteePublicKey: grantee,
    originHash: origin,
    slot: GrantSlot(policy.slot),
  });
  if (grantId !== policy.grantId) {
    refuse(
      `its id ${policy.grantId} does not derive from the policy's account, grantee, origin and slot`,
    );
  }
  const color = bytesOf(policy.color);
  const context: GrantSpendContext = {
    contractAddress,
    granteePublicKey: policy.granteePublicKey,
    grantId: bytesOf(grantId),
    issuedAt: spend.issuedAt,
    nonce: spend.nonce,
  };
  const scopeArgs = [
    origin,
    BigInt(policy.slot),
    bytesOf(policy.scopeSalt),
    RECIPIENT_KINDS[policy.recipient.kind],
    policy.recipient.kind === 'any'
      ? zero32()
      : bytesOf(policy.recipient.value),
    BigInt(policy.maxCoinValue),
    spend.spent,
  ];
  const circuit = grantWithdrawalCircuit(policy.granteeScheme, spend.operation);
  if (grantee.scheme === 'secp256k1-ecdsa') {
    const challenge = k256Challenge(context, spend, color);
    return {
      scheme: grantee.scheme,
      circuit,
      args: [
        ...withdrawalArgs(spend, color),
        grantee.point,
        K256_GRANT_ENVELOPE,
        ...scopeArgs,
      ],
      challenge,
      digest: sha256(challenge),
    };
  }
  return {
    scheme: grantee.scheme,
    circuit,
    args: [...withdrawalArgs(spend, color), grantee.point, ...scopeArgs],
    challenge: jubjubChallenge(context, spend, color),
  };
};
