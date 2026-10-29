import {
  MidnightNetworkId,
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  DustAddress,
  MidnightBech32m,
} from '@midnightntwrk/wallet-sdk-address-format';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { estimateMidnightFee } from '../src/estimate-midnight-fee';

import type { MidnightFeeRequest } from '../src/estimate-midnight-fee';
import type { WalletWithMidnight } from '../src/midnight-wallet';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { FacadeState } from '@midnightntwrk/wallet-sdk/facade';

const { accountId, networkId } = stubData;
const dustAddress = DustAddress.codec
  .encode(networkId, new DustAddress(7n))
  .toString();
const transfer: MidnightFeeRequest = {
  kind: 'transfer',
  transfer: {
    kind: 'unshielded',
    outputs: [
      {
        to: stubData.midnightUnshieldedAddress,
        tokenId: toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId),
        amount: 2n,
      },
    ],
  },
};
const shieldedTransfer: MidnightFeeRequest = {
  kind: 'transfer',
  transfer: {
    kind: 'shielded',
    outputs: [
      {
        to: stubData.midnightShieldedAddress,
        tokenId: 'aa'.repeat(32),
        amount: 2n,
      },
    ],
  },
};
const registration: MidnightFeeRequest = {
  kind: 'dust-registration',
  registration: { dustAddress },
};

const setup = ({
  availableDust = 10n,
  keys = true,
  maxCap = 0n,
  night = true,
  registered = false,
} = {}) => {
  const nightVerifyingKey = ledger.signatureVerifyingKey(
    ledger.sampleSigningKey(),
  );
  const state = {
    unshielded: {
      availableCoins: night
        ? [
            {
              utxo: {
                type: NIGHT_TOKEN_ID,
                value: 10n,
                owner: ledger.addressFromKey(nightVerifyingKey),
                intentHash: '00'.repeat(32),
                outputNo: 0,
              },
              meta: {
                ctime: new Date(0),
                registeredForDustGeneration: registered,
              },
            },
          ]
        : [],
    },
    dust: {
      balance: () => availableDust,
      totalCoins: [{ maxCap, generatedNow: 0n }],
    },
  } as unknown as FacadeState;
  const engine = {
    accountId,
    networkId,
    nightVerifyingKey,
    state: () => of(state),
    address$: of({ dust: dustAddress }),
    areKeysAvailable$: of(keys),
    estimateTransactionFee: vi.fn(() => of(3n)),
    calculateTransactionFee: vi.fn(() => of(4n)),
    registerNightUtxosForDustGeneration: vi.fn(),
    signRecipe: vi.fn(),
    signUnprovenTransaction: vi.fn(),
    transferTransaction: vi.fn(),
  };
  const network: Pick<
    WalletWithMidnight['stateObservables']['network'],
    'selectAllActiveNetworkIds$'
  > = {
    selectAllActiveNetworkIds$: of([MidnightNetworkId(networkId)]),
  };
  const wallet: WalletWithMidnight = {
    stateObservables: {
      wallets: {
        selectAll$: of([stubData.midnightWallet]),
      } as WalletWithMidnight['stateObservables']['wallets'],
      network: network as WalletWithMidnight['stateObservables']['network'],
    },
    _loadModules: (async () => [
      of({ [accountId]: engine as unknown as MidnightWallet }),
    ]) as unknown as WalletWithMidnight['_loadModules'],
  };
  return { wallet, engine };
};

const expectUnsigned = (engine: ReturnType<typeof setup>['engine']) => {
  expect(engine.registerNightUtxosForDustGeneration).not.toHaveBeenCalled();
  expect(engine.signRecipe).not.toHaveBeenCalled();
  expect(engine.signUnprovenTransaction).not.toHaveBeenCalled();
  expect(engine.transferTransaction).not.toHaveBeenCalled();
};

