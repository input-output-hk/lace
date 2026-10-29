import { Serialization } from '@cardano-sdk/core';

import { SUPPORTED_CUSTODY_CONTRACT_VERSIONS } from '../contract-version';

import { isKnownCustodyLogic, viewOfOutput } from './outputs';
import { scriptHashOfRewardAccount } from './transaction-facts';
import { policyIdOf } from './value';

import type { CustodyAccountHashes } from './outputs';
import type { Cardano } from '@cardano-sdk/core';

/** An output of the transaction or of one of its sub-transactions. */
type CustodyEffectLocation =
  | {
      readonly index: number;
      readonly kind: 'output';
      readonly subTransactionIndex?: number;
    }
  | { readonly kind: 'collateral-return' };

/**
 * One element of a transaction that involves a custody account. Only a
 * `deposit` leaves the account untouched: a datum-free payment to a custody
 * account address.
 */
type CustodyEffectReason =
  | {
      /** A datum at the account validator payment credential: a control, grant or reserve datum. */
      readonly kind: 'output-datum';
      readonly location: CustodyEffectLocation;
    }
  | {
      /** A datum-free payment to the account validator that no redeemer can spend. */
      readonly kind: 'unspendable-output';
      readonly location: CustodyEffectLocation;
    }
  | {
      /** A known logic attached as a witness script. */
      readonly kind: 'logic-witness';
      readonly subTransactionIndex?: number;
    }
  | {
      /** A state NFT or grant token minted or burned. */
      readonly assetId: Cardano.AssetId;
      readonly kind: 'account-token-mint';
      readonly subTransactionIndex?: number;
    }
  | {
      /** A token under an account validator policy: a state NFT or a grant token. */
      readonly kind: 'account-token';
      readonly location: CustodyEffectLocation;
    }
  | {
      /** A withdrawal from the stake credential of a known logic: the logic run of an account operation. */
      readonly kind: 'logic-withdrawal';
      readonly rewardAccount: Cardano.RewardAccount;
      readonly subTransactionIndex?: number;
    }
  | {
      readonly account: CustodyAccountHashes;
      readonly kind: 'deposit';
      readonly location: CustodyEffectLocation;
    }
  | {
      readonly kind: 'account-validator-witness';
      readonly subTransactionIndex?: number;
    };

export interface CustodyEffects {
  /** Whether the transaction carries any custody element other than a deposit. */
  readonly custodyTouching: boolean;
  /** Whether its only custody elements are deposits. */
  readonly depositOnly: boolean;
  readonly reasons: readonly CustodyEffectReason[];
}

const ACCOUNT_VALIDATOR_HASHES = new Set<string>(
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS.map(
    version => version.accountValidatorHash,
  ),
);

const outputReasons = (
  txOut: Cardano.TxOut,
  location: CustodyEffectLocation,
): CustodyEffectReason[] => {
  const view = viewOfOutput(txOut);
  const reasons: CustodyEffectReason[] = [];
  const isHoldingAccountToken = [...view.value.assets.keys()].some(assetId =>
    ACCOUNT_VALIDATOR_HASHES.has(policyIdOf(assetId)),
  );
  if (isHoldingAccountToken) reasons.push({ kind: 'account-token', location });
  const { addressClass } = view;
  if (addressClass.kind === 'other') return reasons;
  if (view.datumKind !== 'none') {
    reasons.push({ kind: 'output-datum', location });
  } else if (addressClass.kind === 'unspendable') {
    reasons.push({ kind: 'unspendable-output', location });
  } else if (!isHoldingAccountToken) {
    reasons.push({
      kind: 'deposit',
      location,
      account: {
        accountValidatorHash: addressClass.contractVersion.accountValidatorHash,
        stakeScriptHash: addressClass.stakeScriptHash,
      },
    });
  }
  return reasons;
};

interface ScannedBody {
  readonly outputs: readonly Cardano.TxOut[];
  readonly collateralReturn?: Cardano.TxOut;
  readonly mint?: Cardano.TokenMap;
  readonly withdrawals?: readonly Cardano.Withdrawal[];
  readonly scripts: readonly Cardano.Script[];
  readonly subTransactionIndex?: number;
}

