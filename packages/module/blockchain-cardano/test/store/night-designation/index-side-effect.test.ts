import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { ActivityType } from '@lace-contract/activities';
import {
  CardanoDustNetwork,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  dustMappingDatumToCbor,
  getDustGeneratorPaymentAddress,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import {
  BehaviorSubject,
  delay,
  firstValueFrom,
  of,
  throwError,
  toArray,
} from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  makeNightDesignationIndexRefresh,
  makeNightDesignationIndexSettling,
} from '../../../src/store/night-designation/index-side-effect';

import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';

// =====================================================================
// The index side-effect turns a refresh request into the two chain reads
// that answer "is this account designated, and can a designation be
// changed on this network at all" — the registration lives at the script
// address, so nothing in the account's own state can answer it.
// =====================================================================

const network = CardanoDustNetwork.testnet;
const chainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: 2,
};

const accountId = 'acct-1' as AccountId;
const otherAccountId = 'acct-2' as AccountId;
const stakeKeyHashHex = 'ab'.repeat(28);
const stakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));
const dustPubkeyHex = 'ef'.repeat(32);

const baseAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16('cd'.repeat(28)),
  },
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(stakeKeyHashHex),
  },
)
  .toAddress()
  .toBech32() as unknown as Cardano.PaymentAddress;

