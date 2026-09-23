import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { mockProviders } from '@cardano-sdk/util-dev';
import { Subject, defer, firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeComposerBuilding } from '../../../src/store/composer/build-side-effect';

import type { EraSummary } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  ComposerRequest,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

// =====================================================================
// The build side-effect orchestrates the gathering + dispatch; the
// request → tx mapping itself is covered in build-composer-tx.test.ts.
// Here we assert the side-effect's OWN behaviour: it assembles the
// account's chain context from the store and the txExecutorCardano
// observables, never reaches for the network itself, and reports the
// unsigned tx (or a typed failure mapped to build-specific i18n keys)
// through `buildCompleted`.
// =====================================================================

const accountId = 'acct-1' as AccountId;
const TIP_SLOT = 100_000;

const eraSummaries: EraSummary[] = [
  {
    parameters: { epochLength: 432_000, slotLength: 1000 },
    start: { slot: 0, time: new Date(0) },
  } as EraSummary,
];

const addressAt = (paymentHash: string): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16(paymentHash),
    },
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16('ab'.repeat(28)),
    },
  )
    .toAddress()
    .toBech32() as unknown as Cardano.PaymentAddress;

const ownAddress = addressAt('cd'.repeat(28));
const recipient = addressAt('ef'.repeat(28));

const cardanoAddress = {
  accountId,
  blockchainName: 'Cardano' as const,
  address: ownAddress,
  data: {
    type: 0,
    index: 0,
    accountIndex: 0,
    networkId: Cardano.NetworkId.Testnet,
    rewardAccount: mockProviders.rewardAccount,
    stakeKeyDerivationPath: { role: 0, index: 0 },
  },
};

const spendableUtxo: Cardano.Utxo = [
  {
    txId: '11'.repeat(32) as Cardano.TransactionId,
    index: 0,
    address: ownAddress,
  },
  { address: ownAddress, value: { coins: 100_000_000n } },
];

const unspendableUtxo: Cardano.Utxo = [
  {
    txId: '22'.repeat(32) as Cardano.TransactionId,
    index: 0,
    address: ownAddress,
  },
  { address: ownAddress, value: { coins: 90_000_000n } },
];

const request: ComposerRequest = {
  outputs: [
    {
      address: recipient as unknown as CardanoPaymentAddress,
      lovelace: '2000000',
    },
  ],
};

type Overrides = {
  networkMagic?: Cardano.NetworkMagic | undefined;
  protocolParameters?: unknown;
  tip?: Cardano.Tip | undefined;
  eraSummaries?: EraSummary[] | undefined;
  accountUtxos?: Record<string, Cardano.Utxo[]>;
  unspendableUtxos?: Record<string, Cardano.Utxo[]>;
  addresses?: unknown[];
};

const buildCompleted = vi.fn((payload: unknown) => ({
  type: 'composerFlow/buildCompleted',
  payload,
}));

/**
 * Every `CardanoProvider` method the module could reach for. The build
 * must never touch any of them — chain data comes from the already-synced
 * store instead — so these double as the assertion in the
 * "no network round-trip" test below.
 */
const providerSpies = {
  getTip: vi.fn(),
  getProtocolParameters: vi.fn(),
  getEraSummaries: vi.fn(),
  getAccountUtxos: vi.fn(),
  getUtxosAtAddress: vi.fn(),
  resolveInput: vi.fn(),
  submitTx: vi.fn(),
};

const has = (overrides: Overrides, key: keyof Overrides): boolean =>
  Object.hasOwn(overrides, key);

const run = async (
  state: Record<string, unknown>,
  overrides: Overrides = {},
): Promise<{
  payload: {
    result: {
      success: boolean;
      serializedTx?: string;
      txId?: string;
      fees?: { amount: unknown }[];
      error?: { message: string };
      errorTranslationKeys?: { title: string; subtitle: string };
    };
  };
}> => {
  buildCompleted.mockClear();
  for (const spy of Object.values(providerSpies)) spy.mockClear();

  const stateObservables = {
    composerFlow: { selectState$: of(state) },
    cardanoContext: {
      selectProtocolParameters$: of(
        has(overrides, 'protocolParameters')
          ? overrides.protocolParameters
          : mockProviders.protocolParameters,
      ),
      selectTip$: of(
        has(overrides, 'tip') ? overrides.tip : mockProviders.ledgerTip,
      ),
      selectEraSummaries$: of(
        has(overrides, 'eraSummaries') ? overrides.eraSummaries : eraSummaries,
      ),
    },
  };

  const dependencies = {
    txExecutorCardano: {
      cardanoNetworkMagic$: of(
        has(overrides, 'networkMagic')
          ? overrides.networkMagic
          : Cardano.NetworkMagics.Preview,
      ),
      cardanoAccountUtxos$: of(
        overrides.accountUtxos ?? { [accountId]: [spendableUtxo] },
      ),
      cardanoAccountUnspendableUtxos$: of(overrides.unspendableUtxos ?? {}),
      cardanoAddresses$: of(overrides.addresses ?? [cardanoAddress]),
    },
    cardanoProvider: providerSpies,
    actions: { composerFlow: { buildCompleted } },
  };

  const sideEffect = makeComposerBuilding()(
    {} as never,
    stateObservables as never,
    dependencies as never,
  );
  return (await firstValueFrom(sideEffect)) as never;
};

