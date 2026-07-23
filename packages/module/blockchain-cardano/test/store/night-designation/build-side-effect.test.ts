import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { mockProviders } from '@cardano-sdk/util-dev';
import {
  CardanoDustNetwork,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  dustMappingDatumToCbor,
  getCnightAssetId,
  getDustGeneratorPaymentAddress,
  getDustMappingNftAssetId,
} from '@lace-lib/cnight-dust-designation';
import { Ok } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeNightDesignationBuilding } from '../../../src/store/night-designation/build-side-effect';

import type { AccountId } from '@lace-contract/wallet-repo';

// =====================================================================
// The build side-effect orchestrates IO + dispatch; the blueprint →
// TransactionBuilder mapping itself is golden-tested in
// build-night-designation-tx.test.ts. Here we assert the side-effect's
// OWN behaviour: it gathers account context + network data through the
// injected observables/provider, resolves the registration UTxO for
// update/deregister, runs the build, and reports the unsigned tx (or a
// typed failure mapped to the build-specific i18n keys) via
// `buildCompleted`.
//
// Re-entrancy is guaranteed upstream, not asserted here: `firstStateOfStatus`
// applies `distinctUntilChanged` on `status`, so consecutive `Building`
// states collapse to one trigger; `exhaustMap` only drops a Building that
// re-enters (Building → other → Building) while a build is still in flight.
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
const dustPubkeyHex = 'ef'.repeat(32);

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
};

const buildCompleted = vi.fn((payload: unknown) => ({
  type: 'nightDesignationFlow/buildCompleted',
  payload,
}));

const makeDependencies = (overrides: Overrides) => ({
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
      of(Ok(overrides.scriptUtxos ?? [registrationUtxo])),
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
      errorTranslationKeys?: { title: string; subtitle: string };
    };
  };
}> => {
  buildCompleted.mockClear();
  const sideEffect = makeNightDesignationBuilding()(
    {} as never,
    { nightDesignationFlow: { selectState$: of(state) } } as never,
    makeDependencies(overrides) as never,
  );
  return (await firstValueFrom(sideEffect)) as never;
};

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

  it('maps an update with a missing withdrawable amount to the generic build-error keys', async () => {
    // The withdrawable amount is required for update — a missing field means the
    // caller never computed it, so fail fast rather than silently withdrawing 0
    // and stranding the accrued script rewards.
    const action = await run(building({ action: 'update' }));

    expect(action.payload.result.success).toBe(false);
    expect(action.payload.result.errorTranslationKeys?.title).toBe(
      'v2.cnight-designation.build.error.title',
    );
  });

  it('builds an update tx when the withdrawable amount is an explicit zero', async () => {
    // `'0'` is legitimate (nothing accrued) and must NOT trip the fail-fast guard.
    const action = await run(
      building({ action: 'update', scriptWithdrawableLovelace: '0' }),
    );

    expect(action.payload.result.success).toBe(true);
    expect(typeof action.payload.result.serializedTx).toBe('string');
    expect(action.payload.result.serializedTx?.length).toBeGreaterThan(0);
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
});
