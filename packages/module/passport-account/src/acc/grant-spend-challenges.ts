import { pureCircuits } from './acc-module';
import { granteePoint } from './grant-rules';

import type {
  JubjubPoint,
  Secp256k1Point,
} from '@midnight-ntwrk/compact-runtime';

/**
 * What every grant spend challenge binds beyond the withdrawal itself:
 * the account the call executes against, the grantee key as its policy
 * writes it, the grant's id, and the `issuedAt` and `nonce` its record in
 * the account's grants map holds before the call, so a signature
 * authorises one call under one issue of one grant.
 */
export type GrantSpendContext = {
  contractAddress: Uint8Array;
  granteePublicKey: string;
  grantId: Uint8Array;
  issuedAt: bigint;
  nonce: bigint;
};

/** A shielded coin the account holds, as the shielded withdrawals spend it. */
export type GrantSpendCoin = {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
  mtIndex: bigint;
};

/** An unshielded withdrawal: its colour, amount and 32-byte recipient. */
export type GrantUnshieldedWithdrawal = {
  color: Uint8Array;
  amount: bigint;
  recipient: Uint8Array;
};

/**
 * A shielded withdrawal, to a coin public key or to a contract: its
 * colour, amount and 32-byte recipient, the inbox entry that announces
 * the change to the account, the account's current encryption public key
 * the contract checks it against, and the held coin it spends, the one
 * the contract's `held_coin` witness supplies for the colour.
 */
export type GrantShieldedWithdrawal = GrantUnshieldedWithdrawal & {
  changeEntry: Uint8Array;
  encPublicKey: Uint8Array;
  coin: GrantSpendCoin;
};

/**
 * A jubjub grant spend challenge, closed over the call: the signer varies
 * only the announcement `sigR` and the grind nonce.
 */
export type GrantSpendJubjubChallenge = (
  sigR: { x: bigint; y: bigint },
  grindNonce: bigint,
) => Uint8Array;

/**
 * The challenge builders of each grant withdrawal, by grantee scheme and
 * operation. A secp256k1 builder returns the challenge bytes, whose
 * SHA-256 digest the grantee signs; a jubjub builder returns the
 * challenge as a function of the announcement and grind nonce.
 */
export type GrantSpendChallenges = {
  'secp256k1-ecdsa': {
    'withdraw-unshielded': (
      context: GrantSpendContext,
      withdrawal: GrantUnshieldedWithdrawal,
    ) => Uint8Array;
    'withdraw-shielded': (
      context: GrantSpendContext,
      withdrawal: GrantShieldedWithdrawal,
    ) => Uint8Array;
    'withdraw-shielded-to-contract': (
      context: GrantSpendContext,
      withdrawal: GrantShieldedWithdrawal,
    ) => Uint8Array;
  };
  'jubjub-schnorr': {
    'withdraw-unshielded': (
      context: GrantSpendContext,
      withdrawal: GrantUnshieldedWithdrawal,
    ) => GrantSpendJubjubChallenge;
    'withdraw-shielded': (
      context: GrantSpendContext,
      withdrawal: GrantShieldedWithdrawal,
    ) => GrantSpendJubjubChallenge;
    'withdraw-shielded-to-contract': (
      context: GrantSpendContext,
      withdrawal: GrantShieldedWithdrawal,
    ) => GrantSpendJubjubChallenge;
  };
};

/** The grantee's secp256k1 point, read from the key its policy carries. */
const k256Point = (publicKey: string): Secp256k1Point => {
  const grantee = granteePoint({ scheme: 'secp256k1-ecdsa', publicKey });
  return grantee.point as Secp256k1Point;
};

/** The grantee's jubjub point, read from the key its policy carries. */
const jubjubPoint = (publicKey: string): JubjubPoint => {
  const grantee = granteePoint({ scheme: 'jubjub-schnorr', publicKey });
  return grantee.point;
};

