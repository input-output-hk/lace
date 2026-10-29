import {
  defaultTxTtlLength,
  MidnightAccountId,
  MidnightDustAddress,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import {
  BehaviorSubject,
  defer,
  firstValueFrom,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMidnightTransfer } from '../src/build-midnight-transfer';
import { buildMidnightTransfers } from '../src/build-midnight-transfers';
import { discardMidnightTx } from '../src/discard-midnight-tx';
import {
  MidnightAccountNotFoundError,
  MidnightNothingToRegisterError,
  MidnightWalletNotReadyError,
} from '../src/midnight-errors';
import { observeMidnightBalances } from '../src/observe-midnight-balances';
import { proveMidnightTx } from '../src/prove-midnight-tx';
import { registerMidnightDust } from '../src/register-midnight-dust';
import { signMidnightTx } from '../src/sign-midnight-tx';
import { submitMidnightTx } from '../src/submit-midnight-tx';

import type { MidnightTxRecipe } from '../src/build-midnight-transfer';
import type { MidnightTransferBatch } from '../src/build-midnight-transfers';
import type { WalletWithMidnight } from '../src/midnight-wallet';
import type { MidnightFinalizedTx } from '../src/prove-midnight-tx';
import type {
  MidnightAccountProps,
  MidnightWallet,
  MidnightWalletAddress,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type {
  AnyWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { FacadeState } from '@midnightntwrk/wallet-sdk/facade';

const networkId = MidnightSDKNetworkIds.Preview;
const { walletId } = stubData;
const accountId = MidnightAccountId(walletId, 0, networkId);
const account: InMemoryWalletAccount<MidnightAccountProps> = {
  ...stubData.midnightAccount,
  accountId,
  blockchainNetworkId: MidnightNetworkId(networkId),
  blockchainSpecific: {
    ...stubData.midnightAccount.blockchainSpecific,
    networkId,
  },
};
const secondAccount: InMemoryWalletAccount<MidnightAccountProps> = {
  ...account,
  accountId: MidnightAccountId(walletId, 1, networkId),
  blockchainSpecific: { ...account.blockchainSpecific, accountIndex: 1 },
};
const entity = (accounts: InMemoryWalletAccount<MidnightAccountProps>[]) =>
  ({ ...stubData.midnightWallet, accounts } as AnyWallet);

// A Preview test address and a DUST address of the same network.
const unshieldedAddress = MidnightUnshieldedAddress(
  'mn_addr_preview16f0f6cm8w0zuwkw26aysk02lpvnmnkmu6s2ax4mvalt50l7lhk3s96zjcd',
);
const address: MidnightWalletAddress = {
  unshielded: unshieldedAddress,
  shielded: MidnightShieldedAddress('mn_shield-addr_preview1unused'),
  dust: MidnightDustAddress(
    'mn_dust_preview1wdvvhux7luy22g5w6qsr3qerf49h0curwzfa2fv7acx9x258gmpzzaa5672',
  ),
};

const nightCoin = (value: bigint, registeredForDustGeneration = false) => ({
  utxo: { type: NIGHT_TOKEN_ID, value },
  meta: { registeredForDustGeneration, ctime: new Date(0) },
});
const otherCoin = { utxo: { type: 'ff'.repeat(32), value: 7n }, meta: {} };
const dustCoin = (generatedNow: bigint) => ({ generatedNow });

const facadeState = ({
  available = [nightCoin(5_000_000n)],
  pending = [] as ReturnType<typeof nightCoin>[],
  dustTotal = [dustCoin(30n)],
  dustAvailable = [dustCoin(10n)],
} = {}) =>
  ({
    unshielded: {
      availableCoins: [...available, otherCoin],
      pendingCoins: pending,
    },
    dust: { totalCoins: dustTotal, availableCoins: dustAvailable },
  } as unknown as FacadeState);

const syncProgress = (complete: boolean) => ({
  unshielded: 1,
  shielded: 1,
  dust: 1,
  isStrictlyComplete: {
    unshielded: complete,
    shielded: complete,
    dust: complete,
  },
});

const registrationTx = { id: 'registration-transaction' };
const recipe = {
  type: 'UNPROVEN_TRANSACTION',
  transaction: registrationTx,
} as unknown as MidnightTxRecipe;
const signed = { type: 'SIGNED' } as unknown as MidnightTxRecipe;
const finalized = {
  serialize: () => new Uint8Array(),
} as unknown as MidnightFinalizedTx;

const wallets$ = new BehaviorSubject<MidnightWalletsByAccountId>({});

const fakeEngine = (state$ = of(facadeState())) => {
  const engine = {
    accountId,
    networkId,
    address$: of(address),
    state: () => state$,
    syncProgress$: of(syncProgress(true)),
    transferTransaction: vi.fn(() => of(recipe)),
    registerNightUtxosForDustGeneration: vi.fn(() => of(recipe)),
    balanceUnprovenTransaction: vi.fn(() => of(recipe)),
    signRecipe: vi.fn(() => of(signed)),
    finalizeRecipe: vi.fn(() => of(finalized)),
    submitTransaction: vi.fn(() => of('tx-id')),
    revert: vi.fn((_recipe: MidnightTxRecipe) => of(undefined)),
  };
  wallets$.next({ [accountId]: engine as unknown as MidnightWallet });
  return engine;
};

const walletWith = (
  accounts: InMemoryWalletAccount<MidnightAccountProps>[] = [account],
): WalletWithMidnight => ({
  stateObservables: {
    wallets: { selectAll$: of([entity(accounts)]) },
    network: {
      selectAllActiveNetworkIds$: of([MidnightNetworkId(networkId)]),
    },
  } as unknown as WalletWithMidnight['stateObservables'],
  _loadModules: (async () => [
    wallets$,
  ]) as unknown as WalletWithMidnight['_loadModules'],
});

describe('Midnight helpers', () => {
  beforeEach(() => {
    wallets$.next({});
  });
  afterEach(() => {
    wallets$.next({});
  });

  describe('account resolution', () => {
    it.each([Infinity, 2 ** 31, 0, -1])(
      'refuses startTimeout %s with a RangeError',
      async startTimeout => {
        fakeEngine();
        const error = (
          await signMidnightTx(walletWith(), { recipe, startTimeout })
        ).unwrapErr();
        expect(error).toBeInstanceOf(RangeError);
        expect(error.message).toContain('startTimeout');
      },
    );

    it('fails when the active network has no Midnight account', async () => {
      const result = await signMidnightTx(walletWith([]), { recipe });
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightAccountNotFoundError,
      );
    });

    it('needs accountId with more than one account', async () => {
      const result = await signMidnightTx(
        walletWith([account, secondAccount]),
        {
          recipe,
        },
      );
      expect(result.isErr() && result.error.message).toContain('Multiple');
    });

    it('fails when the requested account is not on the active network', async () => {
      const result = await signMidnightTx(walletWith(), {
        recipe,
        accountId: AccountId('elsewhere'),
      });
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightAccountNotFoundError,
      );
    });

    it('signs with the requested account among several', async () => {
      const engine = fakeEngine();
      const result = await signMidnightTx(
        walletWith([secondAccount, account]),
        {
          recipe,
          accountId,
        },
      );
      expect(result.isOk() && result.value).toBe(signed);
      expect(engine.signRecipe).toHaveBeenCalledWith(recipe);
    });

    it('fails when the engine does not start the wallet in time', async () => {
      const result = await signMidnightTx(walletWith(), {
        recipe,
        startTimeout: 20,
      });
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightWalletNotReadyError,
      );
    });

    it('waits for the engine to start the wallet', async () => {
      const pending = signMidnightTx(walletWith(), { recipe });
      await new Promise(resolve => setTimeout(resolve, 10));
      fakeEngine();
      expect((await pending).isOk()).toBe(true);
    });
  });

  describe('buildMidnightTransfer', () => {
    it('builds an unshielded NIGHT transfer to the decoded address with a one hour ttl', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-09T00:00:00Z') });
      const engine = fakeEngine();
      const result = await buildMidnightTransfer(walletWith(), {
        to: unshieldedAddress,
        amount: 1_000_000n,
      });
      vi.useRealTimers();

      expect(result.isOk() && result.value).toBe(recipe);
      expect(engine.transferTransaction).toHaveBeenCalledWith(
        [
          {
            type: 'unshielded',
            outputs: [
              {
                type: NIGHT_TOKEN_ID,
                receiverAddress: UnshieldedAddress.codec.decode(
                  networkId,
                  MidnightBech32m.parse(unshieldedAddress),
                ),
                amount: 1_000_000n,
              },
            ],
          },
        ],
        { ttl: new Date('2026-10-09T01:00:00Z'), payFees: false },
      );
    });

    it('fails on an address of another network', async () => {
      fakeEngine();
      const result = await buildMidnightTransfer(walletWith(), {
        to: stubData.midnightUnshieldedAddress,
        amount: 1n,
        ttl: new Date(0),
      });
      expect(result.isErr()).toBe(true);
    });
  });

  describe('buildMidnightTransfers', () => {
    const tokenId = toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId);
    const output = { to: unshieldedAddress, amount: 2n, tokenId };

    it('preserves every recipient, token and amount in an unshielded batch', async () => {
      const engine = fakeEngine();
      const second = UnshieldedAddress.codec
        .encode(networkId, new UnshieldedAddress(Buffer.alloc(32, 7)))
        .toString();
      const result = await buildMidnightTransfers(walletWith(), {
        kind: 'unshielded',
        outputs: [
          output,
          {
            to: second,
            amount: 3n,
            tokenId: toUnshieldedTokenType('aa'.repeat(32), networkId),
          },
        ],
      });
      expect(result.isOk()).toBe(true);
      expect(engine.transferTransaction).toHaveBeenCalledWith(
        [
          {
            type: 'unshielded',
            outputs: [
              {
                type: NIGHT_TOKEN_ID,
                amount: 2n,
                receiverAddress: UnshieldedAddress.codec.decode(
                  networkId,
                  MidnightBech32m.parse(unshieldedAddress),
                ),
              },
              {
                type: 'aa'.repeat(32),
                amount: 3n,
                receiverAddress: UnshieldedAddress.codec.decode(
                  networkId,
                  MidnightBech32m.parse(second),
                ),
              },
            ],
          },
        ],
        { ttl: expect.any(Date) as unknown, payFees: false },
      );
      expect(engine.signRecipe).not.toHaveBeenCalled();
    });

    it('preserves both shielded token outputs', async () => {
      const engine = fakeEngine();
      const receiverAddress = ShieldedAddress.codec.decode(
        stubData.networkId,
        MidnightBech32m.parse(stubData.midnightShieldedAddress),
      );
      const to = ShieldedAddress.codec
        .encode(networkId, receiverAddress)
        .toString();
      const result = await buildMidnightTransfers(walletWith(), {
        kind: 'shielded',
        outputs: [
          { to, tokenId: 'aa'.repeat(32), amount: 2n },
          { to, tokenId: 'bb'.repeat(32), amount: 4n },
        ],
      });
      expect(result.isOk()).toBe(true);
      expect(engine.transferTransaction).toHaveBeenCalledWith(
        [
          {
            type: 'shielded',
            outputs: [
              { type: 'aa'.repeat(32), amount: 2n, receiverAddress },
              { type: 'bb'.repeat(32), amount: 4n, receiverAddress },
            ],
          },
        ],
        { ttl: expect.any(Date) as unknown, payFees: false },
      );
    });

    it.each(
      [
        [],
        [{ ...output, amount: 0n }],
        [{ ...output, amount: -1n }],
        [{ ...output, amount: 1.5 }],
        [{ ...output, to: 'invalid' }],
        [{ ...output, to: stubData.midnightUnshieldedAddress }],
        [{ ...output, to: address.dust }],
        [{ ...output, tokenId: NIGHT_TOKEN_ID }],
        [
          {
            ...output,
            tokenId: toUnshieldedTokenType(NIGHT_TOKEN_ID, stubData.networkId),
          },
        ],
        [output, { ...output, tokenId: 'aa'.repeat(32) }],
      ].map(outputs => ({ outputs })),
    )(
      'refuses malformed or mixed outputs before engine invocation: %o',
      async ({ outputs }) => {
        const engine = fakeEngine();
        const result = await buildMidnightTransfers(walletWith(), {
          kind: 'unshielded',
          outputs,
        } as unknown as MidnightTransferBatch);
        expect(result.isErr()).toBe(true);
        expect(engine.transferTransaction).not.toHaveBeenCalled();
        expect(engine.signRecipe).not.toHaveBeenCalled();
      },
    );

    it.each(['Insufficient tokens', 'Insufficient DUST'])(
      'preserves engine refusal: %s',
      async message => {
        const engine = fakeEngine();
        const error = new Error(message);
        engine.transferTransaction.mockReturnValue(throwError(() => error));
        const result = await buildMidnightTransfers(walletWith(), {
          kind: 'unshielded',
          outputs: [output],
        });
        expect(result.isErr() && result.error).toBe(error);
      },
    );
  });

  describe('midnight-dust-guards: registerMidnightDust', () => {
    it('registers every available NIGHT coin at the own DUST address without a fee the first time', async () => {
      const coins = [nightCoin(1n), nightCoin(2n)];
      const engine = fakeEngine(of(facadeState({ available: coins })));
      const result = await registerMidnightDust(walletWith());

      expect(result.isOk() && result.value).toBe(recipe);
      expect(engine.registerNightUtxosForDustGeneration).toHaveBeenCalledWith(
        coins,
        DustAddress.codec.decode(
          networkId,
          MidnightBech32m.parse(address.dust),
        ),
      );
      expect(engine.balanceUnprovenTransaction).not.toHaveBeenCalled();
    });

    it('registers an eligible external DUST destination and preserves coin metadata', async () => {
      const engine = fakeEngine(of(facadeState({ dustTotal: [] })));
      const destination = DustAddress.codec
        .encode(networkId, new DustAddress(7n))
        .toString();
      const result = await registerMidnightDust(walletWith(), {
        dustAddress: destination,
      });
      expect(result.isOk()).toBe(true);
      expect(engine.registerNightUtxosForDustGeneration).toHaveBeenCalledWith(
        [nightCoin(5_000_000n)],
        DustAddress.codec.decode(networkId, MidnightBech32m.parse(destination)),
      );
    });

    it.each([
      'invalid',
      unshieldedAddress,
      DustAddress.codec
        .encode(stubData.networkId, new DustAddress(7n))
        .toString(),
    ])(
      'rejects invalid DUST destination before registration: %s',
      async dustAddress => {
        const engine = fakeEngine();
        expect(
          (await registerMidnightDust(walletWith(), { dustAddress })).isErr(),
        ).toBe(true);
        expect(
          engine.registerNightUtxosForDustGeneration,
        ).not.toHaveBeenCalled();
      },
    );

    it('rejects external designation when generation capacity exists, including pending DUST', async () => {
      const state = facadeState({ dustAvailable: [], dustTotal: [] });
      const engine = fakeEngine(
        of({
          ...state,
          dust: {
            ...state.dust,
            totalCoins: [{ maxCap: 1n, generatedNow: 0n }],
          },
        } as unknown as FacadeState),
      );
      const result = await registerMidnightDust(walletWith(), {
        dustAddress: address.dust,
      });
      expect(result.isErr() && result.error.message).toBe(
        'DUST destination cannot be changed while the account is designated for DUST generation',
      );
      expect(engine.registerNightUtxosForDustGeneration).not.toHaveBeenCalled();
      expect((await registerMidnightDust(walletWith())).isOk()).toBe(true);
    });

    it('rejects external designation without NIGHT before registration', async () => {
      const engine = fakeEngine(of(facadeState({ available: [] })));
      expect(
        (
          await registerMidnightDust(walletWith(), {
            dustAddress: address.dust,
          })
        ).isErr(),
      ).toBe(true);
      expect(engine.registerNightUtxosForDustGeneration).not.toHaveBeenCalled();
    });

    it.each([
      {
        case: 'NIGHT registered elsewhere, no own generation',
        state: facadeState({
          available: [nightCoin(1n, true), nightCoin(2n)],
          dustTotal: [],
        }),
      },
      {
        case: 'generated DUST without capacity',
        state: facadeState({
          dustTotal: [{ generatedNow: 1n, maxCap: 0n }] as never,
        }),
      },
    ])(
      'refuses a new destination while the account is designated: $case',
      async ({ state }) => {
        const engine = fakeEngine(of(state));
        const destination = DustAddress.codec
          .encode(networkId, new DustAddress(7n))
          .toString();

        const result = await registerMidnightDust(walletWith(), {
          dustAddress: destination,
        });

        expect(result.isErr() && result.error.message).toContain(
          'designated for DUST generation',
        );
        expect(
          engine.registerNightUtxosForDustGeneration,
        ).not.toHaveBeenCalled();
        expect(engine.balanceUnprovenTransaction).not.toHaveBeenCalled();
      },
    );

    it('re-registers NIGHT registered elsewhere to the own address when no destination is given', async () => {
      const coins = [nightCoin(1n, true), nightCoin(2n)];
      const engine = fakeEngine(
        of(facadeState({ available: coins, dustTotal: [], dustAvailable: [] })),
      );
      engine.balanceUnprovenTransaction.mockReturnValue(of(signed));

      const result = await registerMidnightDust(walletWith());

      expect(result.isOk() && result.value).toBe(signed);
      expect(engine.registerNightUtxosForDustGeneration).toHaveBeenCalledWith(
        coins,
        DustAddress.codec.decode(
          networkId,
          MidnightBech32m.parse(address.dust),
        ),
      );
      expect(engine.balanceUnprovenTransaction).toHaveBeenCalledWith(
        registrationTx,
        expect.objectContaining({ tokenKindsToBalance: ['dust'] }),
      );
    });

    it.each([
      { case: 'first', coins: [nightCoin(1n)] },
      { case: 'repeat', coins: [nightCoin(1n, true)] },
    ])(
      'refuses a ttl on a $case registration before registering',
      async ({ coins }) => {
        const engine = fakeEngine(of(facadeState({ available: coins })));

        const result = await registerMidnightDust(walletWith(), {
          ttl: new Date(1) as never,
        });

        expect(result.isErr() && result.error.message).toContain('ttl');
        expect(
          engine.registerNightUtxosForDustGeneration,
        ).not.toHaveBeenCalled();
      },
    );

    it('balances a repeat registration with DUST over the engine validity window', async () => {
      const coins = [nightCoin(1n, true), nightCoin(2n)];
      const engine = fakeEngine(
        of(facadeState({ available: coins, dustTotal: [] })),
      );
      engine.balanceUnprovenTransaction.mockReturnValue(of(signed));
      const before = Date.now();
      const result = await registerMidnightDust(walletWith());
      const after = Date.now();

      expect(result.isOk() && result.value).toBe(signed);
      expect(engine.registerNightUtxosForDustGeneration).toHaveBeenCalledWith(
        coins,
        DustAddress.codec.decode(
          networkId,
          MidnightBech32m.parse(address.dust),
        ),
      );
      expect(engine.balanceUnprovenTransaction).toHaveBeenCalledOnce();
      const [balanced, options] = engine.balanceUnprovenTransaction.mock
        .calls[0] as unknown as [
        unknown,
        { ttl: Date; tokenKindsToBalance: string[] },
      ];
      expect(balanced).toBe(registrationTx);
      expect(options.tokenKindsToBalance).toEqual(['dust']);
      expect(options.ttl.getTime()).toBeGreaterThanOrEqual(
        before + defaultTxTtlLength,
      );
      expect(options.ttl.getTime()).toBeLessThanOrEqual(
        after + defaultTxTtlLength,
      );
    });

    it('releases the reserved NIGHT when DUST balancing of a repeat registration fails', async () => {
      const engine = fakeEngine(
        of(facadeState({ available: [nightCoin(1n, true)] })),
      );
      const error = new Error('Insufficient DUST');
      engine.balanceUnprovenTransaction.mockReturnValue(
        throwError(() => error),
      );

      const result = await registerMidnightDust(walletWith());

      expect(result.isErr() && result.error).toBe(error);
      expect(engine.revert).toHaveBeenCalledWith(recipe);
    });

    it('reports both failures when releasing the registration also fails', async () => {
      const engine = fakeEngine(
        of(facadeState({ available: [nightCoin(1n, true)] })),
      );
      const error = new Error('Insufficient DUST');
      const releaseError = new Error('revert failed');
      engine.balanceUnprovenTransaction.mockReturnValue(
        throwError(() => error),
      );
      engine.revert.mockReturnValue(throwError(() => releaseError) as never);

      const result = await registerMidnightDust(walletWith());

      const failure = result.isErr() ? result.error : undefined;
      expect(failure).toBeInstanceOf(AggregateError);
      expect((failure as AggregateError).errors).toEqual([error, releaseError]);
      expect(failure?.message).toBe(
        'Insufficient DUST; the coins it reserved could not be released: revert failed',
      );
    });

    it('does not release a registration it returns', async () => {
      const engine = fakeEngine(
        of(facadeState({ available: [nightCoin(1n, true)] })),
      );
      expect((await registerMidnightDust(walletWith())).isOk()).toBe(true);
      expect(engine.revert).not.toHaveBeenCalled();
    });

    it('fails when the account holds no NIGHT', async () => {
      fakeEngine(of(facadeState({ available: [] })));
      const result = await registerMidnightDust(walletWith());
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightNothingToRegisterError,
      );
    });
  });

  describe('midnight-build-no-lock', () => {
    type Coin = ReturnType<typeof nightCoin>;
    type ReservingRecipe = MidnightTxRecipe & { inputs: Coin[] };

    // Mirrors the wallet library: building moves the selected NIGHT from
    // available to pending, and only `revert` moves it back.
    const reservingEngine = () => {
      const coins = {
        available: [nightCoin(5_000_000n)],
        pending: [] as Coin[],
      };
      const state$ = new BehaviorSubject(facadeState(coins));
      const publish = () => {
        state$.next(facadeState(coins));
      };
      const engine = fakeEngine(state$);
      let lastBuilt: ReservingRecipe | undefined;
      engine.transferTransaction.mockImplementation(() =>
        defer(() => {
          const inputs = coins.available.splice(0);
          if (inputs.length === 0)
            return throwError(() => new Error('Insufficient funds'));
          coins.pending.push(...inputs);
          publish();
          lastBuilt = { ...recipe, inputs } as ReservingRecipe;
          return of(lastBuilt);
        }),
      );
      // Balancing returns the built recipe; the inputs stay booked.
      engine.balanceUnprovenTransaction.mockImplementation(() =>
        defer(() => of(lastBuilt as MidnightTxRecipe)),
      );
      engine.revert.mockImplementation(built =>
        defer(() => {
          const { inputs } = built as ReservingRecipe;
          coins.pending = coins.pending.filter(coin => !inputs.includes(coin));
          coins.available.push(...inputs);
          publish();
          return of(undefined);
        }),
      );
      const available = () =>
        state$.value.unshielded.availableCoins.map(({ utxo }) => utxo);
      return { engine, available };
    };

    const builders = {
      buildMidnightTransfer: async (wallet: WalletWithMidnight) =>
        buildMidnightTransfer(wallet, { to: unshieldedAddress, amount: 1n }),
      buildMidnightTransfers: async (wallet: WalletWithMidnight) =>
        buildMidnightTransfers(wallet, {
          kind: 'unshielded',
          outputs: [
            {
              to: unshieldedAddress,
              amount: 1n,
              tokenId: toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId),
            },
          ],
        }),
    };

    it.each(Object.entries(builders))(
      '%s: build, decline and discard restores the available coins and a later build succeeds',
      async (_, build) => {
        const { engine, available } = reservingEngine();
        const before = available();

        const declined = await build(walletWith());
        expect(declined.isOk()).toBe(true);
        expect(available()).not.toEqual(before);

        const declinedRecipe = declined.unwrap();
        expect(
          (
            await discardMidnightTx(walletWith(), { recipe: declinedRecipe })
          ).isOk(),
        ).toBe(true);
        expect(engine.revert).toHaveBeenCalledWith(declinedRecipe);
        expect(available()).toEqual(before);

        expect((await build(walletWith())).isOk()).toBe(true);
        expect(engine.transferTransaction).toHaveBeenCalledTimes(2);
        expect(engine.signRecipe).not.toHaveBeenCalled();
      },
    );

    it.each(Object.entries(builders))(
      '%s: a fee that cannot be paid releases the inputs the build reserved and returns the balancing error',
      async (_, build) => {
        const { engine, available } = reservingEngine();
        const before = available();
        engine.balanceUnprovenTransaction.mockReturnValueOnce(
          throwError(() => new Error('Insufficient spendable DUST')),
        );

        const result = await build(walletWith());
        expect(result.unwrapErr().message).toBe('Insufficient spendable DUST');
        expect(engine.revert).toHaveBeenCalledTimes(1);
        expect(available()).toEqual(before);

        expect((await build(walletWith())).isOk()).toBe(true);
      },
    );

    it('reports both failures when the release after a fee failure fails too', async () => {
      const { engine, available } = reservingEngine();
      const before = available();
      engine.balanceUnprovenTransaction.mockReturnValueOnce(
        throwError(() => new Error('Insufficient spendable DUST')),
      );
      engine.revert.mockReturnValueOnce(
        throwError(() => new Error('engine stopped')),
      );

      const error = (
        await builders.buildMidnightTransfer(walletWith())
      ).unwrapErr();
      expect(error).toBeInstanceOf(AggregateError);
      expect(error.message).toBe(
        'Insufficient spendable DUST; the coins it reserved could not be released: engine stopped',
      );
      expect(available()).not.toEqual(before);
    });

    it('a recipe abandoned without discard keeps its inputs out of the next build', async () => {
      const { engine } = reservingEngine();
      expect((await builders.buildMidnightTransfer(walletWith())).isOk()).toBe(
        true,
      );

      const next = await builders.buildMidnightTransfer(walletWith());

      expect(next.isErr() && next.error.message).toBe('Insufficient funds');
      expect(engine.revert).not.toHaveBeenCalled();
    });

    it('reports an engine release failure as an error result', async () => {
      const engine = fakeEngine();
      engine.revert.mockReturnValue(
        throwError(() => new Error('revert failed')) as never,
      );
      const result = await discardMidnightTx(walletWith(), { recipe });
      expect(result.isErr() && result.error.message).toBe('revert failed');
    });

    it('fails without releasing when the account is not on the active network', async () => {
      const engine = fakeEngine();
      const result = await discardMidnightTx(walletWith([]), { recipe });
      expect(result.isErr() && result.error).toBeInstanceOf(
        MidnightAccountNotFoundError,
      );
      expect(engine.revert).not.toHaveBeenCalled();
    });
  });

  describe('prove and submit', () => {
    it('proves through the engine within the timeout', async () => {
      const engine = fakeEngine();
      const result = await proveMidnightTx(walletWith(), { recipe: signed });
      expect(result.isOk() && result.value).toBe(finalized);
      expect(engine.finalizeRecipe).toHaveBeenCalledWith(signed);
    });

    it('fails when proving exceeds the timeout', async () => {
      const engine = fakeEngine();
      engine.finalizeRecipe.mockReturnValue(new Subject() as never);
      const result = await proveMidnightTx(walletWith(), {
        recipe: signed,
        proveTimeout: 20,
      });
      expect(result.isErr() && result.error.name).toBe('TimeoutError');
    });

    it('submits and returns the transaction id', async () => {
      const engine = fakeEngine();
      const result = await submitMidnightTx(walletWith(), {
        transaction: finalized,
      });
      expect(result.isOk() && result.value).toEqual({ txId: 'tx-id' });
      expect(engine.submitTransaction).toHaveBeenCalledWith(finalized);
    });

    it('settles an engine failure as an error result', async () => {
      const engine = fakeEngine();
      engine.submitTransaction.mockReturnValue(
        throwError(() => new Error('rejected')) as never,
      );
      const result = await submitMidnightTx(walletWith(), {
        transaction: finalized,
        submitTimeout: 20,
      });
      expect(result.isErr() && result.error.message).toBe('rejected');
    });
  });

  describe('observeMidnightBalances', () => {
    it('sums NIGHT and DUST from the engine state and reports sync', async () => {
      const state$ = new BehaviorSubject(
        facadeState({
          available: [nightCoin(3n), nightCoin(4n)],
          pending: [nightCoin(5n)],
          dustTotal: [dustCoin(20n), dustCoin(1n)],
          dustAvailable: [dustCoin(1n)],
        }),
      );
      fakeEngine(state$);

      expect(
        await firstValueFrom(observeMidnightBalances(walletWith())),
      ).toEqual({
        accountId,
        address,
        night: { available: 7n, pending: 5n },
        dust: { balance: 21n, available: 1n },
        synced: { unshielded: true, shielded: true, dust: true },
      });
    });

    it('errors when no Midnight account is present', async () => {
      await expect(
        firstValueFrom(observeMidnightBalances(walletWith([]))),
      ).rejects.toBeInstanceOf(MidnightAccountNotFoundError);
    });
  });
});
