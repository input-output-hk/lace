import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * A grant spend this wallet built and has not yet submitted: the inputs it
 * takes, with their resolutions, until its validity window closes.
 */
type FundHold = {
  txId: Cardano.TransactionId;
  inputs: readonly Cardano.TxIn[];
  resolvedInputs: readonly Cardano.Utxo[];
  /** POSIX milliseconds after which the spend can no longer be included. */
  expiresAt: number;
};

/**
 * What one grantee holds: the spend it built last, and a build in flight,
 * which settles once that build holds its inputs or fails.
 */
type GranteeHolds = { built?: FundHold; building?: Promise<void> };

type GrantSpender = { accountId: AccountId; grantee: Ed25519KeyHashHex };

/** Each wallet's holds, by its store, then by account and grantee. */
const holdsByWallet = new WeakMap<
  object,
  Map<AccountId, Map<string, GranteeHolds>>
>();

const accountHolds = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
): Map<string, GranteeHolds> => {
  let accounts = holdsByWallet.get(wallet.stateObservables);
  if (!accounts) {
    accounts = new Map();
    holdsByWallet.set(wallet.stateObservables, accounts);
  }
  let holds = accounts.get(accountId);
  if (!holds) {
    holds = new Map();
    accounts.set(accountId, holds);
  }
  return holds;
};

/** Keeps a grantee's entry only while it holds a spend or builds one. */
const setGranteeHolds = (
  holds: Map<string, GranteeHolds>,
  holder: string,
  { built, building }: GranteeHolds,
): void => {
  if (built || building) {
    holds.set(holder, {
      ...(built && { built }),
      ...(building && { building }),
    });
  } else {
    holds.delete(holder);
  }
};

/**
 * The inputs of the account's grant spends that this wallet built for other
 * grantees and has not submitted, while they can still be included. A new
 * spend leaves them out, so spends built side by side take disjoint funds.
 * Once a spend is submitted, its pending activity keeps its inputs out of
 * every build instead. Read it only once the earlier builds of a
 * {@link beginGrantSpendBuild} have settled.
 */
export const inputsHeldByOtherGrantees = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { accountId, grantee }: GrantSpender,
  now: number,
): Cardano.TxIn[] => {
  const holds = accountHolds(wallet, accountId);
  const held: Cardano.TxIn[] = [];
  for (const [holder, { built, building }] of holds) {
    if (built && built.expiresAt <= now) {
      setGranteeHolds(holds, holder, { building });
    } else if (built && holder !== grantee.toLowerCase()) {
      held.push(...built.inputs);
    }
  }
  return held;
};

/**
 * A build of a grant spend for one grantee, holding its place among the
 * account's grant spends until it holds the inputs it took or fails.
 */
type GrantSpendBuild = {
  /**
   * Settles once every build for another grantee of the account begun
   * before this one has held its inputs or failed: only then do
   * {@link inputsHeldByOtherGrantees} name every input this build must
   * leave out.
   */
  readonly earlierBuilds: Promise<void>;
  /**
   * Holds the inputs of the spend built for the grantee until it is
   * submitted or `expiresAt` passes. It replaces the grantee's earlier
   * hold: the two spends take the same grant UTxO, so at most one of them
   * lands.
   */
  readonly hold: (hold: FundHold) => void;
  /**
   * Ends the build without a spend, keeping the grantee's earlier hold. A
   * build that already held its inputs is left as it is.
   */
  readonly release: () => void;
};

/**
 * Begins a build of a grant spend for `grantee`. A later build for another
 * grantee of the account waits for it before it reads the held inputs, so
 * two spends built side by side never select the same fund. One grantee
 * runs one build at a time, which the caller ensures.
 */
export const beginGrantSpendBuild = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { accountId, grantee }: GrantSpender,
): GrantSpendBuild => {
  const holds = accountHolds(wallet, accountId);
  const holder = grantee.toLowerCase();
  const earlier = [...holds]
    .filter(([other]) => other !== holder)
    .flatMap(([, { building }]) => (building ? [building] : []));
  let settle = () => {};
  const building = new Promise<void>(resolve => {
    settle = resolve;
  });
  setGranteeHolds(holds, holder, { ...holds.get(holder), building });
  let isEnded = false;
  const end = (built?: FundHold) => {
    if (isEnded) return;
    isEnded = true;
    setGranteeHolds(holds, holder, {
      built: built ?? holds.get(holder)?.built,
    });
    settle();
  };
  return {
    earlierBuilds: Promise.all(earlier).then(() => undefined),
    hold: built => {
      end(built);
    },
    release: () => {
      end();
    },
  };
};

/** The resolutions a held grant spend was built with, if this wallet holds it. */
export const heldResolutionsOf = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
  txId: Cardano.TransactionId,
): readonly Cardano.Utxo[] =>
  [...accountHolds(wallet, accountId).values()].find(
    ({ built }) => built?.txId === txId,
  )?.built?.resolvedInputs ?? [];

/** Ends the hold of the spend `txId`, which was submitted or must be rebuilt. */
export const releaseGrantSpendInputs = (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  accountId: AccountId,
  txId: Cardano.TransactionId,
): void => {
  const holds = accountHolds(wallet, accountId);
  for (const [holder, { built, building }] of holds) {
    if (built?.txId === txId) setGranteeHolds(holds, holder, { building });
  }
};
