import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
} from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { mockProviders } from '@cardano-sdk/util-dev';
import { ActivityType } from '@lace-contract/activities';
import {
  CardanoDustNetwork,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  dustMappingDatumToCbor,
  getCnightAssetId,
  getDustGeneratorPaymentAddress,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import { Subject, defer, firstValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { BOUNDED_EX_UNITS_PER_REDEEMER } from '../../../src/store/night-designation/bounded-ex-units-evaluator';
import {
  LIVE_PENDING_WINDOW_MS,
  TTL_BUFFER_SLOTS,
  makeNightDesignationBuilding,
} from '../../../src/store/night-designation/build-side-effect';

import type { Activity } from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

// =====================================================================
// The build side-effect orchestrates IO + dispatch; the blueprint →
// TransactionBuilder mapping itself is golden-tested in
// build-night-designation-tx.test.ts. Here we assert the side-effect's
// OWN behaviour: it gathers account context + network data through the
// injected observables/provider, scans the script address for the
// account's registration (spent by update/deregister, and a refusal for
// designate), runs the build, and reports the unsigned tx (or a typed
// failure mapped to the build-specific i18n keys) via `buildCompleted`.
//
// `firstStateOfStatus` applies `distinctUntilChanged` on `status`, so
// consecutive `Building` states collapse to one trigger and a second trigger
// only ever means the flow was reset and re-requested — asserted below to
// leave no stale build able to answer for the new one.
// =====================================================================

const network = CardanoDustNetwork.testnet;
const { ledgerTip, protocolParameters } = mockProviders;

// Minimal single-era summary — deriveCompactGenesis reads only start.time +
// the latest era's epochLength/slotLength.
const eraSummaries = [
  {
    parameters: { epochLength: 432_000, slotLength: 1000, safeZone: 129_600 },
    start: { slot: 0, time: new Date(0) },
  },
] as never;

// Preview testnet → fromNetworkMagic maps to CardanoDustNetwork.testnet, so
// getCnightAssetId(network) matches the asset on the fixture UTxOs below.
const chainId: Cardano.ChainId = {
  networkId: Cardano.NetworkId.Testnet,
  networkMagic: 2,
};

const accountId = 'acct-1' as AccountId;
// Canonical SCALE-compact targets: 0x6f header (big-integer mode, 31 scalar
// bytes) with a non-zero top byte.
const dustPubkeyHex = '6f' + 'ef'.repeat(30) + '11';

const paymentKeyHashHex = 'cd'.repeat(28);
const stakeKeyHashHex = 'ab'.repeat(28);
const stakeKeyHash = CardanoStakeKeyHash(new Uint8Array(28).fill(0xab));

// A real base address so the side-effect's `asBase()` credential derivation
// yields the payment + stake key hashes above.
const baseAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(paymentKeyHashHex),
  },
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(stakeKeyHashHex),
  },
)
  .toAddress()
  .toBech32() as unknown as Cardano.PaymentAddress;

const cnightAssetId = getCnightAssetId(network);
const nftAssetId = getDustMappingNftAssetId(network);
const scriptAddress = getDustGeneratorPaymentAddress(network);

const addressData = {
  type: 0,
  index: 0,
  accountIndex: 0,
  networkId: Cardano.NetworkId.Testnet,
  rewardAccount: mockProviders.rewardAccount,
  stakeKeyDerivationPath: { role: 0, index: 0 },
};

const cardanoAddress = {
  accountId,
  blockchainName: 'Cardano' as const,
  address: baseAddress,
  data: addressData,
};

// cNIGHT UTxOs (rotated through the tx) + a fat ADA UTxO (cover + collateral),
// all owned by the account's base address.
const cnightUtxo = (txId: string, qty: bigint): Cardano.Utxo => [
  { txId: txId as Cardano.TransactionId, index: 0, address: baseAddress },
  {
    address: baseAddress,
    value: { coins: 3_000_000n, assets: new Map([[cnightAssetId, qty]]) },
  },
];
const adaUtxo: Cardano.Utxo = [
  {
    txId: '77'.repeat(32) as Cardano.TransactionId,
    index: 0,
    address: baseAddress,
  },
  { address: baseAddress, value: { coins: 100_000_000n } },
];
const cnightUtxos = [
  cnightUtxo('11'.repeat(32), 50n),
  cnightUtxo('33'.repeat(32), 30n),
];