describe('unsigned Midnight fee requests', () => {
  it('returns zero for designation with no spendable DUST without invoking registration', async () => {
    const { wallet, engine } = setup({ availableDust: 0n });
    const result = await estimateMidnightFee(wallet, registration);
    expect(result.unwrap()).toEqual({ dustFee: 0n, availableDust: 0n });
    expect(engine.estimateTransactionFee).not.toHaveBeenCalled();
    expect(engine.calculateTransactionFee).not.toHaveBeenCalled();
    expectUnsigned(engine);
  });

  it.each([transfer, shieldedTransfer, registration])(
    'estimates an unsigned $kind with keys',
    async request => {
      const { wallet, engine } = setup();
      expect((await estimateMidnightFee(wallet, request)).unwrap()).toEqual({
        dustFee: 3n,
        availableDust: 10n,
      });
      expect(engine.estimateTransactionFee).toHaveBeenCalledWith(
        expect.any(ledger.Transaction),
        { currentTime: expect.any(Date) as unknown },
      );
      expect(engine.calculateTransactionFee).not.toHaveBeenCalled();
      expectUnsigned(engine);
    },
  );

  it.each([transfer, shieldedTransfer, registration])(
    'calculates an unsigned $kind without keys',
    async request => {
      const { wallet, engine } = setup({ keys: false });
      expect((await estimateMidnightFee(wallet, request)).unwrap()).toEqual({
        dustFee: 4n,
        availableDust: 10n,
      });
      expect(engine.calculateTransactionFee).toHaveBeenCalledOnce();
      expect(engine.estimateTransactionFee).not.toHaveBeenCalled();
      expectUnsigned(engine);
    },
  );

  it.each([transfer, shieldedTransfer, registration])(
    'refuses insufficient DUST for $kind without signing',
    async request => {
      const { wallet, engine } = setup({ availableDust: 1n });
      const result = await estimateMidnightFee(wallet, request);
      expect(result.isErr() && result.error.message).toContain('Insufficient');
      expectUnsigned(engine);
    },
  );

  it.each([{ maxCap: 1n }, { night: false }, { registered: true }])(
    'applies destination eligibility to unsigned estimates: %o',
    async options => {
      const { wallet, engine } = setup(options);
      expect((await estimateMidnightFee(wallet, registration)).isErr()).toBe(
        true,
      );
      expect(engine.estimateTransactionFee).not.toHaveBeenCalled();
      expectUnsigned(engine);
    },
  );

  // The registration the estimate prices: one DUST registration of the
  // account's NIGHT key to its own DUST address, with the fee allowance the
  // engine's own registration would carry. The ledger credits that allowance
  // as DUST in the guaranteed segment, which is what the fee estimate sees.
  const estimatedRegistration = (
    engine: ReturnType<typeof setup>['engine'],
    allowFeePayment: bigint,
  ) => {
    const [[tx]] = engine.estimateTransactionFee.mock.calls as unknown as [
      [
        ledger.Transaction<
          ledger.SignatureEnabled,
          ledger.PreProof,
          ledger.PreBinding
        >,
      ],
    ];
    const registrations = tx.intents?.get(1)?.dustActions?.registrations ?? [];
    expect(registrations).toHaveLength(1);
    expect(registrations[0]?.nightKey).toBe(engine.nightVerifyingKey);
    expect(registrations[0]?.dustAddress).toBe(
      DustAddress.codec.decode(networkId, MidnightBech32m.parse(dustAddress))
        .data,
    );
    expect(registrations[0]?.allowFeePayment).toBe(allowFeePayment);
    const fee = 3n;
    const dustImbalance = [...tx.imbalances(0, fee).entries()].find(
      ([tokenType]) => tokenType.tag === 'dust',
    )?.[1];
    expect(dustImbalance).toBe(allowFeePayment - fee);
  };

  it('prices a first registration with the whole NIGHT value as its fee allowance', async () => {
    const { wallet, engine } = setup();
    const result = await estimateMidnightFee(wallet, {
      kind: 'dust-registration',
      registration: {},
    });
    expect(result.unwrap()).toEqual({ dustFee: 3n, availableDust: 10n });
    estimatedRegistration(engine, 10n);
    expectUnsigned(engine);
  });

  it('estimates own-address repeat registration with no fee allowance, without applying the external eligibility gate', async () => {
    const { wallet, engine } = setup({ maxCap: 10n, registered: true });
    const result = await estimateMidnightFee(wallet, {
      kind: 'dust-registration',
      registration: {},
    });
    expect(result.unwrap()).toEqual({ dustFee: 3n, availableDust: 10n });
    estimatedRegistration(engine, 0n);
    expectUnsigned(engine);
  });

  it('prices a repeat registration with no spendable DUST instead of estimating zero', async () => {
    const { wallet, engine } = setup({ availableDust: 0n, registered: true });
    const result = await estimateMidnightFee(wallet, {
      kind: 'dust-registration',
      registration: {},
    });
    expect(result.isErr() && result.error.message).toContain(
      'Insufficient spendable DUST',
    );
    estimatedRegistration(engine, 0n);
    expectUnsigned(engine);
  });

  it('refuses a ttl for a registration, as registration does', async () => {
    const { wallet, engine } = setup();
    const result = await estimateMidnightFee(wallet, {
      kind: 'dust-registration',
      registration: { ttl: new Date(1) as never },
    });
    expect(result.isErr() && result.error.message).toContain('ttl');
    expect(engine.estimateTransactionFee).not.toHaveBeenCalled();
    expectUnsigned(engine);
  });

  it('rejects a destination of the wrong kind before estimating or signing', async () => {
    const { wallet, engine } = setup();
    const result = await estimateMidnightFee(wallet, {
      kind: 'dust-registration',
      registration: { dustAddress: stubData.midnightUnshieldedAddress },
    });
    expect(result.isErr()).toBe(true);
    expect(engine.estimateTransactionFee).not.toHaveBeenCalled();
    expectUnsigned(engine);
  });

  it('preserves a provider failure without falling back or signing', async () => {
    const { wallet, engine } = setup();
    const error = new Error('fee provider unavailable');
    engine.estimateTransactionFee.mockReturnValue(throwError(() => error));
    const result = await estimateMidnightFee(wallet, transfer);
    expect(result.isErr() && result.error).toBe(error);
    expect(engine.calculateTransactionFee).not.toHaveBeenCalled();
    expectUnsigned(engine);
  });
});
