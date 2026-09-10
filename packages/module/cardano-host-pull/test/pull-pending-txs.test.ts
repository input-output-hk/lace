import { Cardano, Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { CardanoAccountId } from '@lace-contract/cardano-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { pullPendingTxs } from '../src/store/side-effects/pull-pending-txs';

import type { ActionCreators } from '../src';
import type {
  CardanoHostPullDependencies,
  PendingCardanoTxs,
} from '../src/augmentations';
import type { Activity } from '@lace-contract/activities';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { LaceResult } from '@lace-lib/extension-shell-api';

const PREPROD = 1;
const WALLET_ID = WalletId('w1');
const ACCOUNT_ID = CardanoAccountId(
  WALLET_ID,
  0,
  PREPROD as Cardano.NetworkMagic,
);
const ACCOUNT_ID_1 = CardanoAccountId(
  WALLET_ID,
  1,
  PREPROD as Cardano.NetworkMagic,
);
const ASSET_ID = `${'de'.repeat(28)}${'ab12'}`;

// Two addresses of the account, one foreign destination. OWN_CHANGE stands for
// an address the account has never transacted on: absent from the guest's own
// address set, so only the host can say the change output is the account's.
const OWN_RECEIVE = Cardano.PaymentAddress(
  'addr_test1qzcczs3ckrfg029ydnnnfrr267dt3x2mpek5vqgw9k0pc6qy9uv5vv6ufxxjua2kchry03ryn34xn54kghx3g29r8xaqp3m7yl',
);
const OWN_CHANGE = Cardano.PaymentAddress(
  'addr_test1qqlrq4h2xvj7x49shr65uxrsgkfmpq65la8lpvmxn06gprl6td4s5g30erqzfhnrx8faqtuxl8ruc4a75rxx99twr7fsyfr6t2',
);
const FOREIGN = Cardano.PaymentAddress(
  'addr_test1wz6zjuut6mx93dw8jvksqx4zh5zul6j8qg992myvw575gdsgwxjuc',
);

const SPENT_TX_ID = 'cc'.repeat(32);
const SPENT_LOVELACE = 10_000_000n;
const CHANGE_LOVELACE = 4_000_000n;
const SENT_LOVELACE = 5_800_000n;

/** The tx the dapp submitted: it spends one own utxo, pays a foreign address and
 * sends the remainder back to a FRESH own change address. */
const submittedTx: Cardano.Tx = {
  id: Cardano.TransactionId('0'.repeat(64)),
  body: {
    inputs: [{ txId: Cardano.TransactionId(SPENT_TX_ID), index: 0 }],
    outputs: [
      { address: FOREIGN, value: { coins: SENT_LOVELACE } },
      { address: OWN_CHANGE, value: { coins: CHANGE_LOVELACE } },
    ],
    fee: 200_000n,
  },
  witness: { signatures: new Map() },
};

const TX_CBOR = String(
  Serialization.Transaction.fromCore(submittedTx).toCbor(),
);
const TX_ID = String(Serialization.Transaction.fromCore(submittedTx).getId());
/** The chain-assigned hash the host recorded — deliberately NOT the tx id, so a
 * mapping that filed the activity under the host hash would fail. */
const HOST_TX_HASH = 'ab'.repeat(32);

const served = (
  txs: PendingCardanoTxs['txs'],
): LaceResult<PendingCardanoTxs> => ({ ok: true, value: { txs } });

const oneServedTx: PendingCardanoTxs['txs'] = [
  {
    txHash: HOST_TX_HASH,
    txCbor: TX_CBOR,
    ttlSlot: 500,
    ownInputs: [
      {
        txId: SPENT_TX_ID,
        index: 0,
        address: OWN_RECEIVE,
        lovelace: SPENT_LOVELACE.toString(),
      },
    ],
    // Output 0 (FOREIGN) is deliberately absent — the host names only the
    // outputs that pay back to the account.
    ownOutputs: [
      {
        index: 1,
        address: OWN_CHANGE,
        lovelace: CHANGE_LOVELACE.toString(),
      },
    ],
  },
];

const cardanoAccount = (accountIndex = 0): AnyAccount =>
  ({
    accountId: CardanoAccountId(
      WALLET_ID,
      accountIndex,
      PREPROD as Cardano.NetworkMagic,
    ),
    walletId: WALLET_ID,
    blockchainName: 'Cardano',
    accountType: 'InMemory',
    networkType: 'testnet',
    blockchainNetworkId: `cardano-${PREPROD}`,
    metadata: { name: `Account ${accountIndex + 1}` },
    blockchainSpecific: {
      accountIndex,
      extendedAccountPublicKey: 'ab'.repeat(64),
      chainId: { networkId: 0, networkMagic: PREPROD },
    },
  } as unknown as AnyAccount);

/** MultiSig carries a key path rather than an accountIndex, so it addresses no
 * host account. */
const multiSigAccount = (): AnyAccount =>
  ({
    accountId: 'w1-multisig',
    walletId: WALLET_ID,
    blockchainName: 'Cardano',
    accountType: 'MultiSig',
    networkType: 'testnet',
    blockchainNetworkId: `cardano-${PREPROD}`,
    metadata: { name: 'Shared' },
    blockchainSpecific: {
      paymentKeyPath: { role: 0, index: 0 },
      chainId: { networkId: 0, networkMagic: PREPROD },
    },
  } as unknown as AnyAccount);

const midnightAccount = (): AnyAccount =>
  ({
    accountId: 'w1-midnight',
    walletId: WALLET_ID,
    blockchainName: 'Midnight',
    accountType: 'InMemory',
    networkType: 'testnet',
    blockchainNetworkId: 'midnight-TestNet',
    metadata: { name: 'Account 1' },
    blockchainSpecific: { accountIndex: 0, networkId: 'TestNet' },
  } as unknown as AnyAccount);

type Upsert = { accountId: string; activities: Activity[] };

/** Records what reached `activities.upsertActivities` and answers with a sentinel
 * action, so the marble asserts the stream and the recorded payload the values. */
const recordingActions = (upserts: Upsert[]) =>
  ({
    activities: {
      upsertActivities: (payload: Upsert) => {
        upserts.push(payload);
        return { type: 'upserted' };
      },
    },
  } as unknown as ActionCreators);

const UPSERTED = { type: 'upserted' };

const logger = { warn: () => undefined } as unknown as Parameters<
  typeof pullPendingTxs
>[2]['logger'];

/** The wire params the dependency is called with — the (walletId, accountIndex,
 * networkMagic) triple, no accountId. */
type PullParams = Parameters<
  CardanoHostPullDependencies['getPendingCardanoTxs']
>[0];

type RunOptions = {
  accounts?: AnyAccount[];
  accountsMarble?: string;
  accountsValues?: Record<string, AnyAccount[]>;
  activities?: Record<string, Activity[]>;
  pull?: LaceResult<PendingCardanoTxs>;
  pullFor?: (params: PullParams) => LaceResult<PendingCardanoTxs> | undefined;
  canGetPendingCardanoTxs?: boolean;
  refocusMarble?: string;
  expectedMarble: string;
};

const run = ({
  accounts = [cardanoAccount()],
  accountsMarble = 'a',
  accountsValues,
  activities = {},
  pull = served(oneServedTx),
  pullFor,
  canGetPendingCardanoTxs = true,
  refocusMarble = '',
  expectedMarble,
}: RunOptions): { upserts: Upsert[]; pulls: PullParams[] } => {
  const upserts: Upsert[] = [];
  const pulls: PullParams[] = [];
  testSideEffect(pullPendingTxs, ({ cold, expectObservable }) => ({
    actionObservables: {},
    stateObservables: {
      wallets: {
        selectActiveNetworkAccounts$: cold(
          accountsMarble,
          accountsValues ?? { a: accounts },
        ),
      },
      activities: { selectAllMap$: cold('a', { a: activities }) },
    },
    dependencies: {
      actions: recordingActions(upserts),
      canGetPendingCardanoTxs,
      getPendingCardanoTxs: (params: PullParams) => {
        pulls.push(params);
        return cold('(a|)', { a: pullFor?.(params) ?? pull });
      },
      windowRefocus$: cold<void>(refocusMarble),
      logger,
    },
    assertion: sideEffect$ => {
      expectObservable(sideEffect$).toBe(expectedMarble, { a: UPSERTED });
    },
  }));
  return { upserts, pulls };
};

describe('cardano-host-pull pullPendingTxs side effect', () => {
  it('upserts one Pending activity per served tx, keyed by the TX ID not the host hash', () => {
    const { upserts, pulls } = run({ expectedMarble: 'a' });

    // The wire triple only — the accountId stays guest-side bookkeeping.
    expect(pulls).toEqual([
      { walletId: WALLET_ID, accountIndex: 0, networkMagic: PREPROD },
    ]);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]?.accountId).toBe(ACCOUNT_ID);
    const [activity] = upserts[0]?.activities ?? [];
    expect(activity?.activityId).toBe(TX_ID);
    expect(activity?.type).toBe(ActivityType.Pending);
    expect(activity?.accountId).toBe(ACCOUNT_ID);
  });

  it('nets the host-served own inputs against the own outputs, so the row reads as a SEND', () => {
    const { upserts } = run({ expectedMarble: 'a' });
    const [activity] = upserts[0]?.activities ?? [];
    // Own change (4 ADA) minus the own input the host resolved (10 ADA). Without
    // the served input the guest would see the change alone and post +4 ADA — a
    // phantom receive; the guest's own utxo set no longer holds that input.
    expect(activity?.tokenBalanceChanges).toEqual([
      {
        tokenId: 'lovelace',
        amount: BigNumber(CHANGE_LOVELACE - SPENT_LOVELACE),
      },
    ]);
  });

  it('carries the in-flight utxo metadata (every consumed input, every produced output)', () => {
    const { upserts } = run({ expectedMarble: 'a' });
    const [activity] = upserts[0]?.activities ?? [];
    const inFlight = (
      activity?.blockchainSpecific as {
        Cardano?: {
          consumedInputs: unknown[];
          producedOutputs: [{ txId: string; index: number }, unknown][];
        };
      }
    )?.Cardano;
    expect(inFlight?.consumedInputs).toEqual([{ txId: SPENT_TX_ID, index: 0 }]);
    expect(inFlight?.producedOutputs.map(([outpoint]) => outpoint)).toEqual([
      { txId: TX_ID, index: 0 },
      { txId: TX_ID, index: 1 },
    ]);
  });

  it('re-pulls when the guest regains attention', () => {
    // The dapp submits in its own tab; handing attention back to the guest is
    // when the pull model can observe it.
    const { pulls } = run({ refocusMarble: '-a-a', expectedMarble: 'aa-a' });
    expect(pulls).toHaveLength(3);
  });

  it('skips a tx the account already holds an activity for (a re-pull is free)', () => {
    // Re-deriving would restamp the timestamp the list sorts on, and would push a
    // CONFIRMED tx back to Pending.
    const { upserts, pulls } = run({
      activities: {
        [ACCOUNT_ID]: [{ activityId: TX_ID } as unknown as Activity],
      },
      expectedMarble: '',
    });
    expect(pulls).toHaveLength(1);
    expect(upserts).toEqual([]);
  });

  it('dispatches nothing when the host serves no pending tx', () => {
    const { upserts, pulls } = run({ pull: served([]), expectedMarble: '' });
    expect(pulls).toHaveLength(1);
    expect(upserts).toEqual([]);
  });

  it('swallows a refused read until the next trigger', () => {
    const { upserts } = run({
      pull: { ok: false, error: { code: 'internal', message: 'nope' } },
      expectedMarble: '',
    });
    expect(upserts).toEqual([]);
  });

  it('no-ops silently against an older host lacking the capability', () => {
    const { upserts, pulls } = run({
      canGetPendingCardanoTxs: false,
      // Disabled: returns EMPTY (completes at frame 0), never touching the wire.
      expectedMarble: '|',
    });
    expect(pulls).toEqual([]);
    expect(upserts).toEqual([]);
  });

  it('does not pull when the active network holds no Cardano account', () => {
    const { upserts, pulls } = run({
      accounts: [midnightAccount()],
      expectedMarble: '',
    });
    expect(pulls).toEqual([]);
    expect(upserts).toEqual([]);
  });

  it('excludes a MultiSig Cardano account — no host account is addressable for it', () => {
    const { pulls } = run({
      accounts: [multiSigAccount()],
      expectedMarble: '',
    });
    expect(pulls).toEqual([]);
  });

  it('re-pulls when the account set changes, not when it merely re-emits', () => {
    const { pulls } = run({
      accountsMarble: 'a-b-c',
      accountsValues: {
        a: [cardanoAccount()],
        // The same account again (a sync round re-emitting) — no re-pull...
        b: [cardanoAccount()],
        // ...then a second account appears — a re-pull, now for both.
        c: [cardanoAccount(), cardanoAccount(1)],
      },
      // One upsert per account with pending activity, so the widened set emits two.
      expectedMarble: 'a---(aa)',
    });
    expect(pulls.map(pull => pull.accountIndex)).toEqual([0, 0, 1]);
  });

  it('one account read failing does not lose its siblings pending activity', () => {
    const { upserts } = run({
      accounts: [cardanoAccount(), cardanoAccount(1)],
      pullFor: params =>
        params.accountIndex === 0
          ? { ok: false, error: { code: 'internal', message: 'nope' } }
          : served(oneServedTx),
      expectedMarble: 'a',
    });
    expect(upserts.map(upsert => upsert.accountId)).toEqual([ACCOUNT_ID_1]);
  });

  it('widens the served native-asset amounts back to BigInt on the own input', () => {
    const { upserts } = run({
      pull: served([
        {
          ...oneServedTx[0],
          ownInputs: [
            {
              txId: SPENT_TX_ID,
              index: 0,
              address: OWN_RECEIVE,
              lovelace: SPENT_LOVELACE.toString(),
              assets: { [ASSET_ID]: '9' },
            },
          ],
        },
      ]),
      expectedMarble: 'a',
    });
    const [activity] = upserts[0]?.activities ?? [];
    // The tx sends the whole asset holding away (no own output carries it), so
    // the net is the full negative — proving the string amount was widened, not
    // dropped.
    expect(activity?.tokenBalanceChanges).toEqual([
      {
        tokenId: 'lovelace',
        amount: BigNumber(CHANGE_LOVELACE - SPENT_LOVELACE),
      },
      { tokenId: ASSET_ID, amount: BigNumber(-9n) },
    ]);
  });
});