// A registration UTxO at the script address whose inline datum is bound to the
// account's stake key — what resolveAction scans for on update/deregister.
const registrationUtxo: Cardano.Utxo = [
  {
    txId: '99'.repeat(32) as Cardano.TransactionId,
    index: 0,
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

const plutusProtocolParameters = {
  ...protocolParameters,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  maxExecutionUnitsPerTransaction: {
    memory: 14_000_000,
    steps: 10_000_000_000,
  },
  costModels: new Map([
    [Cardano.PlutusLanguageVersion.V3, Array.from({ length: 251 }, () => 0)],
  ]),
} as unknown as typeof protocolParameters;

type Overrides = {
  chainId?: Cardano.ChainId | undefined;
  accountUtxos?: Cardano.Utxo[];
  addresses?: unknown[];
  scriptUtxos?: Cardano.Utxo[];
  scriptScanError?: Error;
  pendingActivities?: Activity[];
  pendingActivitiesByAccount$?: Observable<unknown>;
  scriptRewardAccountInfo?: {
    isRegistered: boolean;
    withdrawableAmount: BigNumber;
  };
  /** What the provider prices the redeemers at; 'declined' = no evaluation. */
  evaluation?: Cardano.ExUnits | 'declined';
};

const EVALUATED_EX_UNITS: Cardano.ExUnits = {
  memory: 500_000,
  steps: 160_000_000,
};

const pendingDesignation = (
  action: 'deregister' | 'designate' | 'update',
  ageMs = 0,
): Activity =>
  ({
    accountId,
    activityId: `pending-${action}`,
    timestamp: Date.now() - ageMs,
    tokenBalanceChanges: [],
    type: ActivityType.Pending,
    blockchainSpecific: { Cardano: { nightDesignation: { action } } },
  } as unknown as Activity);

// Accounts with no pendings are ABSENT from the selector's map, so the default is
// an emitting-but-empty map rather than a missing key.
const pendingActivitiesByAccount$ = (overrides: Overrides) =>
  overrides.pendingActivitiesByAccount$ ??
  of(
    overrides.pendingActivities === undefined
      ? {}
      : { [accountId]: overrides.pendingActivities },
  );

const buildCompleted = vi.fn((payload: unknown) => ({
  type: 'nightDesignationFlow/buildCompleted',
  payload,
}));

// The scan default is EMPTY, so a test that wants a registration to exist says
// so — otherwise every designate test would silently exercise the refusal.
const makeDependencies = (overrides: Overrides) => ({
  logger: dummyLogger,
  txExecutorCardano: {
    // 'chainId' in overrides preserves an explicit `undefined` (the
    // missing-chain-id case) rather than falling back to the default.
    cardanoChainId$: of('chainId' in overrides ? overrides.chainId : chainId),
    cardanoAccountUtxos$: of({
      [accountId]: overrides.accountUtxos ?? [...cnightUtxos, adaUtxo],
    }),
    cardanoAccountUnspendableUtxos$: of({}),
    cardanoAddresses$: of(overrides.addresses ?? [cardanoAddress]),
  },
  cardanoProvider: {
    getProtocolParameters: () => of(Ok(plutusProtocolParameters)),
    getTip: () => of(Ok(ledgerTip)),
    getEraSummaries: () => of(Ok(eraSummaries)),
    getUtxosAtAddress: () =>
      of(
        overrides.scriptScanError
          ? Err(overrides.scriptScanError)
          : Ok(overrides.scriptUtxos ?? []),
      ),
    getRewardAccountInfo: () =>
      of(
        Ok(
          overrides.scriptRewardAccountInfo ?? {
            isRegistered: true,
            withdrawableAmount: BigNumber(0n),
          },
        ),
      ),
    // Prices every purpose the designation tx can carry, so the same budget
    // answers a register (mint), a deregister (mint + spend) and an update
    // (spend + withdrawal) without the fixture caring which is being built.
    evaluateTx: () => {
      const evaluation = overrides.evaluation ?? EVALUATED_EX_UNITS;
      if (evaluation === 'declined')
        return of(
          Err(
            new ProviderError(
              ProviderFailure.InvalidResponse,
              undefined,
              'EvaluationFailure',
            ),
          ),
        );
      return of(
        Ok(
          [
            Cardano.RedeemerPurpose.mint,
            Cardano.RedeemerPurpose.spend,
            Cardano.RedeemerPurpose.withdrawal,
          ].flatMap(purpose =>
            [0, 1, 2].map(index => ({ purpose, index, budget: evaluation })),
          ),
        ),
      );
    },
  },
  actions: { nightDesignationFlow: { buildCompleted } },
});

const run = async (
  state: Record<string, unknown>,
  overrides: Overrides = {},
): Promise<{
  payload: {
    result: {
      success: boolean;
      serializedTx?: string;
      fees?: { amount: unknown }[];
      error?: { name: string; message: string };
      errorTranslationKeys?: { title: string; subtitle: string };
    };
  };
}> => {
  buildCompleted.mockClear();
  const sideEffect = makeNightDesignationBuilding()(
    {} as never,
    {
      nightDesignationFlow: { selectState$: of(state) },
      activities: {
        selectPendingActivitiesByAccount$:
          pendingActivitiesByAccount$(overrides),
      },
    } as never,
    makeDependencies(overrides) as never,
  );
  return (await firstValueFrom(sideEffect)) as never;
};

// A macrotask turn drains the build's pending microtask chain; polling keeps the
// wait independent of how many awaits the build takes to reach the next step.
const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

// Drains every turn `waitFor` would poll, for asserting an emission does NOT
// arrive: a superseded build gets exactly the room a live one needs to emit.
const settle = async (): Promise<void> => waitFor(() => false);

/** The ex-units the built transaction actually declares for its redeemers. */
const declaredExUnits = (action: {
  payload: { result: { serializedTx?: string } };
}): Cardano.ExUnits[] =>
  (
    Serialization.Transaction.fromCbor(
      action.payload.result.serializedTx as Serialization.TxCBOR,
    )
      .witnessSet()
      .redeemers()
      ?.toCore() ?? []
  ).map(({ executionUnits }) => executionUnits);

const building = (extra: Record<string, unknown> = {}) => ({
  status: 'Building' as const,
  accountId,
  action: 'designate' as const,
  dustPubkeyHex,
  ...extra,
});

describe('makeNightDesignationBuilding', () => {
  it('builds the designation tx and reports the unsigned CBOR + fees via buildCompleted', async () => {
    const action = await run(building());

    expect(buildCompleted).toHaveBeenCalledTimes(1);
    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
    expect(action.payload.result.serializedTx?.length).toBeGreaterThan(0);
    expect(action.payload.result.fees?.length).toBe(1);
  });

  it('maps a missing chain id to the generic build-error keys', async () => {
    const action = await run(building(), { chainId: undefined });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  it('maps a missing Cardano address to the generic build-error keys', async () => {
    const action = await run(building(), { addresses: [] });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  it('fails fast (generic build-error keys) when dustPubkeyHex is not valid hex', async () => {
    // Malformed hex must not silently coerce to wrong bytes and build/sign an
    // unintended tx — `hexToBytes` throws, surfacing the generic build error.
    const action = await run(building({ dustPubkeyHex: 'zzzz' }));

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  it('refuses a non-canonical dustPubkeyHex reached by direct dispatch', async () => {
    // The sheet validates the target before dispatching, so only a headless
    // dispatch can hand a padded payload straight through to the datum.
    const action = await run(building({ dustPubkeyHex: 'ef'.repeat(32) }));

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
    // The generic title is shared with every other build throw, so pin the
    // reason too — otherwise an earlier precondition could reject this input
    // and the test would stay green having stopped covering canonicity.
    expect(action.payload.result.error?.message).toMatch(
      /canonical SCALE-compact/,
    );
  });

  it('maps an account with no cNIGHT to the no-cnight keys', async () => {
    const action = await run(building(), { accountUtxos: [adaUtxo] });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-cnight.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.no-cnight.subtitle',
    );
  });

  it('maps an account with cNIGHT but no ADA-only UTxO to the no-cardano-utxos keys', async () => {
    // Every spendable UTxO holds cNIGHT → no pure-ADA UTxO for fee/collateral.
    const action = await run(building(), { accountUtxos: cnightUtxos });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-cardano-utxos.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.no-cardano-utxos.subtitle',
    );
  });

  it('maps a deregister with no registration UTxO to the no-registration-utxo keys', async () => {
    const action = await run(
      building({ action: 'deregister', dustPubkeyHex: undefined }),
      { scriptUtxos: [] },
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-registration-utxo.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.no-registration-utxo.subtitle',
    );
  });

  it('builds an update tx, sourcing the script reward account balance', async () => {
    // resolveAction sources the withdrawable balance from the provider
    // (getRewardAccountInfo), so update takes no caller-supplied amount.
    const action = await run(building({ action: 'update' }), {
      scriptUtxos: [registrationUtxo],
      scriptRewardAccountInfo: {
        isRegistered: true,
        withdrawableAmount: BigNumber(1_500_000n),
      },
    });

    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
    expect(action.payload.result.serializedTx?.length).toBeGreaterThan(0);
  });

  it('maps a coin-selection balancing failure to the no-cardano-utxos keys', async () => {
    // The lone ADA UTxO is fully reserved for collateral, leaving only the
    // cNIGHT inputs' minimal ADA to fund the fee + script output + change — the
    // balancer's deterministic fallback selector gives up (InputSelectionError),
    // which must surface as the actionable "not enough ADA" copy, not generic.
    const lowAdaCnight: Cardano.Utxo = [
      {
        txId: 'bb'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: baseAddress,
      },
      {
        address: baseAddress,
        value: { coins: 1_300_000n, assets: new Map([[cnightAssetId, 50n]]) },
      },
    ];
    const collateralOnly: Cardano.Utxo = [
      {
        txId: '55'.repeat(32) as Cardano.TransactionId,
        index: 0,
        address: baseAddress,
      },
      { address: baseAddress, value: { coins: 6_000_000n } },
    ];
    const action = await run(building({ action: 'designate' }), {
      accountUtxos: [lowAdaCnight, collateralOnly],
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-cardano-utxos.title',
    );
  });

  it('builds a deregister tx from the registration found at the script address', async () => {
    const action = await run(
      building({ action: 'deregister', dustPubkeyHex: undefined }),
      { scriptUtxos: [registrationUtxo] },
    );

    expect(action.payload.result.success).toBe(true);
    const mint = Serialization.Transaction.fromCbor(
      action.payload.result.serializedTx as Serialization.TxCBOR,
    )
      .body()
      .mint();
    expect([...(mint?.values() ?? [])]).toEqual([-1n]);
  });

  it('maps an update with no dust pubkey to the generic build-error keys', async () => {
    const action = await run(
      building({ action: 'update', dustPubkeyHex: undefined }),
      { scriptUtxos: [registrationUtxo] },
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  it('maps an update against an unregistered script reward account to the script-stake-unregistered keys', async () => {
    const action = await run(building({ action: 'update' }), {
      scriptUtxos: [registrationUtxo],
      scriptRewardAccountInfo: {
        isRegistered: false,
        withdrawableAmount: BigNumber(0n),
      },
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.script-stake-unregistered.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.script-stake-unregistered.subtitle',
    );
  });

  it('builds an update tx when the script reward account is registered with nothing accrued', async () => {
    const action = await run(building({ action: 'update' }), {
      scriptUtxos: [registrationUtxo],
    });

    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
    expect(action.payload.result.serializedTx?.length).toBeGreaterThan(0);
  });

  it('withdraws the amount the chain reports rather than one supplied by the caller', async () => {
    const action = await run(building({ action: 'update' }), {
      scriptUtxos: [registrationUtxo],
      scriptRewardAccountInfo: {
        isRegistered: true,
        withdrawableAmount: BigNumber(1_500_000n),
      },
    });

    expect(action.payload.result.success).toBe(true);
    const withdrawals = Serialization.Transaction.fromCbor(
      action.payload.result.serializedTx as Serialization.TxCBOR,
    )
      .body()
      .withdrawals();
    expect([...(withdrawals?.values() ?? [])]).toEqual([1_500_000n]);
  });

  it('declares the ex-units the provider prices the redeemers at', async () => {
    const action = await run(building());

    expect(action.payload.result.success).toBe(true);
    // 10% over the priced figure: the build rewrites the fee after evaluation,
    // so what the node re-executes is not what it priced.
    expect(declaredExUnits(action)).toEqual([
      { memory: 550_000, steps: 176_000_000 },
    ]);
  });

  it('falls back to the bounded budget, and still builds, when evaluation is unavailable', async () => {
    const action = await run(building(), { evaluation: 'declined' });

    expect(action.payload.result.success).toBe(true);
    expect(declaredExUnits(action)).toEqual([BOUNDED_EX_UNITS_PER_REDEEMER]);
  });

  it('rejects a script-address decoy that matches the stake key but lacks the mapping NFT', async () => {
    const decoy: Cardano.Utxo = [
      {
        ...registrationUtxo[0],
        txId: '77'.repeat(32) as Cardano.TransactionId,
      },
      { ...registrationUtxo[1], value: { coins: 3_000_000n } },
    ];
    const action = await run(
      building({ action: 'deregister', dustPubkeyHex: undefined }),
      { scriptUtxos: [decoy] },
    );

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-registration-utxo.title',
    );
  });

  it('reports the build of the Building request that is current, not of one left in flight by an earlier reset', async () => {
    const stalePubkeyHex = '6f' + 'a1'.repeat(30) + '11';
    const currentPubkeyHex = '6f' + 'b2'.repeat(30) + '11';

    // One subject per provider round-trip, resolved by hand — so a build can be
    // held mid-flight while the flow leaves and re-enters `Building`.
    const pendingProtocolParameters: Subject<unknown>[] = [];
    const dependencies = makeDependencies({});
    const heldDependencies = {
      ...dependencies,
      cardanoProvider: {
        ...dependencies.cardanoProvider,
        getProtocolParameters: () => {
          const pending = new Subject<unknown>();
          pendingProtocolParameters.push(pending);
          return pending;
        },
      },
    };

    const state$ = new Subject<Record<string, unknown>>();
    const emitted: {
      payload: { result: { serializedTx?: string } };
    }[] = [];
    buildCompleted.mockClear();

    const subscription = makeNightDesignationBuilding()(
      {} as never,
      {
        nightDesignationFlow: { selectState$: state$ },
        activities: { selectPendingActivitiesByAccount$: of({}) },
      } as never,
      heldDependencies as never,
    ).subscribe(action => emitted.push(action as never));

    state$.next(building({ dustPubkeyHex: stalePubkeyHex }));
    await waitFor(() => pendingProtocolParameters.length === 1);

    // Sheet closed mid-build (reset → Idle), then reopened and re-submitted with
    // a different Midnight target.
    state$.next({ status: 'Idle' });
    state$.next(building({ dustPubkeyHex: currentPubkeyHex }));
    await waitFor(() => pendingProtocolParameters.length === 2);

    // Resolved one at a time, never in a single loop: the superseded build must
    // report NOTHING even after its own provider round-trip completes, which
    // only an assertion taken BETWEEN the two resolutions can prove.
    pendingProtocolParameters[0].next(Ok(plutusProtocolParameters));
    await settle();

    expect(emitted).toHaveLength(0);

    pendingProtocolParameters[1].next(Ok(plutusProtocolParameters));
    await waitFor(() => emitted.length > 0);
    subscription.unsubscribe();

    expect(emitted).toHaveLength(1);

    const { serializedTx } = emitted[0].payload.result;
    expect(serializedTx).toContain(currentPubkeyHex);
    expect(serializedTx).not.toContain(stalePubkeyHex);
  });

  it('refuses to designate an account that already has a registration', async () => {
    // Last gate before signing: a second designation would strand the first,
    // and a headless SDK caller never passes the sheet's detection gating.
    const action = await run(building(), { scriptUtxos: [registrationUtxo] });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toBe(
      'This account already has a cNIGHT designation',
    );
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.already-registered.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.already-registered.subtitle',
    );
  });

  it('refuses an already-registered designate even when the account cannot fund it', async () => {
    // The registration is permanent and the shortfall is not, so the scan has to
    // be consulted before the funding check — otherwise the user is told to add
    // ADA for a transaction that would be refused anyway.
    const action = await run(building(), {
      scriptUtxos: [registrationUtxo],
      accountUtxos: cnightUtxos,
    });

    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.already-registered.title',
    );
  });

  it('refuses a designate while a designate for this account is still confirming', async () => {
    const action = await run(building(), {
      pendingActivities: [pendingDesignation('designate')],
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toBe(
      'A cNIGHT designation for this account is still confirming',
    );
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.already-registered.title',
    );
    expect(action.payload.result.errorTranslationKeys?.subtitle).toBe(
      'v2.cnight-designation.build.error.already-registered.subtitle',
    );
  });

  it('refuses a designate while a pending designate is as old as the transaction TTL', async () => {
    const action = await run(building(), {
      pendingActivities: [
        pendingDesignation('designate', TTL_BUFFER_SLOTS * 1000),
      ],
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toBe(
      'A cNIGHT designation for this account is still confirming',
    );
  });

  it('builds a designate when the pending designate is older than the live window', async () => {
    const action = await run(building(), {
      pendingActivities: [
        pendingDesignation('designate', LIVE_PENDING_WINDOW_MS + 1),
      ],
    });

    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
  });

  it('builds a designate when the pending row is a deregister or an update', async () => {
    const afterDeregister = await run(building(), {
      pendingActivities: [pendingDesignation('deregister')],
    });
    const afterUpdate = await run(building(), {
      pendingActivities: [pendingDesignation('update')],
    });

    expect(afterDeregister.payload.result.success).toBe(true);
    expect(afterUpdate.payload.result.success).toBe(true);
  });

  it('refuses a designate when the pending-activities stream emits a tick late', async () => {
    const pendingByAccount$ = new Subject<unknown>();
    setTimeout(() => {
      pendingByAccount$.next({
        [accountId]: [pendingDesignation('designate')],
      });
    }, 0);

    const action = await run(building(), {
      pendingActivitiesByAccount$: pendingByAccount$,
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.error?.message).toBe(
      'A cNIGHT designation for this account is still confirming',
    );
  });

  it('builds a designate when the pending designate belongs to another account', async () => {
    const action = await run(building(), {
      pendingActivitiesByAccount$: of({
        ['acct-other' as AccountId]: [pendingDesignation('designate')],
      }),
    });

    expect(action.payload.result.success).toBe(true);
  });

  it('still reports a buildCompleted when the pending-activities stream never emits', async () => {
    const action = await run(building(), {
      pendingActivitiesByAccount$: new Subject<unknown>(),
    });

    expect(buildCompleted).toHaveBeenCalledTimes(1);
    expect(action.payload.result.success).toBe(true);
  });

  it('maps a failed registration scan during designate to the generic build error', async () => {
    // Nothing may be submitted on an unknown registration state, so the scan
    // failure must reach the outer catch rather than read as "not designated".
    const action = await run(building(), {
      scriptScanError: Object.assign(new Error('script scan rejected'), {
        reason: ProviderFailure.BadRequest,
      }),
    });

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  // =================================================================
  // The designation page resets the flow when it unmounts, so account A's
  // build is still in flight when account B's page requests its own — and
  // A's CBOR spends A's UTxOs, not B's.
  // =================================================================
  it('reports the re-requested build, not the stale one it superseded', async () => {
    buildCompleted.mockClear();

    const otherAccountId = 'acct-2' as AccountId;
    const state$ = new Subject<Record<string, unknown>>();
    // One gate per build, so the stale build can be released FIRST and still
    // must not reach `buildCompleted`.
    const chainIdGates: Subject<Cardano.ChainId>[] = [];
    const dispatched: {
      payload: {
        accountId: string;
        result: {
          success: boolean;
          errorTranslationKeys?: { title: string };
        };
      };
    }[] = [];

    const dependencies = makeDependencies({
      addresses: [
        cardanoAddress,
        { ...cardanoAddress, accountId: otherAccountId },
      ],
    });
    const sideEffect = makeNightDesignationBuilding()(
      {} as never,
      {
        nightDesignationFlow: { selectState$: state$ },
        activities: { selectPendingActivitiesByAccount$: of({}) },
      } as never,
      {
        ...dependencies,
        txExecutorCardano: {
          ...dependencies.txExecutorCardano,
          cardanoChainId$: defer(() => {
            const gate = new Subject<Cardano.ChainId>();
            chainIdGates.push(gate);
            return gate;
          }),
        },
      } as never,
    );
    const subscription = sideEffect.subscribe(action =>
      dispatched.push(action as never),
    );

    state$.next(building());
    state$.next({ status: 'Idle' });
    // The second account holds no UTxOs, so its own build fails distinguishably
    // where the first would have succeeded.
    state$.next(building({ accountId: otherAccountId }));
    for (const gate of chainIdGates) gate.next(chainId);
    await settle();
    subscription.unsubscribe();

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.payload.accountId).toBe(otherAccountId);
    expect(dispatched[0]?.payload.result.success).toBe(false);
    expect(dispatched[0]?.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.no-cardano-utxos.title',
    );
  });

  it('reports the account the build was made for', async () => {
    await run(building());

    expect(buildCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ accountId }),
    );
  });
});