const cardanoAddress = {
  accountId,
  blockchainName: 'Cardano' as const,
  address: baseAddress,
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const scriptAddress = getDustGeneratorPaymentAddress(network);
const nftAssetId = getDustMappingNftAssetId(network);

const registrationUtxo: Cardano.Utxo = [
  {
    txId: '99'.repeat(32) as Cardano.TransactionId,
    index: 3,
    address: scriptAddress,
  },
  {
    address: scriptAddress,
    value: { coins: 3_000_000n, assets: new Map([[nftAssetId, 1n]]) },
    datum: Serialization.PlutusData.fromCbor(
      dustMappingDatumToCbor({
        cWallet: { kind: 'verificationKey', stakeKeyHash },
        dustAddress: MidnightCoinPubkey(new Uint8Array(32).fill(0xef)),
      }),
    ).toCore(),
  },
];

type Overrides = {
  chainId$?: BehaviorSubject<Cardano.ChainId | undefined>;
  addresses$?: BehaviorSubject<unknown[]>;
  scriptUtxos?: Cardano.Utxo[];
  isRegistered?: boolean;
  rewardAccountFails?: boolean;
  scriptScanFails?: boolean;
};

const refreshCompleted = vi.fn((payload: unknown) => ({
  type: 'nightDesignationIndex/refreshCompleted',
  payload,
}));
const refreshFailed = vi.fn((payload: unknown) => ({
  type: 'nightDesignationIndex/refreshFailed',
  payload,
}));
const refreshRequested = vi.fn((payload: unknown) => ({
  type: 'nightDesignationIndex/refreshRequested',
  payload,
}));
const settlingStarted = vi.fn((payload: unknown) => ({
  type: 'nightDesignationIndex/settlingStarted',
  payload,
}));
const settlingEnded = vi.fn((payload: unknown) => ({
  type: 'nightDesignationIndex/settlingEnded',
  payload,
}));

const getUtxosAtAddress = vi.fn();
const getRewardAccountInfo = vi.fn();

// One frame, so a read is genuinely in flight for a moment. A provider that
// answered synchronously would let the whole scan complete between two
// same-frame requests, and `exhaustMap` would have nothing left to drop.
const PROVIDER_LATENCY_FRAMES = 1;

const makeDependencies = (overrides: Overrides) => {
  getUtxosAtAddress.mockImplementation(() =>
    of(
      overrides.scriptScanFails
        ? Err(new Error('provider down'))
        : Ok(overrides.scriptUtxos ?? [registrationUtxo]),
    ).pipe(delay(PROVIDER_LATENCY_FRAMES)),
  );
  getRewardAccountInfo.mockImplementation(() =>
    of(
      overrides.rewardAccountFails
        ? Err(new Error('provider down'))
        : Ok({
            isRegistered: overrides.isRegistered ?? true,
            withdrawableAmount: BigNumber(0n),
          }),
    ).pipe(delay(PROVIDER_LATENCY_FRAMES)),
  );
  return {
    txExecutorCardano: {
      cardanoChainId$: overrides.chainId$ ?? new BehaviorSubject(chainId),
      cardanoAddresses$:
        overrides.addresses$ ?? new BehaviorSubject([cardanoAddress]),
    },
    cardanoProvider: { getUtxosAtAddress, getRewardAccountInfo },
    actions: {
      nightDesignationIndex: {
        refreshCompleted,
        refreshFailed,
        refreshRequested,
        settlingEnded,
        settlingStarted,
      },
    },
  };
};

// The side-effect is a pure stream, so on the TestScheduler its inputs timeout
// and the provider retry backoff cost frames rather than seconds.
const run = (
  requests$: unknown,
  overrides: Overrides = {},
): { type: string; payload: Record<string, unknown> }[] => {
  refreshCompleted.mockClear();
  refreshFailed.mockClear();
  getUtxosAtAddress.mockClear();
  getRewardAccountInfo.mockClear();
  const actions: { type: string; payload: Record<string, unknown> }[] = [];
  createTestScheduler().run(() => {
    makeNightDesignationIndexRefresh({ inputsTimeoutMs: 20 })(
      { nightDesignationIndex: { refreshRequested$: requests$ } } as never,
      {} as never,
      makeDependencies(overrides) as never,
    ).subscribe(action => actions.push(action as never));
  });
  return actions;
};

const request = (id: AccountId) => ({ payload: { accountId: id } });

describe('makeNightDesignationIndexRefresh', () => {
  it('reports the account registration found at the script address', () => {
    const actions = run(of(request(accountId)));

    expect(actions).toHaveLength(1);
    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshCompleted');
    expect(actions[0]?.payload).toEqual({
      accountId,
      snapshot: {
        scriptStakeCredentialRegistered: true,
        registration: {
          txId: '99'.repeat(32),
          outputIndex: 3,
          dustPubkeyHex,
        },
      },
    });
  });

  it('scans the dust generator script address, not the account address', () => {
    run(of(request(accountId)));

    expect(getUtxosAtAddress).toHaveBeenCalledWith(
      { address: scriptAddress },
      { chainId },
    );
  });

  it('reports no registration when the script address holds none for this stake key', () => {
    const actions = run(of(request(accountId)), { scriptUtxos: [] });

    expect(actions[0]?.payload).toEqual({
      accountId,
      snapshot: { scriptStakeCredentialRegistered: true },
    });
  });

  it("carries the validator reward account's registration state", () => {
    const actions = run(of(request(accountId)), { isRegistered: false });

    expect(
      (
        actions[0]?.payload.snapshot as {
          scriptStakeCredentialRegistered: boolean;
        }
      ).scriptStakeCredentialRegistered,
    ).toBe(false);
  });

  it('reports the registration with the reward probe unresolved when it fails', () => {
    const actions = run(of(request(accountId)), {
      rewardAccountFails: true,
    });

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshCompleted');
    // toStrictEqual, so dropping the key instead of carrying UNKNOWN fails too:
    // an absent key reads as `false` at every `!snapshot.x` consumer.
    expect(actions[0]?.payload).toStrictEqual({
      accountId,
      snapshot: {
        scriptStakeCredentialRegistered: undefined,
        registration: {
          txId: '99'.repeat(32),
          outputIndex: 3,
          dustPubkeyHex,
        },
      },
    });
  });

  it('flags the entry when the script address scan fails', () => {
    const actions = run(of(request(accountId)), {
      scriptScanFails: true,
    });

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshFailed');
    expect(actions[0]?.payload).toEqual({ accountId });
  });

  it('waits for the chain id and addresses rather than reading their empty seeds', async () => {
    const chainId$ = new BehaviorSubject<Cardano.ChainId | undefined>(
      undefined,
    );
    const addresses$ = new BehaviorSubject<unknown[]>([]);
    const requests$ = new BehaviorSubject(request(accountId));
    const actions: { type: string }[] = [];
    getUtxosAtAddress.mockClear();
    const subscription = makeNightDesignationIndexRefresh({
      inputsTimeoutMs: 20,
    })(
      { nightDesignationIndex: { refreshRequested$: requests$ } } as never,
      {} as never,
      makeDependencies({ chainId$, addresses$ }) as never,
    ).subscribe(action => {
      actions.push(action as never);
    });

    expect(getUtxosAtAddress).not.toHaveBeenCalled();

    chainId$.next(chainId);
    addresses$.next([cardanoAddress]);
    await vi.waitFor(() => {
      expect(actions).toHaveLength(1);
    });
    subscription.unsubscribe();

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshCompleted');
  });

  it('flags the entry when the chain id never arrives', () => {
    const actions = run(of(request(accountId)), {
      chainId$: new BehaviorSubject<Cardano.ChainId | undefined>(undefined),
    });

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshFailed');
  });

  it('scans nothing while the chain id and the addresses disagree on the network', () => {
    // Two independent subjects: mid-switch a stale chain id pairs with fresh
    // addresses, and scanning that pair reads the wrong chain's script address.
    const actions = run(of(request(accountId)), {
      addresses$: new BehaviorSubject<unknown[]>([
        {
          ...cardanoAddress,
          data: {
            networkId: Cardano.NetworkId.Mainnet,
            networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
          },
        },
      ]),
    });

    expect(getUtxosAtAddress).not.toHaveBeenCalled();
    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshFailed');
  });

  it('flags the entry when the account never gets a Cardano address', () => {
    const actions = run(of(request(accountId)), {
      addresses$: new BehaviorSubject<unknown[]>([]),
    });

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshFailed');
  });

  it('flags the entry for an enterprise account address (no stake credential)', () => {
    // The validator's `check_auth` needs a stake credential, so an account
    // without one can never hold a designation — there is nothing to index.
    const enterprise = Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      {
        type: Cardano.CredentialType.KeyHash,
        hash: Crypto.Hash28ByteBase16('cd'.repeat(28)),
      },
    )
      .toAddress()
      .toBech32();
    const actions = run(of(request(accountId)), {
      addresses$: new BehaviorSubject<unknown[]>([
        { ...cardanoAddress, address: enterprise },
      ]),
    });

    expect(actions[0]?.type).toBe('nightDesignationIndex/refreshFailed');
  });

  it('flags the entry when the provider rejects with a non-Error value', () => {
    const actions: unknown[] = [];
    createTestScheduler().run(() => {
      makeNightDesignationIndexRefresh({ inputsTimeoutMs: 20 })(
        {
          nightDesignationIndex: { refreshRequested$: of(request(accountId)) },
        } as never,
        {} as never,
        {
          ...makeDependencies({}),
          cardanoProvider: {
            getUtxosAtAddress: () => of(Err('teapot')),
            getRewardAccountInfo,
          },
        } as never,
      ).subscribe(action => actions.push(action));
    });

    expect(actions).toEqual([
      {
        type: 'nightDesignationIndex/refreshFailed',
        payload: { accountId },
      },
    ]);
  });

  it('ignores a script UTxO that carries the mapping NFT but no datum', () => {
    const [ref, out] = registrationUtxo;
    const noDatum: Cardano.Utxo = [ref, { ...out, datum: undefined }];
    const actions = run(of(request(accountId)), {
      scriptUtxos: [noDatum],
    });

    expect(actions[0]?.payload).toEqual({
      accountId,
      snapshot: { scriptStakeCredentialRegistered: true },
    });
  });

  it("does not let one account's scan block another's", () => {
    const actions = run(of(request(accountId), request(otherAccountId)));

    expect(actions.map(action => action.payload.accountId).sort()).toEqual([
      accountId,
      otherAccountId,
    ]);
  });

  it('drops a repeat request for an account whose scan is still in flight', () => {
    const actions = run(of(request(accountId), request(accountId)));

    expect(actions).toHaveLength(1);
    expect(getUtxosAtAddress).toHaveBeenCalledTimes(1);
  });

  it('surfaces a synchronous request-stream error without emitting', async () => {
    const sideEffect = makeNightDesignationIndexRefresh({
      inputsTimeoutMs: 20,
    })(
      {
        nightDesignationIndex: {
          refreshRequested$: throwError(() => new Error('bus torn down')),
        },
      } as never,
      {} as never,
      makeDependencies({}) as never,
    );

    await expect(firstValueFrom(sideEffect.pipe(toArray()))).rejects.toThrow(
      'bus torn down',
    );
  });
});

