import { LOVELACE_VALUE } from '@lace-contract/cardano-context';

import { deriveTestAccount } from '../cardano/account';
import {
  stakeKeyRegistered,
  getUtxos,
  lovelaceTotal,
} from '../cardano/queries';
import {
  deregisterStakeKey,
  registerAndDelegate,
  returnFunds,
  sendAda,
} from '../cardano/tx';
import { pollUntil } from '../util/poll';

import type { Network } from './networks';
import type { DerivedAccount } from '../cardano/account';
import type { Providers } from '../cardano/queries';
import type { Cardano } from '@cardano-sdk/core';

export const ADA = (n: number) => BigInt(n) * BigInt(LOVELACE_VALUE);
// The source funding floor and top-up amount, exported so scenarios stage
// against the same values as setupSource.
export const MIN_SOURCE_BALANCE = ADA(10);
export const FUND_AMOUNT = ADA(50);
// Matches the scan's ACCOUNT_INDEX_GAP: drain across the same horizon the live
// multi-account scan probes, so nothing it would flag is left behind.
const HIGHER_ACCOUNT_GAP = 10;
// Covers the deregistration tx fee when an account is registered but empty.
const DEREGISTER_FUNDING = ADA(3);

type AccountActivity = {
  isBaseFunded: boolean;
  isStakeKeyRegistered: boolean;
};

const probeAccountActivity = async (
  providers: Providers,
  account: DerivedAccount,
): Promise<AccountActivity> => ({
  isBaseFunded: lovelaceTotal(await getUtxos(providers, account.address)) > 0n,
  isStakeKeyRegistered: await stakeKeyRegistered(
    providers,
    account.rewardAccount,
  ),
});

/**
 * Reclaims one active account back to treasury: deregisters a registered stake
 * key, otherwise drains its utxos. A registered key holds the 2 ADA deposit and
 * reads active to the scan even with no utxos, so an empty one is funded first
 * to pay the deregistration fee, then reclaimed with its deposit.
 */
const reclaimAccount = async (
  providers: Providers,
  {
    account,
    treasury,
    accountIndex,
    isBaseFunded,
    isStakeKeyRegistered,
  }: {
    account: DerivedAccount;
    treasury: DerivedAccount;
    accountIndex: number;
    isBaseFunded: boolean;
    isStakeKeyRegistered: boolean;
  },
): Promise<void> => {
  if (isStakeKeyRegistered) {
    if (!isBaseFunded) {
      console.log(`  funding source account ${accountIndex} to deregister`);
      await sendAda(providers, {
        from: treasury,
        to: account.address,
        lovelace: DEREGISTER_FUNDING,
      });
    }
    console.log(`  deregistering source account ${accountIndex} to treasury`);
    await deregisterStakeKey(providers, { account, to: treasury.address });
  } else if (isBaseFunded) {
    console.log(`  draining source account ${accountIndex} to treasury`);
    await returnFunds(providers, { from: account, to: treasury.address });
  }
};

/**
 * Drains every active account beyond index 0 back to treasury, restoring the
 * single-account invariant the live scan enforces. Run once per invocation
 * before staging (see main.ts): without it a source the multiple-active-accounts
 * scenario parked funds on would make every single-account scenario refuse on a
 * later run.
 */
export const drainHigherAccounts = async (
  providers: Providers,
  { source, treasury }: { source: DerivedAccount; treasury: DerivedAccount },
): Promise<void> => {
  let emptyRun = 0;
  for (let accountIndex = 1; emptyRun < HIGHER_ACCOUNT_GAP; accountIndex += 1) {
    const account = await deriveTestAccount({
      mnemonic: source.mnemonic,
      accountIndex,
      chainId: source.chainId,
    });
    const activity = await probeAccountActivity(providers, account);
    if (!activity.isBaseFunded && !activity.isStakeKeyRegistered) {
      emptyRun += 1;
      continue;
    }
    await reclaimAccount(providers, {
      account,
      treasury,
      accountIndex,
      ...activity,
    });
    emptyRun = 0;
  }
};

/**
 * Ensures a rewards-source is staked so it accrues (register, pool-delegate, and
 * vote-delegate to `dRep`). Idempotent: an already-registered wallet is left as
 * is (it is accruing). Preview only, and funded from the faucet (there is no
 * treasury on preview). An unfunded wallet fails loud with its address to fund.
 * Rewards need ~4 epochs (~4 days on preview) to become withdrawable.
 */
export const ensureStakedForRewards = async (
  providers: Providers,
  {
    account,
    poolId,
    dRep,
  }: {
    account: DerivedAccount;
    poolId: Cardano.PoolId;
    dRep: Cardano.DelegateRepresentative;
  },
): Promise<void> => {
  if (await stakeKeyRegistered(providers, account.rewardAccount)) {
    console.log('  rewards source already staked (accruing)');
    return;
  }
  if (lovelaceTotal(await getUtxos(providers, account.address)) === 0n) {
    throw new Error(
      `fund ${account.address} via the preview faucet, then re-run to stake it`,
    );
  }
  console.log('  staking rewards source (register, delegate, vote-delegate)');
  await registerAndDelegate(providers, { account, poolId, dRep });
  await pollUntil(
    async () => stakeKeyRegistered(providers, account.rewardAccount),
    'rewards source stake key not indexed as registered after staking',
  );
};

/**
 * SETUP phase. Idempotent and self-healing: funds the source from treasury and
 * registers plus delegates it only when needed, so a swept (empty, deregistered)
 * source from a prior run is re-primed automatically. The single-account
 * invariant is restored separately, once per invocation, before staging.
 */
export const setupSource = async (
  providers: Providers,
  { source, treasury }: { source: DerivedAccount; treasury: DerivedAccount },
  network: Network,
): Promise<void> => {
  const balance = lovelaceTotal(await getUtxos(providers, source.address));
  if (balance < MIN_SOURCE_BALANCE) {
    console.log(`  balance ${balance} below floor, funding ${FUND_AMOUNT}`);
    await sendAda(providers, {
      from: treasury,
      to: source.address,
      lovelace: FUND_AMOUNT,
    });
  } else {
    console.log(`  source funded (${balance})`);
  }

  if (await stakeKeyRegistered(providers, source.rewardAccount)) {
    console.log('  source already registered');
  } else {
    console.log('  source not registered, registering and delegating');
    await registerAndDelegate(providers, {
      account: source,
      poolId: network.pool,
    });
    // Stake-registration indexing can lag behind the registration tx. Fail
    // loud if the key never reads as registered: sweeping now would build a tx
    // with no deregistration cert, leaving the key registered after the sweep.
    await pollUntil(
      async () => stakeKeyRegistered(providers, source.rewardAccount),
      'source stake key not indexed as registered after setup',
    );
  }
};