const address = (context: GrantSpendContext) => ({
  bytes: context.contractAddress,
});

const coinOf = ({ coin }: GrantShieldedWithdrawal) => ({
  nonce: coin.nonce,
  color: coin.color,
  value: coin.value,
  mt_index: coin.mtIndex,
});

/**
 * The challenge builders of the grant withdrawals, for both grantee
 * schemes. The preimage layout is the contract's own: each builder calls
 * the pure circuit the withdrawal recomputes its challenge with, over the
 * account address, the grantee key, the grant id and issue time, the
 * withdrawal's arguments in declaration order and the record's nonce,
 * with the announcement and grind nonce first and last on the jubjub arm.
 * A shielded challenge also binds the change entry, the encryption key
 * and the held coin the withdrawal spends.
 */
export const grantSpendChallenges: GrantSpendChallenges = {
  'secp256k1-ecdsa': {
    'withdraw-unshielded': (context, withdrawal) =>
      pureCircuits.challenge_withdraw_unshielded_with_grant_k256(
        address(context),
        k256Point(context.granteePublicKey),
        context.grantId,
        context.issuedAt,
        withdrawal.color,
        withdrawal.amount,
        { bytes: withdrawal.recipient },
        context.nonce,
      ),
    'withdraw-shielded': (context, withdrawal) =>
      pureCircuits.challenge_withdraw_shielded_with_grant_k256(
        address(context),
        k256Point(context.granteePublicKey),
        context.grantId,
        context.issuedAt,
        { bytes: withdrawal.recipient },
        withdrawal.color,
        withdrawal.amount,
        withdrawal.changeEntry,
        withdrawal.encPublicKey,
        coinOf(withdrawal),
        context.nonce,
      ),
    'withdraw-shielded-to-contract': (context, withdrawal) =>
      pureCircuits.challenge_withdraw_shielded_to_contract_with_grant_k256(
        address(context),
        k256Point(context.granteePublicKey),
        context.grantId,
        context.issuedAt,
        { bytes: withdrawal.recipient },
        withdrawal.color,
        withdrawal.amount,
        withdrawal.changeEntry,
        withdrawal.encPublicKey,
        coinOf(withdrawal),
        context.nonce,
      ),
  },
  'jubjub-schnorr': {
    'withdraw-unshielded': (context, withdrawal) => {
      const pk = jubjubPoint(context.granteePublicKey);
      return (sigR, grindNonce) =>
        pureCircuits.challenge_withdraw_unshielded_with_grant_jubjub(
          address(context),
          sigR,
          pk,
          context.grantId,
          context.issuedAt,
          withdrawal.color,
          withdrawal.amount,
          { bytes: withdrawal.recipient },
          context.nonce,
          grindNonce,
        );
    },
    'withdraw-shielded': (context, withdrawal) => {
      const pk = jubjubPoint(context.granteePublicKey);
      return (sigR, grindNonce) =>
        pureCircuits.challenge_withdraw_shielded_with_grant_jubjub(
          address(context),
          sigR,
          pk,
          context.grantId,
          context.issuedAt,
          { bytes: withdrawal.recipient },
          withdrawal.color,
          withdrawal.amount,
          withdrawal.changeEntry,
          withdrawal.encPublicKey,
          coinOf(withdrawal),
          context.nonce,
          grindNonce,
        );
    },
    'withdraw-shielded-to-contract': (context, withdrawal) => {
      const pk = jubjubPoint(context.granteePublicKey);
      return (sigR, grindNonce) =>
        pureCircuits.challenge_withdraw_shielded_to_contract_with_grant_jubjub(
          address(context),
          sigR,
          pk,
          context.grantId,
          context.issuedAt,
          { bytes: withdrawal.recipient },
          withdrawal.color,
          withdrawal.amount,
          withdrawal.changeEntry,
          withdrawal.encPublicKey,
          coinOf(withdrawal),
          context.nonce,
          grindNonce,
        );
    },
  },
};