// =====================================================================
// The flow's `Success` is a SUBMIT result, so the script address cannot
// answer for the designation yet. The entry is held provisional until the
// transaction's own activity stops being pending.
// =====================================================================

const designationTxId = '77'.repeat(32);

const activity = (type: ActivityType, id = designationTxId): Activity =>
  ({ accountId, activityId: id, type } as Activity);

const subscriptions: { unsubscribe: () => void }[] = [];

afterEach(() => {
  for (const subscription of subscriptions.splice(0))
    subscription.unsubscribe();
  vi.useRealTimers();
});

const runSettling = ({
  activities$,
  settlingTimeoutMs = 10 * 60 * 1000,
}: {
  activities$: BehaviorSubject<Record<string, Activity[]>>;
  settlingTimeoutMs?: number;
}) => {
  refreshRequested.mockClear();
  settlingStarted.mockClear();
  settlingEnded.mockClear();
  const emitted: { type: string; payload: Record<string, unknown> }[] = [];
  subscriptions.push(
    makeNightDesignationIndexSettling({ settlingTimeoutMs })(
      {} as never,
      {
        nightDesignationFlow: {
          selectState$: of({
            status: 'Success',
            accountId,
            txId: designationTxId,
          }),
        },
        activities: { selectAllMap$: activities$ },
      } as never,
      makeDependencies({}) as never,
    ).subscribe(action => emitted.push(action as never)),
  );
  return emitted;
};

