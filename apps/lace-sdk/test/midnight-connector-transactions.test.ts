import { ActivityType } from '@lace-contract/activities';
import {
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
  defaultTxTtlLength,
  NIGHT_TOKEN_ID,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import {
  BehaviorSubject,
  defer,
  finalize,
  NEVER,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  balanceMidnightSealedTransaction,
  balanceMidnightUnsealedTransaction,
  makeMidnightIntent,
  makeMidnightTransfer,
} from '../src/midnight-connector-transactions';
import { MidnightSubmitTimeoutError } from '../src/midnight-errors';
import { submitMidnightTx } from '../src/submit-midnight-tx';

import type {
  MidnightMakeIntentProps,
  MidnightMakeTransferProps,
} from '../src/midnight-connector-transactions';
import type { WalletWithMidnight } from '../src/midnight-wallet';
import type { MidnightFinalizedTx } from '../src/prove-midnight-tx';
import type { Activity } from '@lace-contract/activities';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { DesiredOutput } from '@midnight-ntwrk/dapp-connector-api';

const networkId = MidnightSDKNetworkIds.Preview;
const accountId = MidnightAccountId(stubData.walletId, 0, networkId);
const shieldedAddress = ShieldedAddress.codec
  .encode(
    networkId,
    ShieldedAddress.codec.decode(
      stubData.networkId,
      MidnightBech32m.parse(stubData.midnightShieldedAddress),
    ),
  )
  .toString();
const unshieldedAddress = UnshieldedAddress.codec
  .encode(networkId, new UnshieldedAddress(Buffer.alloc(32, 7)))
  .toString();
const shielded: DesiredOutput = {
  kind: 'shielded',
  type: 'aa'.repeat(32),
  value: 3n,
  recipient: shieldedAddress,
};
const unshielded: DesiredOutput = {
  kind: 'unshielded',
  type: NIGHT_TOKEN_ID,
  value: 5n,
  recipient: unshieldedAddress,
};
const recipe = { type: 'UNPROVEN_TRANSACTION' };
const signed = { type: 'SIGNED' };
const finalized = {
  transactionHash: () => 'actual-hash',
  intents: new Map(),
} as unknown as MidnightFinalizedTx;

type FakeCoin = {
  utxo: { intentHash: string; outputNo: number; type: string; value: bigint };
};

const setup = () => {
  const engine = {
    accountId,
    networkId,
    balanceFinalizedTransaction: vi.fn(() => of(recipe)),
    balanceUnboundTransaction: vi.fn(() => of(recipe)),
    transferTransaction: vi.fn(() => of(recipe)),
    balanceUnprovenTransaction: vi.fn(() => of(recipe)),
    revert: vi.fn(() => of(undefined)),
    initSwap: vi.fn(() => of(recipe)),
    signRecipe: vi.fn(() => of(signed)),
    finalizeRecipe: vi.fn(() => of(finalized)),
    submitTransaction: vi.fn(() => of('submission-id')),
    // As the wallet library reports after a build: the transaction's own
    // input is pending, not available.
    state: vi.fn(() =>
      of({
        unshielded: {
          availableCoins: [] as FakeCoin[],
          pendingCoins: [
            {
              utxo: {
                intentHash: 'input',
                outputNo: 0,
                type: NIGHT_TOKEN_ID,
                value: 9n,
              },
            },
          ],
        },
      }),
    ),
    nightVerifyingKey: ledger.signatureVerifyingKey(ledger.sampleSigningKey()),
  };
  const activities$ = new BehaviorSubject<Record<AccountId, Activity[]>>({});
  const dispatch = vi.fn(
    (
      _key: 'activities.removeActivities' | 'activities.upsertActivities',
      payload:
        | { accountId: AccountId; activities: Activity[] }
        | { accountId: AccountId; activityIds: string[] },
    ) => {
      const existing = activities$.value[payload.accountId] ?? [];
      if (!('activities' in payload)) {
        activities$.next({
          ...activities$.value,
          [payload.accountId]: existing.filter(
            activity => !payload.activityIds.includes(activity.activityId),
          ),
        });
        return;
      }
      activities$.next({
        ...activities$.value,
        [payload.accountId]: [
          ...new Map(
            [...existing, ...payload.activities].map(activity => [
              activity.activityId,
              activity,
            ]),
          ).values(),
        ],
      });
    },
  );
  const wallet: WalletWithMidnight = {
    dispatch,
    stateObservables: {
      activities: { selectAllMap$: activities$ },
      wallets: {
        selectAll$: of([
          {
            ...stubData.midnightWallet,
            accounts: [
              {
                ...stubData.midnightAccount,
                accountId,
                blockchainNetworkId: MidnightNetworkId(networkId),
              },
            ],
          },
        ]),
      },
      network: {
        selectAllActiveNetworkIds$: of([MidnightNetworkId(networkId)]),
      },
    } as unknown as WalletWithMidnight['stateObservables'],
    _loadModules: (async () => [
      of({ [accountId]: engine as unknown as MidnightWallet }),
    ]) as unknown as WalletWithMidnight['_loadModules'],
  };
  return { engine, wallet, activities$, dispatch };
};

afterEach(() => vi.restoreAllMocks());

describe('connector transaction contracts', () => {
  it.each([
    [
      balanceMidnightSealedTransaction,
      'binding',
      'balanceFinalizedTransaction',
    ],
    [
      balanceMidnightUnsealedTransaction,
      'pre-binding',
      'balanceUnboundTransaction',
    ],
  ] as const)(
    'decodes and signs connector transaction',
    async (balance, binding, method) => {
      const { engine, wallet } = setup();
      const decode = vi
        .spyOn(ledger.Transaction, 'deserialize')
        .mockReturnValue(finalized);
      const now = Date.now();
      const result = await balance(wallet, {
        tx: 'abcd',
        options: { payFees: false },
      });
      expect(result.unwrap()).toBe(finalized);
      expect(decode).toHaveBeenCalledWith(
        'signature',
        'proof',
        binding,
        Buffer.from('abcd', 'hex'),
      );
      expect(engine[method]).toHaveBeenCalledWith(finalized, {
        ttl: expect.any(Date) as unknown,
        tokenKindsToBalance: ['shielded', 'unshielded'],
      });
      const ttl = (
        engine[method].mock.calls[0] as unknown as [unknown, { ttl: Date }]
      )[1].ttl.getTime();
      expect(ttl).toBeGreaterThanOrEqual(now + defaultTxTtlLength);
      expect(ttl).toBeLessThanOrEqual(Date.now() + defaultTxTtlLength);
      expect(engine.signRecipe).toHaveBeenCalledWith(recipe);
      expect(engine.finalizeRecipe).toHaveBeenCalledWith(signed);
      expect(engine.submitTransaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    balanceMidnightSealedTransaction,
    balanceMidnightUnsealedTransaction,
  ])('defaults balancing to all fee kinds', async balance => {
    const { engine, wallet } = setup();
    vi.spyOn(ledger.Transaction, 'deserialize').mockReturnValue(finalized);
    expect((await balance(wallet, { tx: 'abcd' })).isOk()).toBe(true);
    const calls = [
      ...engine.balanceFinalizedTransaction.mock.calls,
      ...engine.balanceUnboundTransaction.mock.calls,
    ];
    expect(calls[0]).toEqual([
      finalized,
      { ttl: expect.any(Date) as unknown, tokenKindsToBalance: undefined },
    ]);
  });

  it.each([
    [balanceMidnightSealedTransaction, 'balanceFinalizedTransaction'],
    [balanceMidnightUnsealedTransaction, 'balanceUnboundTransaction'],
  ] as const)(
    'propagates balance failure before signing',
    async (balance, method) => {
      const { engine, wallet } = setup();
      vi.spyOn(ledger.Transaction, 'deserialize').mockReturnValue(finalized);
      const failure = new Error('Insufficient DUST');
      engine[method].mockImplementation(() => throwError(() => failure));
      expect((await balance(wallet, { tx: 'abcd' })).unwrapErr()).toBe(failure);
      expect(engine.signRecipe).not.toHaveBeenCalled();
      expect(engine.finalizeRecipe).not.toHaveBeenCalled();
    },
  );

  it('groups every mixed output in connector order and signs only once', async () => {
    const { engine, wallet } = setup();
    expect(
      (
        await makeMidnightTransfer(wallet, {
          desiredOutputs: [shielded, unshielded, { ...shielded, value: 4n }],
          options: { payFees: false },
        })
      ).unwrap(),
    ).toBe(finalized);
    expect(engine.transferTransaction).toHaveBeenCalledWith(
      [
        {
          type: 'unshielded',
          outputs: [
            {
              type: unshielded.type,
              amount: 5n,
              receiverAddress: UnshieldedAddress.codec.decode(
                networkId,
                MidnightBech32m.parse(unshieldedAddress),
              ),
            },
          ],
        },
        {
          type: 'shielded',
          outputs: [3n, 4n].map(amount => ({
            type: shielded.type,
            amount,
            receiverAddress: ShieldedAddress.codec.decode(
              networkId,
              MidnightBech32m.parse(shieldedAddress),
            ),
          })),
        },
      ],
      { ttl: expect.any(Date) as unknown, payFees: false },
    );
    expect(engine.signRecipe).toHaveBeenCalledTimes(1);
    expect(engine.finalizeRecipe).toHaveBeenCalledWith(signed);
    expect(engine.submitTransaction).not.toHaveBeenCalled();
  });

  it('keeps shielded-only transfers unsigned and defaults payFees to true', async () => {
    const { engine, wallet } = setup();
    expect(
      (
        await makeMidnightTransfer(wallet, { desiredOutputs: [shielded] })
      ).isOk(),
    ).toBe(true);
    expect(engine.signRecipe).not.toHaveBeenCalled();
    expect(engine.finalizeRecipe).toHaveBeenCalledWith(recipe);
    // Built without its fee, then balanced, so a release that fails beside a
    // fee failure is reported.
    expect(engine.transferTransaction).toHaveBeenCalledWith(expect.any(Array), {
      ttl: expect.any(Date) as unknown,
      payFees: false,
    });
    expect(engine.balanceUnprovenTransaction).toHaveBeenCalledOnce();
  });

  it.each([true, false])(
    'aggregates inputs and preserves intent fees %s while ignoring intentId',
    async payFees => {
      const { engine, wallet } = setup();
      const swap = {
        type: 'UNPROVEN_TRANSACTION',
        transaction: { id: 'swap' },
      };
      engine.initSwap.mockReturnValue(of(swap));
      expect(
        (
          await makeMidnightIntent(wallet, {
            desiredInputs: [unshielded, { ...unshielded, value: 2n }, shielded],
            desiredOutputs: [shielded],
            options: { payFees, intentId: -12.5 },
          })
        ).unwrap(),
      ).toBe(finalized);
      // Built without its fee, then balanced, so a release that fails beside a
      // fee failure is reported.
      expect(engine.initSwap).toHaveBeenCalledWith(
        {
          unshielded: { [unshielded.type]: 7n },
          shielded: { [shielded.type]: 3n },
        },
        expect.any(Array),
        { ttl: expect.any(Date) as unknown, payFees: false },
      );
      expect(engine.balanceUnprovenTransaction).toHaveBeenCalledTimes(
        payFees ? 1 : 0,
      );
      if (payFees)
        expect(engine.balanceUnprovenTransaction).toHaveBeenCalledWith(
          swap.transaction,
          { ttl: expect.any(Date) as unknown, tokenKindsToBalance: ['dust'] },
        );
      // The balanced recipe, not the unpaid swap, is what gets signed and proved.
      expect(engine.signRecipe).toHaveBeenCalledExactlyOnceWith(
        payFees ? recipe : swap,
      );
      expect(engine.finalizeRecipe).toHaveBeenCalledExactlyOnceWith(signed);
      expect(engine.submitTransaction).not.toHaveBeenCalled();
    },
  );

  it('releases the balanced intent, fee included, when signing fails', async () => {
    const { engine, wallet } = setup();
    const swap = { type: 'UNPROVEN_TRANSACTION', transaction: { id: 'swap' } };
    engine.initSwap.mockReturnValue(of(swap));
    engine.signRecipe.mockReturnValue(
      throwError(() => new Error('signer unavailable')),
    );
    const result = await makeMidnightIntent(wallet, {
      desiredInputs: [unshielded],
      desiredOutputs: [unshielded],
      options: { intentId: 'random', payFees: true },
    });
    expect(result.unwrapErr().message).toBe('signer unavailable');
    expect(engine.revert).toHaveBeenCalledExactlyOnceWith(recipe);
    expect(engine.finalizeRecipe).not.toHaveBeenCalled();
  });

  it('releases what an intent reserved when its fee cannot be paid', async () => {
    const { engine, wallet } = setup();
    const balancingError = new Error('Insufficient DUST');
    engine.balanceUnprovenTransaction.mockReturnValue(
      throwError(() => balancingError),
    );
    const result = await makeMidnightIntent(wallet, {
      desiredInputs: [unshielded],
      desiredOutputs: [unshielded],
      options: { intentId: 'random', payFees: true },
    });
    expect(result.unwrapErr()).toBe(balancingError);
    expect(engine.revert).toHaveBeenCalledExactlyOnceWith(recipe);
    expect(engine.signRecipe).not.toHaveBeenCalled();
    expect(engine.finalizeRecipe).not.toHaveBeenCalled();
  });

  it('reports a failed release beside the fee failure of an intent', async () => {
    const { engine, wallet } = setup();
    const balancingError = new Error('Insufficient DUST');
    const releaseError = new Error('revert failed');
    engine.balanceUnprovenTransaction.mockReturnValue(
      throwError(() => balancingError),
    );
    engine.revert.mockReturnValue(throwError(() => releaseError));
    const result = await makeMidnightIntent(wallet, {
      desiredInputs: [unshielded],
      desiredOutputs: [unshielded],
      options: { intentId: 'random', payFees: true },
    });
    const error = result.unwrapErr();
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([
      balancingError,
      releaseError,
    ]);
    expect(error.message).toBe(
      'Insufficient DUST; the coins it reserved could not be released: revert failed',
    );
    expect(engine.signRecipe).not.toHaveBeenCalled();
  });

  it('signs for unshielded intent inputs but not shielded-only intents', async () => {
    for (const input of [shielded, unshielded]) {
      const { engine, wallet } = setup();
      expect(
        (
          await makeMidnightIntent(wallet, {
            desiredInputs: [input],
            desiredOutputs: [input],
            options: { intentId: 'random', payFees: true },
          })
        ).isOk(),
      ).toBe(true);
      expect(engine.signRecipe).toHaveBeenCalledTimes(
        input.kind === 'unshielded' ? 1 : 0,
      );
    }
  });

  // The wallet library builds a kind's leg from its inputs only, so the
  // requested outputs of a kind without inputs would vanish from a transaction
  // the SDK then signs.
  it('refuses an intent whose outputs are of a kind it offers no inputs of', async () => {
    for (const [input, output] of [
      [unshielded, shielded],
      [shielded, unshielded],
    ]) {
      const { engine, wallet } = setup();
      const result = await makeMidnightIntent(wallet, {
        desiredInputs: [input],
        desiredOutputs: [output],
        options: { intentId: 'random', payFees: true },
      });
      expect(result.isErr() && result.error.message).toMatch(
        `requests ${output.kind} outputs without inputs of that kind`,
      );
      expect(engine.initSwap).not.toHaveBeenCalled();
      expect(engine.signRecipe).not.toHaveBeenCalled();
    }
    const { engine, wallet } = setup();
    const result = await makeMidnightIntent(wallet, {
      desiredInputs: [],
      desiredOutputs: [{ ...unshielded, value: 0n }],
      options: { intentId: 'random', payFees: false },
    });
    expect(result.isErr()).toBe(true);
    expect(engine.initSwap).not.toHaveBeenCalled();
  });

  it('preserves baseline empty arrays', async () => {
    const { wallet } = setup();
    expect(
      (await makeMidnightTransfer(wallet, { desiredOutputs: [] })).isOk(),
    ).toBe(true);
  });

  const badTokens = [
    { kind: 'dust' },
    { type: 'unshielded-preview' + NIGHT_TOKEN_ID },
    { type: 'xx'.repeat(32) },
    { value: -1n },
    { value: 1 },
    { recipient: 'broken' },
    { recipient: shieldedAddress },
    {
      recipient: UnshieldedAddress.codec
        .encode(
          MidnightSDKNetworkIds.PreProd,
          new UnshieldedAddress(Buffer.alloc(32, 7)),
        )
        .toString(),
    },
  ];
  it.each(badTokens.map((bad, index) => [index, bad] as const))(
    'rejects invalid later output %s before any build or signing',
    async (_index, bad) => {
      const { engine, wallet } = setup();
      const desiredOutputs = [
        shielded,
        { ...unshielded, ...bad },
      ] as DesiredOutput[];
      for (const call of [
        async () => makeMidnightTransfer(wallet, { desiredOutputs }),
        async () =>
          makeMidnightIntent(wallet, {
            desiredInputs: [unshielded],
            desiredOutputs,
            options: { intentId: 'random', payFees: true },
          }),
      ]) {
        expect((await call()).isErr()).toBe(true);
      }
      expect(engine.transferTransaction).not.toHaveBeenCalled();
      expect(engine.initSwap).not.toHaveBeenCalled();
      expect(engine.signRecipe).not.toHaveBeenCalled();
    },
  );

  it.each([{ kind: 'dust' }, { type: 'bad' }, { value: -1n }, { value: '3' }])(
    'validates every desired input',
    async bad => {
      const { engine, wallet } = setup();
      const props = {
        desiredInputs: [shielded, { ...unshielded, ...bad }],
        desiredOutputs: [unshielded],
        options: { intentId: 'random', payFees: false },
      } as MidnightMakeIntentProps;
      expect((await makeMidnightIntent(wallet, props)).isErr()).toBe(true);
      expect(engine.initSwap).not.toHaveBeenCalled();
      expect(engine.signRecipe).not.toHaveBeenCalled();
    },
  );

  it.each(['', 'a', 'abzz', 'abcd'])(
    'rejects malformed serialized transactions %s before signing',
    async tx => {
      const { engine, wallet } = setup();
      expect(
        (await balanceMidnightSealedTransaction(wallet, { tx })).isErr(),
      ).toBe(true);
      expect(
        (await balanceMidnightUnsealedTransaction(wallet, { tx })).isErr(),
      ).toBe(true);
      expect(engine.signRecipe).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed arrays and options before signing', async () => {
    const { engine, wallet } = setup();
    for (const props of [
      { desiredOutputs: null },
      { desiredOutputs: [unshielded], options: { payFees: 'false' } },
    ]) {
      expect(
        (
          await makeMidnightTransfer(
            wallet,
            props as unknown as MidnightMakeTransferProps,
          )
        ).isErr(),
      ).toBe(true);
    }
    for (const options of [undefined, {}, { intentId: {}, payFees: true }]) {
      expect(
        (
          await makeMidnightIntent(wallet, {
            desiredInputs: [],
            desiredOutputs: [],
            options,
          } as unknown as MidnightMakeIntentProps)
        ).isErr(),
      ).toBe(true);
    }
    expect(engine.signRecipe).not.toHaveBeenCalled();
  });

  it.each([
    'transferTransaction',
    'initSwap',
    'signRecipe',
    'finalizeRecipe',
  ] as const)('propagates %s failure without submission', async method => {
    const { engine, wallet } = setup();
    const error = new Error(
      method === 'transferTransaction'
        ? 'Insufficient funds / DUST'
        : 'provider failure',
    );
    engine[method].mockImplementation(() => throwError(() => error));
    const result =
      method === 'initSwap'
        ? await makeMidnightIntent(wallet, {
            desiredInputs: [unshielded],
            desiredOutputs: [unshielded],
            options: { intentId: 'random', payFees: true },
          })
        : await makeMidnightTransfer(wallet, { desiredOutputs: [unshielded] });
    expect(result.unwrapErr()).toBe(error);
    if (method === 'transferTransaction' || method === 'initSwap')
      expect(engine.signRecipe).not.toHaveBeenCalled();
    expect(engine.submitTransaction).not.toHaveBeenCalled();
  });

  it('releases the built recipe when signing fails', async () => {
    const { wallet, engine } = setup();
    engine.signRecipe.mockReturnValue(
      throwError(() => new Error('signer unavailable')),
    );
    const result = await makeMidnightTransfer(wallet, {
      desiredOutputs: [unshielded],
    });
    expect(result.unwrapErr().message).toBe('signer unavailable');
    expect(engine.revert).toHaveBeenCalledWith(recipe);
    expect(engine.finalizeRecipe).not.toHaveBeenCalled();
  });

  it('releases only the balancing transaction when signing a dApp transaction fails', async () => {
    const { wallet, engine } = setup();
    vi.spyOn(ledger.Transaction, 'deserialize').mockReturnValue(finalized);
    const balancing = { id: 'balancing' };
    // The dApp's transaction may spend coins an earlier build reserved.
    const sealed = {
      type: 'FINALIZED_TRANSACTION',
      originalTransaction: finalized,
      balancingTransaction: balancing,
    };
    engine.balanceFinalizedTransaction.mockReturnValue(of(sealed) as never);
    engine.signRecipe.mockReturnValue(
      throwError(() => new Error('signer unavailable')),
    );

    const result = await balanceMidnightSealedTransaction(wallet, {
      tx: 'abcd',
    });

    expect(result.unwrapErr().message).toBe('signer unavailable');
    expect(engine.revert).toHaveBeenCalledExactlyOnceWith({
      type: 'UNPROVEN_TRANSACTION',
      transaction: balancing,
    });
  });

  it('releases nothing when signing a dApp transaction that needed no balancing transaction fails', async () => {
    const { wallet, engine } = setup();
    vi.spyOn(ledger.Transaction, 'deserialize').mockReturnValue(finalized);
    // Unshielded balancing adds inputs to the dApp's transaction without
    // reserving them.
    engine.balanceUnboundTransaction.mockReturnValue(
      of({
        type: 'UNBOUND_TRANSACTION',
        baseTransaction: finalized,
        balancingTransaction: undefined,
      }) as never,
    );
    engine.signRecipe.mockReturnValue(
      throwError(() => new Error('signer unavailable')),
    );

    const result = await balanceMidnightUnsealedTransaction(wallet, {
      tx: 'abcd',
      options: { payFees: false },
    });

    expect(result.unwrapErr().message).toBe('signer unavailable');
    expect(engine.revert).not.toHaveBeenCalled();
  });

  it('rejects an unrelated account and keeps separate SDK instances bound', async () => {
    const first = setup();
    const second = setup();
    expect(
      (
        await makeMidnightTransfer(first.wallet, {
          accountId: AccountId('missing'),
          desiredOutputs: [unshielded],
        })
      ).isErr(),
    ).toBe(true);
    expect(first.engine.signRecipe).not.toHaveBeenCalled();
    await makeMidnightTransfer(second.wallet, { desiredOutputs: [unshielded] });
    expect(first.engine.signRecipe).not.toHaveBeenCalled();
    expect(second.engine.signRecipe).toHaveBeenCalledTimes(1);
  });
});

const spendingTx = () =>
  ({
    ...finalized,
    intents: new Map([
      [
        1,
        {
          guaranteedUnshieldedOffer: {
            inputs: [{ intentHash: 'input', outputNo: 0 }],
            outputs: [],
          },
        },
      ],
    ]),
  } as unknown as MidnightFinalizedTx);

describe('submission reconciliation', () => {
  it('records the full input amount from the pending index while an unrelated coin stays available', async () => {
    const { engine, wallet, activities$ } = setup();
    engine.state.mockReturnValue(
      of({
        unshielded: {
          availableCoins: [
            {
              utxo: {
                intentHash: 'unrelated',
                outputNo: 0,
                type: NIGHT_TOKEN_ID,
                value: 50n,
              },
            },
          ],
          pendingCoins: [
            {
              utxo: {
                intentHash: 'input',
                outputNo: 0,
                type: NIGHT_TOKEN_ID,
                value: 9n,
              },
            },
          ],
        },
      }),
    );
    expect(
      (await submitMidnightTx(wallet, { transaction: spendingTx() })).unwrap(),
    ).toEqual({ txId: 'submission-id' });
    expect(activities$.value[accountId]).toHaveLength(1);
    expect(
      activities$.value[accountId][0].tokenBalanceChanges[0].amount,
    ).toEqual(BigNumber(-9n));
  });

  it('writes no row when the index holds none of the transaction inputs', async () => {
    const { engine, wallet, dispatch } = setup();
    engine.state.mockReturnValue(
      of({ unshielded: { availableCoins: [], pendingCoins: [] } }),
    );
    expect(
      (await submitMidnightTx(wallet, { transaction: spendingTx() })).unwrap(),
    ).toEqual({ txId: 'submission-id' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('captures pre-submit coins and upserts by hash, then reconciles a confirmation', async () => {
    const { engine, wallet, dispatch, activities$ } = setup();
    engine.submitTransaction.mockImplementation(() => {
      engine.state.mockReturnValue(
        of({ unshielded: { availableCoins: [], pendingCoins: [] } }),
      );
      return of('submission-id');
    });
    expect(
      (await submitMidnightTx(wallet, { transaction: spendingTx() })).unwrap(),
    ).toEqual({ txId: 'submission-id' });
    expect(engine.state.mock.invocationCallOrder[0]).toBeLessThan(
      engine.submitTransaction.mock.invocationCallOrder[0],
    );
    const pending = activities$.value[accountId][0];
    expect(pending).toMatchObject({
      activityId: 'actual-hash',
      type: ActivityType.Pending,
    });
    expect(pending.tokenBalanceChanges[0].amount).toEqual(BigNumber(-9n));
    dispatch('activities.upsertActivities', {
      accountId,
      activities: [{ ...pending, type: ActivityType.Send }],
    });
    expect(activities$.value[accountId]).toHaveLength(1);
    expect(activities$.value[accountId][0].type).toBe(ActivityType.Send);
  });

  it('deduplicates concurrent submissions by activity hash', async () => {
    const { engine, wallet, activities$ } = setup();
    const results = await Promise.all([
      submitMidnightTx(wallet, { transaction: spendingTx() }),
      submitMidnightTx(wallet, { transaction: spendingTx() }),
    ]);
    expect(results.map(result => result.unwrap())).toEqual([
      { txId: 'submission-id' },
      { txId: 'submission-id' },
    ]);
    expect(engine.submitTransaction).toHaveBeenCalledTimes(2);
    expect(activities$.value[accountId]).toHaveLength(1);
    expect(activities$.value[accountId][0]).toMatchObject({
      activityId: 'actual-hash',
      type: ActivityType.Pending,
    });
    expect(
      activities$.value[accountId][0].tokenBalanceChanges[0].amount,
    ).toEqual(BigNumber(-9n));
  });

  it.each([
    ActivityType.Send,
    ActivityType.Receive,
    ActivityType.Self,
    ActivityType.Failed,
  ])(
    'does not overwrite %s received while submission was pending',
    async type => {
      const { engine, wallet, activities$, dispatch } = setup();
      const confirmed = {
        activityId: 'actual-hash',
        accountId,
        type,
        timestamp: Timestamp(123),
        tokenBalanceChanges: [],
      } satisfies Activity;
      engine.submitTransaction.mockImplementation(() => {
        activities$.next({ [accountId]: [confirmed] });
        return of('submission-id');
      });
      expect(
        (await submitMidnightTx(wallet, { transaction: spendingTx() })).isOk(),
      ).toBe(true);
      expect(dispatch).not.toHaveBeenCalled();
      expect(activities$.value[accountId][0]).toBe(confirmed);
    },
  );

  it('does not fabricate shielded-only activity', async () => {
    const { wallet, dispatch } = setup();
    expect(
      (await submitMidnightTx(wallet, { transaction: finalized })).isOk(),
    ).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    'state',
    'state throws',
    'activities',
    'derive',
    'dispatch',
  ] as const)(
    'keeps successful submission when %s tracking fails',
    async stage => {
      const { wallet, engine, dispatch } = setup();
      const transaction = spendingTx();
      if (stage === 'state')
        engine.state.mockImplementation(() =>
          throwError(() => new Error('state unavailable')),
        );
      if (stage === 'state throws')
        engine.state.mockImplementation(() => {
          throw new Error('state unavailable');
        });
      if (stage === 'activities')
        wallet.stateObservables.activities = {
          selectAllMap$: throwError(() => new Error('activities unavailable')),
        };
      if (stage === 'derive')
        vi.spyOn(transaction, 'transactionHash').mockImplementation(() => {
          throw new Error('derive failed');
        });
      if (stage === 'dispatch')
        dispatch.mockImplementation(() => {
          throw new Error('storage failed');
        });
      expect(
        (await submitMidnightTx(wallet, { transaction })).unwrap(),
      ).toEqual({ txId: 'submission-id' });
      expect(engine.submitTransaction).toHaveBeenCalledTimes(1);
    },
  );

  it('returns the engine rejection and removes the Pending row it recorded', async () => {
    const { wallet, engine, dispatch, activities$ } = setup();
    const error = new Error('node rejected');
    engine.submitTransaction.mockImplementation(() => throwError(() => error));
    const result = (
      await submitMidnightTx(wallet, { transaction: spendingTx() })
    ).unwrapErr();
    expect(result).toBe(error);
    expect(result).not.toBeInstanceOf(MidnightSubmitTimeoutError);
    expect(dispatch.mock.calls.map(([key]) => key)).toEqual([
      'activities.upsertActivities',
      'activities.removeActivities',
    ]);
    expect(activities$.value[accountId]).toEqual([]);
  });

  it('returns an uncertain timeout without reporting confirmation or retrying', async () => {
    const { wallet, engine, activities$ } = setup();
    engine.submitTransaction.mockReturnValue(NEVER);
    const error = (
      await submitMidnightTx(wallet, {
        transaction: spendingTx(),
        submitTimeout: 1,
      })
    ).unwrapErr();
    expect(error).toBeInstanceOf(MidnightSubmitTimeoutError);
    expect(error).toMatchObject({
      code: 'midnight-submit-timeout',
      activityHash: 'actual-hash',
    });
    expect(engine.submitTransaction).toHaveBeenCalledTimes(1);
    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        activityId: 'actual-hash',
        type: ActivityType.Pending,
      }),
    ]);
  });

  it('submits without a Pending row when the coin read does not settle in time', async () => {
    const { wallet, engine, dispatch } = setup();
    const state = { unshielded: { availableCoins: [], pendingCoins: [] } };
    const state$ = new Subject<typeof state>();
    const unsubscribe = vi.fn();
    engine.state.mockReturnValue(state$.pipe(finalize(unsubscribe)));
    engine.submitTransaction.mockReturnValue(of('submission-id'));
    const result = await submitMidnightTx(wallet, {
      transaction: spendingTx(),
      submitTimeout: 20,
    });
    expect(result.unwrap()).toEqual({ txId: 'submission-id' });
    expect(engine.submitTransaction).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    state$.next(state);
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps known submission success when activities never emit', async () => {
    const { wallet, engine, dispatch } = setup();
    const unsubscribe = vi.fn();
    wallet.stateObservables.activities = {
      selectAllMap$: NEVER.pipe(finalize(unsubscribe)),
    };
    const result = await submitMidnightTx(wallet, {
      transaction: spendingTx(),
      submitTimeout: 20,
    });
    expect(result.unwrap()).toEqual({ txId: 'submission-id' });
    expect(engine.submitTransaction).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps watching a tracked submission after the timeout until the engine settles', async () => {
    const { wallet, engine, dispatch } = setup();
    const unsubscribe = vi.fn();
    const finality$ = new Subject<string>();
    engine.submitTransaction.mockReturnValue(
      finality$.pipe(finalize(unsubscribe)),
    );
    const result = await submitMidnightTx(wallet, {
      transaction: spendingTx(),
      submitTimeout: 20,
    });
    expect(result.unwrapErr()).toBeInstanceOf(MidnightSubmitTimeoutError);
    expect(engine.submitTransaction).toHaveBeenCalledTimes(1);
    // The Pending row's outcome is still awaited: the engine's observable stays subscribed.
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(dispatch.mock.calls.map(([key]) => key)).toEqual([
      'activities.upsertActivities',
    ]);

    finality$.next('submission-id');
    finality$.complete();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  describe('midnight-submit-semantics', () => {
    it.each([Infinity, 2 ** 31, 0, -1, Number.NaN])(
      'refuses submitTimeout %s before anything is submitted',
      async submitTimeout => {
        const { wallet, engine, dispatch } = setup();
        const error = (
          await submitMidnightTx(wallet, {
            transaction: spendingTx(),
            submitTimeout,
          })
        ).unwrapErr();
        expect(error).toBeInstanceOf(RangeError);
        expect(error.message).toContain('submitTimeout');
        expect(engine.submitTransaction).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
      },
    );

    it('records the Pending row once the submission is issued, before finality', async () => {
      const { wallet, engine, dispatch, activities$ } = setup();
      const finality$ = new Subject<string>();
      engine.submitTransaction.mockReturnValue(finality$);

      const result = submitMidnightTx(wallet, { transaction: spendingTx() });
      await vi.waitFor(() => {
        expect(dispatch).toHaveBeenCalledTimes(1);
      });
      expect(engine.state.mock.invocationCallOrder[0]).toBeLessThan(
        engine.submitTransaction.mock.invocationCallOrder[0],
      );
      expect(engine.submitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
        dispatch.mock.invocationCallOrder[0],
      );
      expect(activities$.value[accountId]).toEqual([
        expect.objectContaining({
          activityId: 'actual-hash',
          type: ActivityType.Pending,
        }),
      ]);

      finality$.next('submission-id');
      expect((await result).unwrap()).toEqual({ txId: 'submission-id' });
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('keeps the Pending row when finality arrives after the timeout', async () => {
      const { wallet, engine, dispatch, activities$ } = setup();
      const finality$ = new Subject<string>();
      engine.submitTransaction.mockReturnValue(finality$);

      const error = (
        await submitMidnightTx(wallet, {
          transaction: spendingTx(),
          submitTimeout: 20,
        })
      ).unwrapErr();
      finality$.next('submission-id');

      expect(error).toMatchObject({
        code: 'midnight-submit-timeout',
        activityHash: 'actual-hash',
      });
      expect(activities$.value[accountId]).toEqual([
        expect.objectContaining({
          activityId: 'actual-hash',
          type: ActivityType.Pending,
        }),
      ]);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('subscribes a cold engine submission once, for the caller and the watcher', async () => {
      const { wallet, engine, dispatch } = setup();
      let subscriptions = 0;
      engine.submitTransaction.mockReturnValue(
        defer(() => {
          subscriptions += 1;
          return of('submission-id');
        }),
      );
      const result = await submitMidnightTx(wallet, {
        transaction: spendingTx(),
      });
      expect(result.unwrap()).toEqual({ txId: 'submission-id' });
      expect(subscriptions).toBe(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('removes the Pending row when the engine fails after the timeout', async () => {
      const { wallet, engine, dispatch, activities$ } = setup();
      const finality$ = new Subject<string>();
      engine.submitTransaction.mockReturnValue(finality$);

      const error = (
        await submitMidnightTx(wallet, {
          transaction: spendingTx(),
          submitTimeout: 20,
        })
      ).unwrapErr();
      expect(error).toMatchObject({ code: 'midnight-submit-timeout' });
      expect(activities$.value[accountId]).toEqual([
        expect.objectContaining({
          activityId: 'actual-hash',
          type: ActivityType.Pending,
        }),
      ]);

      finality$.error(new Error('rejected by the node'));
      expect(activities$.value[accountId] ?? []).toEqual([]);
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenLastCalledWith('activities.removeActivities', {
        accountId,
        activityIds: ['actual-hash'],
      });
    });

    it('carries the activity hash on a timeout without activity tracking', async () => {
      const { wallet, engine } = setup();
      engine.submitTransaction.mockReturnValue(NEVER);

      const error = (
        await submitMidnightTx(
          { ...wallet, dispatch: undefined },
          { transaction: spendingTx(), submitTimeout: 20 },
        )
      ).unwrapErr();

      expect(error).toMatchObject({
        code: 'midnight-submit-timeout',
        activityHash: 'actual-hash',
      });
    });

    it('keeps a row the history sync confirmed before the engine failed', async () => {
      const { wallet, engine, dispatch, activities$ } = setup();
      const failure$ = new Subject<string>();
      engine.submitTransaction.mockReturnValue(failure$);

      const result = submitMidnightTx(wallet, { transaction: spendingTx() });
      await vi.waitFor(() => {
        expect(dispatch).toHaveBeenCalledTimes(1);
      });
      const [pending] = activities$.value[accountId];
      dispatch('activities.upsertActivities', {
        accountId,
        activities: [{ ...pending, type: ActivityType.Send }],
      });
      failure$.error(new Error('connection lost'));

      expect((await result).unwrapErr().message).toBe('connection lost');
      expect(activities$.value[accountId]).toEqual([
        { ...pending, type: ActivityType.Send },
      ]);
      expect(dispatch.mock.calls.map(([key]) => key)).toEqual([
        'activities.upsertActivities',
        'activities.upsertActivities',
      ]);
    });
  });
});