const building = (extra: Record<string, unknown> = {}) => ({
  status: 'Building' as const,
  accountId,
  request,
  ...extra,
});

/** Drains enough macrotask ticks for a gated build to run to completion. */
const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 20; tick += 1) {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
};

describe('makeComposerBuilding', () => {
  it('builds the composed tx and reports the CBOR, id and fee via buildCompleted', async () => {
    const action = await run(building());

    expect(buildCompleted).toHaveBeenCalledTimes(1);
    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
    expect(action.payload.result.txId).toHaveLength(64);
    expect(action.payload.result.fees?.length).toBe(1);
  });

  // ===================================================================
  // The renderer-side composer this replaces fetched protocol
  // parameters, UTxOs and the chain tip straight from Blockfrost with a
  // bundled project key. The build now reads all of it from the synced
  // store, so no credential and no fetch live near the composer.
  // ===================================================================
  it('sources every input from the store, making no provider call of its own', async () => {
    const action = await run(building());

    expect(action.payload.result.success).toBe(true);
    for (const [name, spy] of Object.entries(providerSpies)) {
      expect(
        spy,
        `cardanoProvider.${name} must not be called`,
      ).not.toHaveBeenCalled();
    }
  });

  it('anchors the validity interval on the store tip and era summaries', async () => {
    const action = await run(
      building({ request: { ...request, validitySeconds: 600 } }),
      { tip: { ...mockProviders.ledgerTip, slot: Cardano.Slot(TIP_SLOT) } },
    );

    expect(action.payload.result.success).toBe(true);
  });

  it('excludes unspendable UTxOs from the funding pool', async () => {
    const action = await run(building(), {
      accountUtxos: { [accountId]: [unspendableUtxo] },
      unspendableUtxos: { [accountId]: [unspendableUtxo] },
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys).toEqual({
      title: 'v2.composer.build.error.no-utxos.title',
      subtitle: 'v2.composer.build.error.no-utxos.subtitle',
    });
  });

  it('honours a change address override from the request', async () => {
    const action = await run(
      building({
        request: {
          ...request,
          changeAddress: recipient as unknown as CardanoPaymentAddress,
        },
      }),
    );

    expect(action.payload.result.success).toBe(true);
  });

  it('maps an invalid request to the check-your-transaction keys', async () => {
    const action = await run(
      building({
        request: {
          ...request,
          metadata: [{ label: '674', json: '{oops' }],
        },
      }),
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys).toEqual({
      title: 'v2.composer.build.error.invalid-request.title',
      subtitle: 'v2.composer.build.error.invalid-request.subtitle',
    });
    expect(action.payload.result.error?.message).toContain('not valid JSON');
  });

  // The two mistakes a user can actually make on the composer form: an
  // address no grammar decodes, and an amount the account cannot cover.
  // Both are the request's, not the build's, so both must reach the copy
  // that asks the user to review what they entered.
  it('maps an undecodable output address to the check-your-transaction keys', async () => {
    const action = await run(
      building({
        request: {
          outputs: [{ address: 'addr_test1notanaddress', lovelace: '2000000' }],
        },
      }),
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys).toEqual({
      title: 'v2.composer.build.error.invalid-request.title',
      subtitle: 'v2.composer.build.error.invalid-request.subtitle',
    });
    expect(action.payload.result.error?.message).toContain(
      'not a Cardano address',
    );
  });

  it('maps an undecodable change address override to the same keys', async () => {
    const action = await run(
      building({
        request: { ...request, changeAddress: 'addr_test1notanaddress' },
      }),
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys).toEqual({
      title: 'v2.composer.build.error.invalid-request.title',
      subtitle: 'v2.composer.build.error.invalid-request.subtitle',
    });
    expect(action.payload.result.error?.message).toContain(
      'The change address',
    );
  });

  it('maps an amount the account cannot cover to the check-your-transaction keys', async () => {
    const action = await run(
      building({
        request: {
          outputs: [
            {
              address: recipient as unknown as CardanoPaymentAddress,
              lovelace: '900000000000',
            },
          ],
        },
      }),
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys).toEqual({
      title: 'v2.composer.build.error.invalid-request.title',
      subtitle: 'v2.composer.build.error.invalid-request.subtitle',
    });
  });

  it.each([
    ['network magic', { networkMagic: undefined }, 'network magic'],
    [
      'protocol parameters',
      { protocolParameters: undefined },
      'protocol parameters',
    ],
    ['chain tip', { tip: undefined }, 'chain tip'],
    ['era summaries', { eraSummaries: undefined }, 'era summaries'],
    ['account addresses', { addresses: [] }, 'No Cardano addresses'],
  ])(
    'reports the generic build error when %s is unavailable',
    async (_label, overrides, message) => {
      const action = await run(building(), overrides as Overrides);

      expect(action.payload.result.success).toBe(false);
      expect(action.payload.result.errorTranslationKeys).toEqual({
        title: 'v2.composer.build.error.title',
        subtitle: 'v2.composer.build.error.subtitle',
      });
      expect(action.payload.result.error?.message).toContain(message);
    },
  );

  it('ignores addresses belonging to another account', async () => {
    const action = await run(building(), {
      addresses: [{ ...cardanoAddress, accountId: 'other' as AccountId }],
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toContain(
      'No Cardano addresses',
    );
  });

  it('reports a failure rather than throwing when the account has no UTxOs', async () => {
    const action = await run(building(), { accountUtxos: {} });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toContain(
      'no spendable UTxOs',
    );
  });

  it('wraps a non-Error rejection into the generic build failure', async () => {
    buildCompleted.mockClear();

    const sideEffect = makeComposerBuilding()(
      {} as never,
      {
        composerFlow: { selectState$: of(building()) },
        cardanoContext: {
          // A store observable that rejects with a bare string rather than
          // an Error — the failure path must still produce a dispatchable
          // result instead of letting the side-effect die.
          selectProtocolParameters$: throwError(() => 'provider exploded'),
          selectTip$: of(mockProviders.ledgerTip),
          selectEraSummaries$: of(eraSummaries),
        },
      } as never,
      {
        txExecutorCardano: {
          cardanoNetworkMagic$: of(Cardano.NetworkMagics.Preview),
          cardanoAccountUtxos$: of({ [accountId]: [spendableUtxo] }),
          cardanoAccountUnspendableUtxos$: of({}),
          cardanoAddresses$: of([cardanoAddress]),
        },
        actions: { composerFlow: { buildCompleted } },
      } as never,
    );
    const action = (await firstValueFrom(sideEffect)) as {
      payload: {
        result: {
          success: boolean;
          error?: { message: string };
          errorTranslationKeys?: { title: string };
        };
      };
    };

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toBe('provider exploded');
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.composer.build.error.title',
    );
  });
  // =================================================================
  // Building can only re-enter after the flow has LEFT it — i.e. after a
  // `reset`, which every re-composition dispatches first. So a second
  // trigger is always a build the user asked for, and the first is stale.
  // =================================================================
  it('reports the re-requested build, not the stale one it superseded', async () => {
    buildCompleted.mockClear();

    const state$ = new Subject<Record<string, unknown>>();
    // One gate per build, so the stale build can be released FIRST and still
    // must not reach `buildCompleted`.
    const tipGates: Subject<Cardano.Tip>[] = [];
    const dispatched: {
      payload: { result: { success: boolean; error?: { message: string } } };
    }[] = [];

    const sideEffect = makeComposerBuilding()(
      {} as never,
      {
        composerFlow: { selectState$: state$ },
        cardanoContext: {
          selectProtocolParameters$: of(mockProviders.protocolParameters),
          selectTip$: defer(() => {
            const gate = new Subject<Cardano.Tip>();
            tipGates.push(gate);
            return gate;
          }),
          selectEraSummaries$: of(eraSummaries),
        },
      } as never,
      {
        txExecutorCardano: {
          cardanoNetworkMagic$: of(Cardano.NetworkMagics.Preview),
          cardanoAccountUtxos$: of({ [accountId]: [spendableUtxo] }),
          cardanoAccountUnspendableUtxos$: of({}),
          cardanoAddresses$: of([cardanoAddress]),
        },
        actions: { composerFlow: { buildCompleted } },
      } as never,
    );
    const subscription = sideEffect.subscribe(action =>
      dispatched.push(action as never),
    );

    state$.next(building());
    state$.next({ status: 'Idle' });
    state$.next(
      building({
        request: { ...request, metadata: [{ label: '674', json: '{oops' }] },
      }),
    );
    for (const gate of tipGates) gate.next(mockProviders.ledgerTip);
    await settle();
    subscription.unsubscribe();

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.payload.result.success).toBe(false);
    expect(dispatched[0]?.payload.result.error?.message).toContain(
      'not valid JSON',
    );
  });

  it('reports the account the build was made for', async () => {
    await run(building());

    expect(buildCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ accountId }),
    );
  });
});