describe('makeNightDesignationIndexSettling', () => {
  it('holds the entry provisional on the submitted transaction and scans nothing', () => {
    const emitted = runSettling({
      activities$: new BehaviorSubject({
        [accountId]: [activity(ActivityType.Pending)],
      }),
    });

    expect(emitted).toEqual([
      {
        type: 'nightDesignationIndex/settlingStarted',
        payload: { accountId, txId: designationTxId },
      },
    ]);
  });

  it('re-reads the index, then releases the entry, once the transaction is on chain', () => {
    const activities$ = new BehaviorSubject({
      [accountId]: [activity(ActivityType.Pending)],
    });
    const emitted = runSettling({ activities$ });

    activities$.next({
      [accountId]: [activity(ActivityType.NightDesignation)],
    });

    expect(emitted.map(action => action.type)).toEqual([
      'nightDesignationIndex/settlingStarted',
      'nightDesignationIndex/refreshRequested',
      'nightDesignationIndex/settlingEnded',
    ]);
    expect(emitted[1]?.payload).toEqual({ accountId });
    expect(emitted[2]?.payload).toEqual({ accountId });
  });

  it('releases the entry when the transaction fails', () => {
    const activities$ = new BehaviorSubject({
      [accountId]: [activity(ActivityType.Pending)],
    });
    const emitted = runSettling({ activities$ });

    activities$.next({ [accountId]: [activity(ActivityType.Failed)] });

    expect(emitted.map(action => action.type)).toEqual([
      'nightDesignationIndex/settlingStarted',
      'nightDesignationIndex/refreshRequested',
      'nightDesignationIndex/settlingEnded',
    ]);
  });

  it('waits on the account that submitted, not on another holding the same id', () => {
    const activities$ = new BehaviorSubject({
      [accountId]: [activity(ActivityType.Pending)],
    });
    const emitted = runSettling({ activities$ });

    activities$.next({
      [accountId]: [activity(ActivityType.Pending)],
      [otherAccountId]: [activity(ActivityType.NightDesignation)],
    });

    expect(emitted).toHaveLength(1);
  });

  it('waits on the submitted transaction, not on another the account settles', () => {
    const activities$ = new BehaviorSubject({
      [accountId]: [activity(ActivityType.Pending)],
    });
    const emitted = runSettling({ activities$ });

    activities$.next({
      [accountId]: [
        activity(ActivityType.Pending),
        activity(ActivityType.Send, '88'.repeat(32)),
      ],
    });

    expect(emitted).toHaveLength(1);
  });

  it('re-reads anyway once the bounded wait elapses on a transaction that never resolves', () => {
    vi.useFakeTimers();
    const emitted = runSettling({
      activities$: new BehaviorSubject({
        [accountId]: [activity(ActivityType.Pending)],
      }),
      settlingTimeoutMs: 1000,
    });

    vi.advanceTimersByTime(1000);

    expect(emitted.map(action => action.type)).toEqual([
      'nightDesignationIndex/settlingStarted',
      'nightDesignationIndex/refreshRequested',
      'nightDesignationIndex/settlingEnded',
    ]);
  });

  it('releases the entry once, however many activity updates follow', () => {
    const activities$ = new BehaviorSubject({
      [accountId]: [activity(ActivityType.Pending)],
    });
    const emitted = runSettling({ activities$ });

    activities$.next({
      [accountId]: [activity(ActivityType.NightDesignation)],
    });
    activities$.next({
      [accountId]: [activity(ActivityType.NightDesignation)],
    });

    expect(emitted).toHaveLength(3);
  });
});