const bodyReasons = ({
  outputs,
  collateralReturn,
  mint,
  withdrawals,
  scripts,
  subTransactionIndex,
}: ScannedBody): CustodyEffectReason[] => {
  const within =
    subTransactionIndex === undefined ? {} : { subTransactionIndex };
  const scriptHashes = scripts.map(script =>
    Serialization.Script.fromCore(script).hash(),
  );
  return [
    ...outputs.flatMap((txOut, index) =>
      outputReasons(txOut, { kind: 'output', index, ...within }),
    ),
    ...(collateralReturn
      ? outputReasons(collateralReturn, { kind: 'collateral-return' })
      : []),
    ...[...(mint?.keys() ?? [])]
      .filter(assetId =>
        ACCOUNT_VALIDATOR_HASHES.has(policyIdOf(assetId).toLowerCase()),
      )
      .map(
        (assetId): CustodyEffectReason => ({
          kind: 'account-token-mint',
          assetId,
          ...within,
        }),
      ),
    ...(scriptHashes.some(hash => ACCOUNT_VALIDATOR_HASHES.has(hash))
      ? [{ kind: 'account-validator-witness' as const, ...within }]
      : []),
    ...(withdrawals ?? [])
      .filter(({ stakeAddress }) => {
        const scriptHash = scriptHashOfRewardAccount(stakeAddress);
        return scriptHash !== undefined && isKnownCustodyLogic(scriptHash);
      })
      .map(
        ({ stakeAddress }): CustodyEffectReason => ({
          kind: 'logic-withdrawal',
          rewardAccount: stakeAddress,
          ...within,
        }),
      ),
    ...(scriptHashes.some(isKnownCustodyLogic)
      ? [{ kind: 'logic-witness' as const, ...within }]
      : []),
  ];
};

/**
 * The custody elements of a transaction, read from its bytes alone, for a
 * signing kind that has no resolutions. A transaction is custody-touching
 * when an output or the collateral return at an account validator payment
 * credential carries a datum, an output holds an account token, an account
 * token is minted or burned, a withdrawal runs a known logic, or a witness
 * script is an account validator or a known logic; sub-transactions count
 * as part of it. A datum-free payment to a custody
 * account address is a deposit, and a datum-free payment to the account
 * validator with any other stake part, which nothing can ever spend, also
 * counts as touching. A deposit under an inline datum is a reserve only a
 * device can spend, so it is touching too.
 *
 * Inputs name no address without resolutions, but every transaction the
 * account validator lets spend a custody UTxO also spends an account token
 * and pays it back with an inline datum: an owner operation recreates the
 * control UTxO with its state NFT, a grant spend recreates the grant UTxO
 * with its grant token, and a sweep spends the control UTxO beside the
 * grants it burns. So its outputs show the spend. Every such transaction
 * also runs the account's logic through a withdrawal from the logic's stake
 * credential, which the body shows whether the scripts are attached or
 * referenced; an attached account validator or logic witness is a further
 * signal. A withdrawal or a delegation that only references the control
 * UTxO runs no logic and leaves no trace in the body; it needs the
 * signature of a listed device, a CIP-1854 key that the ordinary signing
 * kinds never derive.
 */
export const detectCustodyEffects = (
  transaction: Serialization.Transaction,
): CustodyEffects => {
  const { body, witness } = transaction.toCore();
  const reasons = [
    ...bodyReasons({ ...body, scripts: witness.scripts ?? [] }),
    ...(body.subTransactions ?? []).flatMap(
      (subTransaction, subTransactionIndex) =>
        bodyReasons({
          ...subTransaction.body,
          scripts: subTransaction.witness.scripts ?? [],
          subTransactionIndex,
        }),
    ),
  ];
  const isTouching = reasons.some(({ kind }) => kind !== 'deposit');
  return {
    custodyTouching: isTouching,
    depositOnly: reasons.length > 0 && !isTouching,
    reasons,
  };
};
