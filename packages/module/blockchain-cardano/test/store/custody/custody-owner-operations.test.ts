import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import {
  custodyGrantAssetId,
  decodeCustodyAccountState,
  decodeCustodyGrant,
  encodeCustodyAccountRedeemer,
  encodeCustodyMintRedeemer,
} from '@lace-lib/cardano-custody';
import { Err } from '@lace-lib/util';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  changeReserveAt,
  controlLovelaceFor,
  leastFeeOf,
  preEvaluationFeeBound,
} from '../../../src/store/custody/custody-assembly';
import { custodyExecutionEstimate } from '../../../src/store/custody/custody-execution-estimate';

import {
  EXPIRY_MS,
  RUN_REDEEMER_CBOR,
  TESTNET_BYRON_ADDRESS,
  accountId,
  accountState,
  chainId,
  collateralFunding,
  collateralUtxo,
  controlUtxo,
  currentLogic,
  custodyAccount,
  datumCborOf,
  deviceKeyHash,
  evaluateAll,
  expectFailure,
  expectSuccess,
  fakeProvider,
  fundUtxo,
  grantUtxo,
  granteeKeyHash,
  identity,
  keyHash,
  logicRewardAccountOf,
  lovelaceGrant,
  otherDeviceKeyHash,
  otherGranteeKeyHash,
  otherRecipientAddress,
  parkedScriptUtxos,
  protocolParameters,
  providerError,
  recipientAddress,
  runBuild,
  sponsorAddress,
  transactionOf,
  unparkedChainId,
  version,
} from './fixtures';

import type { ChainFixture, StoreFixture } from './fixtures';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  CardanoCustodyGrantScopeRequest,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountState,
  CustodyGrant,
} from '@lace-lib/cardano-custody';

const TOKEN = Cardano.AssetId(`${'99'.repeat(28)}746f6b656e`);
const RESERVE_TARGET = 2_100_000n;
/** The growth margin the control output keeps when it pays a fee. */
const GROWTH_MARGIN = 32n * BigInt(protocolParameters.coinsPerUtxoByte);
/** The most a revoke grows the control datum: a revoked slot and a counter's width. */
const REVOKE_GROWTH = 8n * BigInt(protocolParameters.coinsPerUtxoByte);
/** The least lovelace a plain change output at the account holds. */
const CHANGE_MINIMUM = changeReserveAt(
  identity.address,
  protocolParameters.coinsPerUtxoByte,
);

/** What `units` of execution cost at the test parameters' prices. */
const executionFeeOf = ({ memory, steps }: Cardano.ExUnits) =>
  BigInt(
    Math.ceil(
      protocolParameters.prices.memory * memory +
        protocolParameters.prices.steps * steps,
    ),
  );

const operationRequest = (
  operation: CardanoCustodyAccountOperation,
): CardanoCustodyBuildRequest => ({
  requestId: `op-${operation.type}`,
  accountId,
  operation,
  funding: collateralFunding(),
});

interface Scenario {
  readonly state?: CustodyAccountState;
  readonly control?: Cardano.Utxo;
  readonly funds?: Cardano.Utxo[];
  readonly grants?: Cardano.Utxo[];
  readonly chain?: ChainFixture;
  readonly store?: StoreFixture;
  /** The network the account lives on; Preprod, where the scripts are parked, by default. */
  readonly network?: Cardano.ChainId;
}

/** An account whose store and chain agree on one live control UTxO, its funds and grants. */
const scenario = ({
  state = accountState(),
  control = controlUtxo(state),
  funds = [fundUtxo(1, 20_000_000n)],
  grants = [],
  chain,
  store,
  network,
}: Scenario = {}) => {
  const utxos = [control, ...funds, ...grants];
  const fake = fakeProvider({
    utxosAt: address => (address === identity.address ? utxos : []),
    ...chain,
  });
  return {
    ...fake,
    run: async (operation: CardanoCustodyAccountOperation) =>
      runBuild(operationRequest(operation), {
        provider: fake.provider,
        store: {
          settledUtxos: utxos,
          ...(network && {
            chainId: network,
            account: custodyAccount(undefined, network),
          }),
          ...store,
        },
      }),
  };
};

const grantScope = (
  overrides: Partial<CardanoCustodyGrantScopeRequest> = {},
): CardanoCustodyGrantScopeRequest => ({
  grantee: HexBlob(granteeKeyHash),
  asset: { policyId: HexBlob(''), assetName: HexBlob('') },
  perCallCap: 10_000_000n,
  cap: 15_000_000n,
  lovelacePerCallCap: 0n,
  lovelaceCap: 0n,
  expiresAt: EXPIRY_MS,
  recipients: [recipientAddress],
  ...overrides,
});

/** An account holding one current grant in slot 0. */
const withGrant = (grant: CustodyGrant = lovelaceGrant()) => ({
  state: accountState({
    nextSlot: grant.slot + 1n,
    outstanding: 1n,
  }),
  grants: [grantUtxo(grant)],
});

const bodyOf = (result: CardanoCustodyBuildResult) =>
  transactionOf(result).body().toCore();

const controlOf = (result: CardanoCustodyBuildResult) => {
  const control = bodyOf(result).outputs.find(output =>
    output.value.assets?.has(identity.stateNftAssetId),
  )!;
  const decoded = decodeCustodyAccountState(control.datum!);
  if (!decoded.ok) throw new Error('control datum');
  return { control, state: decoded.value };
};

const grantTokenOf = (slot: bigint) =>
  custodyGrantAssetId(
    {
      accountValidatorHash: version.accountValidatorHash,
      stakeScriptHash: identity.stakeScriptHash,
    },
    slot,
  );

const grantOutputsOf = (result: CardanoCustodyBuildResult) =>
  bodyOf(result).outputs.flatMap(output => {
    if (output.datum === undefined) return [];
    const decoded = decodeCustodyGrant(output.datum);
    return decoded.ok ? [{ output, grant: decoded.value }] : [];
  });

const changeOf = (result: CardanoCustodyBuildResult) =>
  bodyOf(result).outputs.filter(
    output => output.address === identity.address && !output.datum,
  );

const redeemersOf = (result: CardanoCustodyBuildResult) =>
  (transactionOf(result).witnessSet().redeemers()?.toCore() ?? []).map(
    ({ purpose, data }) => ({
      purpose,
      data: Serialization.PlutusData.fromCore(data).toCbor(),
    }),
  );

const cborOf = (data: Cardano.PlutusData) =>
  Serialization.PlutusData.fromCore(data).toCbor();

/**
 * What upstream's devnet run with Preprod's parameters measured for a
 * revoke over the largest state (docs/devnet-evidence.md, step 31): the
 * logic run, the Device spend and each further spend.
 */
const evaluateLikeDevnet = (tx: Serialization.Transaction) =>
  (tx.witnessSet().redeemers()?.toCore() ?? []).map(
    ({ purpose, index, data }) => ({
      purpose,
      index,
      budget:
        purpose === Cardano.RedeemerPurpose.withdrawal &&
        cborOf(data) === RUN_REDEEMER_CBOR
          ? { memory: 1_133_999, steps: 356_873_719 }
          : purpose === Cardano.RedeemerPurpose.spend
          ? { memory: 358_814, steps: 121_081_737 }
          : { memory: 170_882, steps: 52_835_912 },
    }),
  );

/** The least lovelace a control output carrying `state` holds. */
const minimumOf = (state: CustodyAccountState) =>
  controlLovelaceFor(
    { identity, state, floor: 0n },
    protocolParameters.coinsPerUtxoByte,
  );

/** A reserve in the format Lace reads as its own: inline `d87980`, no reference script. */
const reserveUtxo = (seed: number, coins: bigint) =>
  fundUtxo(seed, coins, {
    datum: Serialization.PlutusData.fromCbor(HexBlob('d87980')).toCore(),
  });

/** A parameter set whose execution limit the evaluated budgets exceed. */
const tinyExecutionLimit = {
  ...protocolParameters,
  maxExecutionUnitsPerTransaction: { memory: 1, steps: 1 },
} as Cardano.ProtocolParameters;

const unspendableCustodyAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.ScriptHash,
    hash: version.accountValidatorHash,
  },
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16('ee'.repeat(28)),
  },
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

/** POSIX milliseconds a grant expired at, well before the build. */
const PAST_MS = BigInt(Date.now() - 600_000);

describe('custody owner operations', () => {
  describe('issue', () => {
    it('issues a grant in the next slot, paid from plain funds', async () => {
      const state = accountState({ nextSlot: 4n, outstanding: 2n });
      const { run } = scenario({ state });
      const result = expectSuccess(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      const body = bodyOf(result);

      expect(controlOf(result).state).toEqual({
        ...state,
        nextSlot: 5n,
        outstanding: 3n,
      });
      const [issued] = grantOutputsOf(result);
      expect(grantOutputsOf(result)).toHaveLength(1);
      expect(issued.grant).toMatchObject({
        slot: 4n,
        grantee: granteeKeyHash,
        generation: 0n,
        scope: { perCallCap: 10_000_000n, cap: 15_000_000n },
      });
      expect(issued.output.address).toBe(identity.address);
      expect(issued.output.scriptReference).toBeUndefined();
      expect([...issued.output.value.assets!]).toEqual([
        [grantTokenOf(4n), 1n],
      ]);
      expect(body.mint).toEqual(new Map([[grantTokenOf(4n), 1n]]));
      expect(redeemersOf(result)).toEqual(
        expect.arrayContaining([
          {
            purpose: Cardano.RedeemerPurpose.mint,
            data: cborOf(encodeCustodyMintRedeemer({ kind: 'issueGrants' })),
          },
        ]),
      );
      expect(body.requiredExtraSignatures).toEqual([deviceKeyHash]);
      expect(body.collaterals).toEqual([
        { txId: collateralUtxo[0].txId, index: collateralUtxo[0].index },
      ]);
      expect(body.collateralReturn?.address).toBe(sponsorAddress);
      expect(changeOf(result)).toHaveLength(1);
    });

    it('tops the control headroom up to the owner fee reserve target from the change', async () => {
      const state = accountState();
      const minimum = minimumOf(state);
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: minimum }),
      });
      const result = expectSuccess(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      const { control, state: next } = controlOf(result);
      expect(control.value.coins).toBe(minimumOf(next) + RESERVE_TARGET);
      const [change] = changeOf(result);
      const [issued] = grantOutputsOf(result);
      expect(change.value.coins).toBe(
        20_000_000n +
          minimum -
          control.value.coins -
          issued.output.value.coins -
          bodyOf(result).fee,
      );
    });

    it('keeps a control output already above the reserve target', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 10_000_000n }),
      });
      const result = expectSuccess(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      expect(controlOf(result).control.value.coins).toBe(10_000_000n);
    });

    it('moves a change too small to stand alone into the control output', async () => {
      const state = accountState();
      const minimum = minimumOf(state);
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: minimum }),
        funds: [fundUtxo(1, 4_600_000n)],
      });
      const result = expectSuccess(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      const body = bodyOf(result);
      const [issued] = grantOutputsOf(result);
      expect(changeOf(result)).toEqual([]);
      expect(controlOf(result).control.value.coins).toBe(
        minimum + 4_600_000n - issued.output.value.coins - body.fee,
      );
      expect(controlOf(result).control.value.coins).toBeGreaterThan(
        minimum + RESERVE_TARGET,
      );
    });

    it('refuses an issue whose change cannot top the owner fee reserve up', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: minimumOf(state) }),
        // The change keeps the token, so it cannot join the control output.
        funds: [
          fundUtxo(1, 4_500_000n, {
            value: { coins: 4_500_000n, assets: new Map([[TOKEN, 1n]]) },
          }),
        ],
      });
      const failure = expectFailure(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      expect(failure).toMatchObject({
        code: 'owner-reserve-required',
        target: RESERVE_TARGET,
      });
      expect(
        failure.code === 'owner-reserve-required' && failure.shortfall,
      ).toBeGreaterThan(0n);
    });

    it('refuses an issue whose plain change, after the fee, falls short of the top-up', async () => {
      const state = accountState();
      const next = accountState({ nextSlot: 1n, outstanding: 1n });
      const control = controlUtxo(state, { coins: minimumOf(state) });
      const probed = expectSuccess(
        await scenario({ state, control }).run({
          type: 'issue-grant',
          scope: grantScope(),
        }),
      );
      const [issued] = grantOutputsOf(probed);
      // The change balances at the fee estimate but holds 0.2 ADA less than
      // the top-up once the real fee is known.
      const { run } = scenario({
        state,
        control,
        funds: [
          fundUtxo(
            1,
            issued.output.value.coins +
              probed.fee +
              (minimumOf(next) - minimumOf(state)) +
              RESERVE_TARGET -
              200_000n,
          ),
        ],
      });
      expect(
        expectFailure(await run({ type: 'issue-grant', scope: grantScope() })),
      ).toEqual({
        code: 'owner-reserve-required',
        target: RESERVE_TARGET,
        shortfall: 200_000n,
      });
    });

    it('refuses an issue the plain funds cannot pay, whatever the control headroom', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 50_000_000n }),
        funds: [],
      });
      expect(
        expectFailure(await run({ type: 'issue-grant', scope: grantScope() })),
      ).toMatchObject({ code: 'insufficient-funds' });
    });

    it('refuses a second current grant to an agent key, before any evaluation', async () => {
      const { run, provider } = scenario(withGrant(lovelaceGrant({}, 0n)));
      expect(
        expectFailure(await run({ type: 'issue-grant', scope: grantScope() })),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'state-transition',
        error: {
          code: 'grantee-has-grant',
          grantee: granteeKeyHash,
          slot: 0n,
        },
      });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('issues to an agent key whose grant is revoked', async () => {
      const { run } = scenario({
        state: accountState({ nextSlot: 1n, outstanding: 1n, revoked: [0n] }),
        grants: [grantUtxo(lovelaceGrant())],
      });
      const result = expectSuccess(
        await run({ type: 'issue-grant', scope: grantScope() }),
      );
      expect(grantOutputsOf(result)[0].grant.slot).toBe(1n);
    });

    it('refuses a grant to a listed device', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: grantScope({ grantee: HexBlob(deviceKeyHash) }),
          }),
        ),
      ).toMatchObject({
        code: 'invalid-operation',
        reason: 'state-transition',
        error: { code: 'grantee-is-device' },
      });
    });

    it('refuses a lovelace grant with lovelace caps', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: grantScope({ lovelaceCap: 1n }),
          }),
        ),
      ).toMatchObject({
        code: 'invalid-operation',
        reason: 'state-transition',
        error: {
          code: 'invalid-grant',
          violations: [{ code: 'lovelace-grant-lovelace-caps' }],
        },
      });
    });

    it('refuses caps that cannot pay the smallest spend', async () => {
      const { run, provider } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: grantScope({ perCallCap: 2_000_000n }),
          }),
        ),
      ).toMatchObject({ code: 'invalid-operation', reason: 'grant-scope' });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('refuses an issue while sixteen grants are outstanding', async () => {
      const { run } = scenario({
        state: accountState({ nextSlot: 16n, outstanding: 16n }),
      });
      expect(
        expectFailure(await run({ type: 'issue-grant', scope: grantScope() })),
      ).toEqual({ code: 'grant-limit', limit: 16 });
    });

    it('refuses a scope the signer would refuse as malformed', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: grantScope({ grantee: HexBlob('ab') }),
          }),
        ),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'grant-scope',
        message: 'grantee: expected 28 bytes of lower-case hex',
      });
    });

    it('refuses a scope that is not one', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: { ...grantScope(), cap: undefined } as never,
          }),
        ),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'grant-scope',
        message: 'scope: not a grant scope',
      });
    });

    it('refuses a recipient on another network', async () => {
      const mainnetRecipient = Cardano.BaseAddress.fromCredentials(
        Cardano.NetworkId.Mainnet,
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Crypto.Hash28ByteBase16('e1'.repeat(28)),
        },
        {
          type: Cardano.CredentialType.KeyHash,
          hash: Crypto.Hash28ByteBase16('e2'.repeat(28)),
        },
      )
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'issue-grant',
            scope: grantScope({ recipients: [mainnetRecipient] }),
          }),
        ),
      ).toMatchObject({ code: 'invalid-operation', reason: 'grant-scope' });
    });
  });

  describe('replace, revoke and revoke all', () => {
    it('replaces a grant: revokes its slot and issues the scope in the next slot', async () => {
      const { run } = scenario(withGrant());
      const result = expectSuccess(
        await run({
          type: 'replace-grant',
          slot: 0n,
          scope: grantScope({ cap: 99_000_000n, recipients: [] }),
        }),
      );
      expect(controlOf(result).state).toEqual(
        accountState({ nextSlot: 2n, outstanding: 2n, revoked: [0n] }),
      );
      const [issued] = grantOutputsOf(result);
      expect(issued.grant).toMatchObject({
        slot: 1n,
        grantee: granteeKeyHash,
        scope: { cap: 99_000_000n },
      });
      expect(bodyOf(result).mint).toEqual(new Map([[grantTokenOf(1n), 1n]]));
      expect(
        bodyOf(result).inputs.some(
          ({ txId }) => txId === grantUtxo(lovelaceGrant())[0].txId,
        ),
      ).toBe(false);
    });

    it('refuses to replace a grant that does not exist', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({ type: 'replace-grant', slot: 3n, scope: grantScope() }),
        ),
      ).toMatchObject({ error: { code: 'grant-not-found', slot: 3n } });
    });

    it('revokes a grant by listing its slot, leaving its UTxO', async () => {
      const { run } = scenario(withGrant());
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      expect(controlOf(result).state).toEqual(
        accountState({ nextSlot: 1n, outstanding: 1n, revoked: [0n] }),
      );
      expect(bodyOf(result).mint).toBeUndefined();
      expect(grantOutputsOf(result)).toEqual([]);
    });

    it('refuses to revoke a grant that is not current', async () => {
      const { run } = scenario({
        state: accountState({ nextSlot: 1n, outstanding: 1n, revoked: [0n] }),
        grants: [grantUtxo(lovelaceGrant())],
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 0n })),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'state-transition',
        error: { code: 'grant-not-current', slot: 0n, liveness: 'revoked' },
      });
    });

    it('refuses to revoke into a full revoked list', async () => {
      const revoked = Array.from({ length: 32 }, (_, slot) => BigInt(slot));
      const { run } = scenario({
        state: accountState({ nextSlot: 33n, outstanding: 1n, revoked }),
        grants: [grantUtxo(lovelaceGrant({}, 32n))],
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 32n })),
      ).toEqual({ code: 'revoked-list-full', limit: 32 });
    });

    it('revokes every grant: the generation moves on and the revoked list clears', async () => {
      const { run } = scenario({
        state: accountState({ nextSlot: 2n, outstanding: 2n, revoked: [1n] }),
      });
      const result = expectSuccess(await run({ type: 'revoke-all-grants' }));
      expect(datumCborOf(controlOf(result).state)).toBe(
        datumCborOf(
          accountState({ grantGeneration: 1n, nextSlot: 2n, outstanding: 2n }),
        ),
      );
    });
  });

  describe('sweep', () => {
    const revokedGrant = lovelaceGrant({}, 0n);
    const revokedState = accountState({
      nextSlot: 2n,
      outstanding: 2n,
      revoked: [0n, 1n],
    });

    it('sweeps a revoked grant: burns its token, frees its lovelace into the control output and prunes its slot', async () => {
      const grant = grantUtxo(revokedGrant, { coins: 1_800_000n });
      const { run } = scenario({ state: revokedState, grants: [grant] });
      const result = expectSuccess(
        await run({ type: 'sweep-grants', slots: [0n] }),
      );
      const body = bodyOf(result);
      expect(controlOf(result).state).toEqual(
        accountState({ nextSlot: 2n, outstanding: 1n, revoked: [1n] }),
      );
      expect(controlOf(result).control.value.coins).toBe(
        2_000_000n + 1_800_000n,
      );
      expect(body.mint).toEqual(new Map([[grantTokenOf(0n), -1n]]));
      expect(body.inputs).toEqual(
        expect.arrayContaining([{ txId: grant[0].txId, index: 0 }]),
      );
      expect(redeemersOf(result)).toEqual(
        expect.arrayContaining([
          {
            purpose: Cardano.RedeemerPurpose.spend,
            data: cborOf(encodeCustodyAccountRedeemer({ kind: 'sweepGrant' })),
          },
          {
            purpose: Cardano.RedeemerPurpose.mint,
            data: cborOf(encodeCustodyMintRedeemer({ kind: 'burnGrants' })),
          },
        ]),
      );
      expect(body.validityInterval?.invalidBefore).toBeUndefined();
      expect(result.resolvedInputs).toEqual(expect.arrayContaining([grant]));
    });

    it('starts the validity of a sweep of an expired grant after its expiry', async () => {
      const expired = lovelaceGrant({ expiresAt: PAST_MS }, 0n);
      const { run } = scenario({
        state: accountState({ nextSlot: 1n, outstanding: 1n }),
        grants: [grantUtxo(expired)],
      });
      const result = expectSuccess(
        await run({ type: 'sweep-grants', slots: [0n] }),
      );
      // One-second slots from the POSIX epoch: the slot after the expiry's.
      expect(bodyOf(result).validityInterval?.invalidBefore).toBe(
        Math.floor(Number(PAST_MS) / 1000) + 1,
      );
      expect(controlOf(result).state.outstanding).toBe(0n);
    });

    it('sweeps grants a revoke-all superseded', async () => {
      const { run } = scenario({
        state: accountState({
          grantGeneration: 1n,
          nextSlot: 2n,
          outstanding: 2n,
        }),
        grants: [
          grantUtxo(lovelaceGrant({}, 0n)),
          grantUtxo(lovelaceGrant({}, 1n, { grantee: otherGranteeKeyHash })),
        ],
      });
      const result = expectSuccess(
        await run({ type: 'sweep-grants', slots: [1n, 0n] }),
      );
      expect(controlOf(result).state.outstanding).toBe(0n);
      expect(bodyOf(result).mint).toEqual(
        new Map([
          [grantTokenOf(0n), -1n],
          [grantTokenOf(1n), -1n],
        ]),
      );
    });

    it('pays a sweep from the freed lovelace when the account has no funds', async () => {
      const { run } = scenario({
        state: revokedState,
        grants: [grantUtxo(revokedGrant, { coins: 1_800_000n })],
        funds: [],
      });
      const result = expectSuccess(
        await run({ type: 'sweep-grants', slots: [0n] }),
      );
      const body = bodyOf(result);
      expect(body.outputs).toHaveLength(1);
      expect(controlOf(result).control.value.coins).toBe(
        2_000_000n + 1_800_000n - body.fee,
      );
    });

    it('refuses to sweep a current grant', async () => {
      const { run } = scenario(withGrant());
      expect(
        expectFailure(await run({ type: 'sweep-grants', slots: [0n] })),
      ).toEqual({ code: 'sweep-not-dead', slot: 0n, liveness: 'current' });
    });

    it('refuses to sweep a slot without a grant UTxO', async () => {
      const { run } = scenario({ state: revokedState });
      expect(
        expectFailure(await run({ type: 'sweep-grants', slots: [0n] })),
      ).toMatchObject({ error: { code: 'grant-not-found', slot: 0n } });
    });

    it('refuses an empty sweep and one above the batch limit', async () => {
      const { run } = scenario({ state: revokedState });
      expect(
        expectFailure(await run({ type: 'sweep-grants', slots: [] })),
      ).toMatchObject({ error: { code: 'sweep-empty' } });
      const slots = Array.from({ length: 9 }, (_, slot) => BigInt(slot));
      const many = scenario({
        state: accountState({
          nextSlot: 9n,
          outstanding: 9n,
          revoked: slots,
        }),
        grants: slots.map(slot =>
          grantUtxo(
            lovelaceGrant({}, slot, {
              grantee: (0x10 + Number(slot)).toString(16).repeat(28),
            }),
          ),
        ),
      });
      expect(
        expectFailure(await many.run({ type: 'sweep-grants', slots })),
      ).toMatchObject({ error: { code: 'sweep-batch-limit', limit: 8 } });
    });

    it('refuses to sweep a grant UTxO an unsettled transaction spends', async () => {
      const grant = grantUtxo(revokedGrant);
      const control = controlUtxo(revokedState);
      const funds = [fundUtxo(1, 20_000_000n)];
      const { run } = scenario({
        state: revokedState,
        grants: [grant],
        store: {
          settledUtxos: [control, grant, ...funds],
          inFlightUtxos: [control, ...funds],
        },
      });
      expect(
        expectFailure(await run({ type: 'sweep-grants', slots: [0n] })),
      ).toEqual({ code: 'operation-in-progress' });
    });
  });

  describe('devices', () => {
    it('adds a device', async () => {
      const { run } = scenario();
      const result = expectSuccess(
        await run({ type: 'add-device', keyHash: otherDeviceKeyHash }),
      );
      expect(controlOf(result).state.devices).toEqual([
        deviceKeyHash,
        otherDeviceKeyHash,
      ]);
    });

    it('refuses a device that is already listed', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({ type: 'add-device', keyHash: deviceKeyHash }),
        ),
      ).toMatchObject({ error: { code: 'device-already-listed' } });
    });

    it('refuses a device that holds a current grant', async () => {
      const { run } = scenario(withGrant());
      expect(
        expectFailure(
          await run({
            type: 'add-device',
            keyHash: granteeKeyHash,
          }),
        ),
      ).toMatchObject({
        error: { code: 'device-is-grantee', slots: [0n] },
      });
    });

    it('removes a device', async () => {
      const { run } = scenario({
        state: accountState({
          devices: [HexBlob(deviceKeyHash), HexBlob(otherDeviceKeyHash)],
        }),
      });
      const result = expectSuccess(
        await run({ type: 'remove-device', keyHash: otherDeviceKeyHash }),
      );
      expect(controlOf(result).state.devices).toEqual([deviceKeyHash]);
    });

    it('refuses to remove the last device', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({ type: 'remove-device', keyHash: deviceKeyHash }),
        ),
      ).toMatchObject({ error: { code: 'last-device' } });
    });

    it('raises the control lovelace to the minimum a larger state needs', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 1_000_000n }),
      });
      const result = expectSuccess(
        await run({ type: 'add-device', keyHash: otherDeviceKeyHash }),
      );
      const { control, state: next } = controlOf(result);
      expect(control.value.coins).toBe(minimumOf(next));
    });
  });

  describe('fee payers', () => {
    it('pays a revoke from plain funds when they can', async () => {
      const { state, grants } = withGrant();
      const { run } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [fundUtxo(1, 4_000_000n)],
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      expect(controlOf(result).control.value.coins).toBe(3_000_000n);
      expect(changeOf(result)[0].value.coins).toBe(
        4_000_000n - bodyOf(result).fee,
      );
    });

    it('pays a revoke from the control headroom when the account has no funds', async () => {
      const { state, grants } = withGrant();
      const { run } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [],
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      const body = bodyOf(result);
      const { control, state: next } = controlOf(result);
      expect(body.inputs).toHaveLength(1);
      expect(body.outputs).toHaveLength(1);
      expect(control.value.coins).toBe(3_000_000n - body.fee);
      expect(control.value.coins).toBeGreaterThanOrEqual(
        minimumOf(next) + GROWTH_MARGIN,
      );
      expect(result.fee).toBe(body.fee);
    });

    it('pays from the control headroom when the plain funds are too small to pay', async () => {
      const { state, grants } = withGrant();
      const dust = fundUtxo(1, 1_000_000n);
      const { run } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [dust],
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      expect(bodyOf(result).inputs).toHaveLength(1);
      expect(controlOf(result).control.value.coins).toBe(
        3_000_000n - bodyOf(result).fee,
      );
    });

    it('never spends a fund carrying a reference script, paying a revoke from the control headroom instead', async () => {
      const { state, grants } = withGrant();
      // The account validator the revoke attaches: spending this UTxO too
      // would provide the script twice, which the ledger refuses.
      const withScript = fundUtxo(2, 50_000_000n, {
        scriptReference: identity.contractVersion.accountValidator,
      });
      const { run } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [withScript, fundUtxo(1, 1_000_000n)],
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      const body = bodyOf(result);
      expect(body.inputs).toHaveLength(1);
      expect(body.inputs).not.toContainEqual(withScript[0]);
      expect(controlOf(result).control.value.coins).toBe(3_000_000n - body.fee);
    });

    it('pays an owner spend from safe funds despite a larger reference-script deposit', async () => {
      const withScript = fundUtxo(2, 50_000_000n, {
        scriptReference: identity.contractVersion.accountValidator,
      });
      const safe = fundUtxo(1, 20_000_000n);
      const { run } = scenario({ funds: [withScript, safe] });
      const result = expectSuccess(
        await run({
          type: 'owner-spend',
          outputs: [
            { address: recipientAddress, value: { coins: 2_000_000n } },
          ],
        }),
      );
      expect(bodyOf(result).inputs).toContainEqual({
        txId: safe[0].txId,
        index: safe[0].index,
      });
      expect(
        bodyOf(result).inputs.some(
          input =>
            input.txId === withScript[0].txId &&
            input.index === withScript[0].index,
        ),
      ).toBe(false);
      expect(
        result.resolvedInputs.some(
          ([input]) =>
            input.txId === withScript[0].txId &&
            input.index === withScript[0].index,
        ),
      ).toBe(false);
    });

    it('refuses an owner spend only a fund carrying a reference script could pay', async () => {
      const { run } = scenario({
        funds: [
          fundUtxo(2, 50_000_000n, {
            scriptReference: identity.contractVersion.accountValidator,
          }),
          fundUtxo(1, 1_000_000n),
        ],
      });
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: recipientAddress, value: { coins: 2_000_000n } },
            ],
          }),
        ),
      ).toMatchObject({ code: 'insufficient-funds' });
    });

    it('refuses an operation whose fee would take the control output below its margin', async () => {
      const { state, grants } = withGrant();
      const next = accountState({
        nextSlot: 1n,
        outstanding: 1n,
        revoked: [0n],
      });
      // Above the least fee, below the fee the scripts' budgets add.
      const control = controlUtxo(state, {
        coins:
          minimumOf(next) +
          GROWTH_MARGIN +
          leastFeeOf(
            { scripts: [], referenceInputs: parkedScriptUtxos },
            protocolParameters,
          ) +
          50_000n,
      });
      const { run, provider } = scenario({
        state,
        grants,
        control,
        funds: [],
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 0n })),
      ).toMatchObject({ code: 'insufficient-funds' });
      expect(provider.evaluateTx).toHaveBeenCalled();
    });

    it('refuses before any evaluation a control output whose headroom cannot pay the least fee', async () => {
      const { state, grants } = withGrant();
      const { run, provider } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: minimumOf(state) + 300_000n }),
        funds: [],
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 0n })),
      ).toMatchObject({ code: 'insufficient-funds' });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('refuses an operation whose control output cannot cover the fee the builder balances at', async () => {
      const { state, grants } = withGrant();
      const { run, provider } = scenario({
        state,
        grants,
        // Below the fee balancing prices a revoke at, before evaluation.
        control: controlUtxo(state, { coins: 500_000n }),
        funds: [],
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 0n })),
      ).toMatchObject({ code: 'insufficient-funds' });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('keeps the draft the provider evaluates above the control minimum when the headroom pays', async () => {
      const { state, grants } = withGrant();
      const next = accountState({
        nextSlot: 1n,
        outstanding: 1n,
        revoked: [0n],
      });
      const { run, evaluated } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: minimumOf(next) + 800_000n }),
        funds: [],
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      const [draftControl] = evaluated[0].body().toCore().outputs;
      expect(draftControl.value.coins).toBeGreaterThanOrEqual(minimumOf(next));
      expect(controlOf(result).control.value.coins).toBe(
        minimumOf(next) + 800_000n - bodyOf(result).fee,
      );
    });

    it('reports a script failure while the control output pays', async () => {
      const { state, grants } = withGrant();
      const { run } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [],
        chain: { evaluate: () => new Error('Device failed') },
      });
      expect(
        expectFailure(await run({ type: 'revoke-grant', slot: 0n })),
      ).toEqual({
        code: 'script-evaluation-failed',
        message: expect.stringContaining('Device failed') as unknown,
      });
    });

    it('never pays requested outputs from the control output', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 50_000_000n }),
        funds: [],
      });
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: recipientAddress, value: { coins: 2_000_000n } },
            ],
          }),
        ),
      ).toMatchObject({ code: 'insufficient-funds' });
    });

    it('spends reserves after plain funds and returns their remainder as plain change', async () => {
      const reserve = reserveUtxo(2, 10_000_000n);
      const { run } = scenario({
        funds: [fundUtxo(1, 3_000_000n), reserve],
      });
      const output = {
        address: recipientAddress,
        value: { coins: 5_000_000n },
      };
      const result = expectSuccess(
        await run({ type: 'owner-spend', outputs: [output] }),
      );
      const body = bodyOf(result);
      expect(body.inputs).toEqual(
        expect.arrayContaining([{ txId: reserve[0].txId, index: 0 }]),
      );
      expect(
        redeemersOf(result).filter(
          ({ purpose }) => purpose === Cardano.RedeemerPurpose.spend,
        ),
      ).toHaveLength(3);
      expect(changeOf(result)).toHaveLength(1);
      expect(changeOf(result)[0].datum).toBeUndefined();
      expect(changeOf(result)[0].value.coins).toBe(
        3_000_000n + 10_000_000n - 5_000_000n - body.fee,
      );
    });

    it('leaves a reserve unspent while plain funds pay', async () => {
      const reserve = reserveUtxo(2, 10_000_000n);
      const { run } = scenario({
        funds: [fundUtxo(1, 20_000_000n), reserve],
      });
      const result = expectSuccess(await run({ type: 'revoke-all-grants' }));
      expect(
        bodyOf(result).inputs.some(({ txId }) => txId === reserve[0].txId),
      ).toBe(false);
    });

    it('never selects a reserve in another format', async () => {
      const foreign = fundUtxo(2, 50_000_000n, {
        datum: Serialization.PlutusData.fromCbor(HexBlob('01')).toCore(),
      });
      const { run } = scenario({ funds: [foreign] });
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: recipientAddress, value: { coins: 2_000_000n } },
            ],
          }),
        ),
      ).toMatchObject({ code: 'insufficient-funds' });
    });

    it('leaves out funds an unsettled transaction of the wallet spends', async () => {
      const control = controlUtxo();
      const held = fundUtxo(1, 20_000_000n);
      const free = fundUtxo(2, 10_000_000n);
      const { run } = scenario({
        control,
        funds: [held, free],
        store: {
          settledUtxos: [control, held, free],
          inFlightUtxos: [control, free],
        },
      });
      const result = expectSuccess(await run({ type: 'revoke-all-grants' }));
      expect(bodyOf(result).inputs).toEqual(
        expect.arrayContaining([{ txId: free[0].txId, index: 0 }]),
      );
      expect(
        bodyOf(result).inputs.some(({ txId }) => txId === held[0].txId),
      ).toBe(false);
    });

    it('keeps the control lovelace when the fee correction would credit it', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 10_000_000n }),
        funds: [fundUtxo(1, 4_000_000n)],
      });
      const result = expectSuccess(await run({ type: 'revoke-all-grants' }));
      const body = bodyOf(result);
      expect(controlOf(result).control.value.coins).toBe(10_000_000n);
      expect(changeOf(result)[0].value.coins).toBe(4_000_000n - body.fee);
    });

    it('refuses a transaction over the execution limit once it is reseeded at the measured budgets', async () => {
      const { run, provider } = scenario({
        // The estimate is capped at the tiny limit, so the scripts measure
        // above it; the reseeded build completes and the limits check
        // refuses it.
        chain: { protocolParameters: tinyExecutionLimit },
      });
      expect(
        expectFailure(await run({ type: 'revoke-all-grants' })),
      ).toMatchObject({
        code: 'transaction-limits',
        exceeded: ['executionMemory', 'executionSteps'],
      });
      // The draft at the estimate, the reseeded draft and its final bytes.
      expect(provider.evaluateTx).toHaveBeenCalledTimes(3);
    });
  });

  describe('metadata', () => {
    const output = { address: recipientAddress, value: { coins: 2_000_000n } };
    /** Metadata under label 1971: a payment intent id, as Midnight City reads it. */
    const paymentReference: Cardano.TxMetadata = new Map([
      [
        1971n,
        new Map<Cardano.Metadatum, Cardano.Metadatum>([['intentId', 'pi_42']]),
      ],
    ]);

    it("carries an owner spend's metadata as auxiliary data the body commits to", async () => {
      const { run } = scenario();
      const result = expectSuccess(
        await run({
          type: 'owner-spend',
          outputs: [output],
          metadata: paymentReference,
        }),
      );
      const transaction = transactionOf(result);
      const auxiliaryData = transaction.auxiliaryData()?.toCore();
      expect(auxiliaryData).toEqual({ blob: paymentReference });
      expect(transaction.body().toCore().auxiliaryDataHash).toBe(
        Cardano.computeAuxiliaryDataHash(auxiliaryData),
      );
    });

    it('carries no auxiliary data without metadata, nor for an empty map', async () => {
      const { run } = scenario();
      for (const metadata of [undefined, new Map()]) {
        const result = expectSuccess(
          await run({ type: 'owner-spend', outputs: [output], metadata }),
        );
        const transaction = transactionOf(result);
        expect(transaction.auxiliaryData()).toBeUndefined();
        expect(transaction.body().toCore().auxiliaryDataHash).toBeUndefined();
      }
    });

    it.each<[string, unknown]>([
      ['not a map', { 1971: 'pi_42' }],
      ['a negative label', new Map([[-1n, 'pi_42']])],
      ['a label beyond 64 bits', new Map([[2n ** 64n, 'pi_42']])],
      ['a label that is not an integer', new Map([['1971', 'pi_42']])],
      ['text longer than 64 bytes', new Map([[1971n, 'x'.repeat(65)]])],
      ['bytes longer than 64 bytes', new Map([[1971n, new Uint8Array(65)]])],
    ])(
      'refuses metadata that is %s before any evaluation',
      async (_, metadata) => {
        const { run, provider } = scenario();
        expect(
          expectFailure(
            await run({
              type: 'owner-spend',
              outputs: [output],
              metadata: metadata as Cardano.TxMetadata,
            }),
          ),
        ).toMatchObject({
          code: 'invalid-operation',
          reason: 'invalid-metadata',
        });
        expect(provider.evaluateTx).not.toHaveBeenCalled();
      },
    );

    it.each<CardanoCustodyAccountOperation>([
      { type: 'issue-grant', scope: grantScope() },
      { type: 'replace-grant', slot: 0n, scope: grantScope() },
      { type: 'revoke-grant', slot: 0n },
      { type: 'revoke-all-grants' },
      {
        type: 'delegate',
        poolId: Cardano.PoolId(
          'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
        ),
      },
    ])(
      'refuses, before any evaluation, metadata on a $type rather than dropping it',
      async operation => {
        const { run, provider } = scenario(withGrant());
        for (const metadata of [paymentReference, new Map()]) {
          expect(
            expectFailure(
              await run({ ...operation, metadata } as typeof operation),
            ),
          ).toMatchObject({
            code: 'invalid-operation',
            reason: 'invalid-metadata',
            message: `A ${operation.type} carries no metadata`,
          });
        }
        expect(provider.evaluateTx).not.toHaveBeenCalled();
      },
    );
  });

  describe('execution estimate', () => {
    /** Above the estimate of a `Device` spend beside one fund. */
    const ABOVE_ESTIMATE: Cardano.ExUnits = {
      memory: 2_000_000,
      steps: 600_000_000,
    };

    it('needs plain funds of only the fee at the execution estimate and a change minimum', async () => {
      // Headroom to pay from when the plain funds cannot.
      const control = controlUtxo(accountState(), { coins: 3_000_000n });
      const revokeAllWith = (funds: Cardano.Utxo[]) =>
        scenario({ control, funds });
      const probe = revokeAllWith([fundUtxo(1, 20_000_000n)]);
      const probed = expectSuccess(
        await probe.run({ type: 'revoke-all-grants' }),
      );
      const balancedFee = probe.evaluated[0].body().fee();
      // Balancing reserves no more above the real fee than the estimate's
      // execution fee, far below the per-transaction limit's.
      expect(balancedFee - probed.fee).toBeLessThanOrEqual(
        executionFeeOf(
          custodyExecutionEstimate({ device: 1, fund: 1, logic: 'owner' }),
        ),
      );
      const least = balancedFee + CHANGE_MINIMUM;

      const paid = expectSuccess(
        await revokeAllWith([fundUtxo(1, least)]).run({
          type: 'revoke-all-grants',
        }),
      );
      expect(bodyOf(paid).inputs).toHaveLength(2);
      expect(paid.fee).toBe(probed.fee);
      // One lovelace less, and the control headroom pays instead.
      const short = expectSuccess(
        await revokeAllWith([fundUtxo(1, least - 1n)]).run({
          type: 'revoke-all-grants',
        }),
      );
      expect(bodyOf(short).inputs).toHaveLength(1);
      expect(controlOf(short).control.value.coins).toBe(
        3_000_000n - bodyOf(short).fee,
      );
    });

    it('reseeds a build that measures above the estimate, adding a fund UTxO in a second selection round', async () => {
      const probe = scenario({
        chain: { evaluate: evaluateAll(ABOVE_ESTIMATE) },
      });
      expectSuccess(await probe.run({ type: 'revoke-all-grants' }));
      // Enough to balance at the estimate, but not at the measurement.
      const first = fundUtxo(
        1,
        probe.evaluated[0].body().fee() + CHANGE_MINIMUM,
      );
      const second = fundUtxo(2, 1_000_000n);
      expect(probe.evaluated[1].body().fee()).toBeGreaterThan(
        probe.evaluated[0].body().fee(),
      );

      const { run, evaluated } = scenario({
        funds: [first, second],
        chain: { evaluate: evaluateAll(ABOVE_ESTIMATE) },
      });
      const result = expectSuccess(await run({ type: 'revoke-all-grants' }));
      expect(bodyOf(result).inputs).toEqual(
        expect.arrayContaining([
          { txId: first[0].txId, index: 0 },
          { txId: second[0].txId, index: 0 },
        ]),
      );
      // The draft at the estimate, the reseeded draft and its final bytes.
      expect(evaluated).toHaveLength(3);
      expect(evaluated[0].body().inputs().size()).toBe(2);
      expect(evaluated[1].body().inputs().size()).toBe(3);
      expect(changeOf(result)[0].value.coins).toBe(
        first[1].value.coins + second[1].value.coins - bodyOf(result).fee,
      );
    });

    it('reseeds a revoke the control headroom pays when it measures above the estimate', async () => {
      const { state, grants } = withGrant();
      const { run, evaluated } = scenario({
        state,
        grants,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [],
        chain: {
          evaluate: evaluateAll({ memory: 4_000_000, steps: 600_000_000 }),
        },
      });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      const body = bodyOf(result);
      expect(evaluated).toHaveLength(3);
      expect(body.inputs).toHaveLength(1);
      expect(controlOf(result).control.value.coins).toBe(3_000_000n - body.fee);
      // The Device spend and the logic run.
      expect(
        transactionOf(result)
          .witnessSet()
          .redeemers()
          ?.toCore()
          .map(({ executionUnits }) => executionUnits),
      ).toEqual([
        { memory: 4_400_000, steps: 660_000_000 },
        { memory: 4_400_000, steps: 660_000_000 },
      ]);
    });

    it('fails when the reseeded build measures above its seed again', async () => {
      let calls = 0;
      const { run } = scenario({
        chain: {
          evaluate: tx => {
            calls++;
            return evaluateAll({
              memory: 4_000_000 * calls,
              steps: 600_000_000,
            })(tx);
          },
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'script-evaluation-failed',
        message: expect.stringContaining('after a reseed') as unknown,
      });
      expect(calls).toBe(2);
    });
  });

  describe('contract scripts and the logic run', () => {
    /** Two devices, a current grant in slot 0 and a revoked one in slot 1. */
    const everyOperation = () => {
      const state = accountState({
        devices: [HexBlob(deviceKeyHash), HexBlob(otherDeviceKeyHash)],
        nextSlot: 2n,
        outstanding: 2n,
        revoked: [1n],
      });
      return scenario({
        state,
        control: controlUtxo(state, { coins: 5_000_000n }),
        grants: [
          grantUtxo(lovelaceGrant({}, 0n)),
          grantUtxo(lovelaceGrant({}, 1n, { grantee: otherGranteeKeyHash })),
        ],
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 1_000_000n,
          }),
        },
      });
    };

    it.each<[CardanoCustodyAccountOperation, boolean]>([
      [
        {
          type: 'issue-grant',
          scope: grantScope({ grantee: HexBlob('a7'.repeat(28)) }),
        },
        false,
      ],
      [{ type: 'replace-grant', slot: 0n, scope: grantScope() }, false],
      [{ type: 'revoke-grant', slot: 0n }, false],
      [{ type: 'revoke-all-grants' }, false],
      [{ type: 'sweep-grants', slots: [1n] }, false],
      [{ type: 'add-device', keyHash: keyHash('d3') }, false],
      [{ type: 'remove-device', keyHash: otherDeviceKeyHash }, false],
      [
        {
          type: 'owner-spend',
          outputs: [
            { address: recipientAddress, value: { coins: 2_000_000n } },
          ],
        },
        false,
      ],
      [
        {
          type: 'delegate',
          poolId: Cardano.PoolId(
            'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
          ),
        },
        true,
      ],
      [{ type: 'withdraw-rewards' }, true],
    ])(
      'runs the logic once in %o, with the proxy and the logic read from their parked UTxOs',
      async (operation, isStakeOperation) => {
        const result = expectSuccess(await everyOperation().run(operation));
        const tx = transactionOf(result);
        const body = bodyOf(result);
        expect(
          body.withdrawals?.filter(
            ({ stakeAddress }) => stakeAddress === logicRewardAccountOf(),
          ),
        ).toEqual([{ stakeAddress: logicRewardAccountOf(), quantity: 0n }]);
        expect(body.referenceInputs).toEqual(
          parkedScriptUtxos.map(([{ txId, index }]) => ({ txId, index })),
        );
        expect(tx.witnessSet().toCore().scripts).toEqual(
          isStakeOperation ? [identity.stakeScript] : undefined,
        );
        expect(controlOf(result).state.logic).toBe(version.currentLogicHash);
      },
    );

    it('runs the logic the control names, reading the proxy and the logic from their parked UTxOs', async () => {
      const { state, grants } = withGrant();
      const { run } = scenario({ state, grants });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      const tx = transactionOf(result);
      const body = bodyOf(result);
      expect(body.referenceInputs).toEqual(
        parkedScriptUtxos.map(([{ txId, index }]) => ({ txId, index })),
      );
      expect(tx.witnessSet().toCore().scripts).toBeUndefined();
      expect(body.withdrawals).toEqual([
        { stakeAddress: logicRewardAccountOf(), quantity: 0n },
      ]);
      expect(redeemersOf(result)).toEqual(
        expect.arrayContaining([
          {
            purpose: Cardano.RedeemerPurpose.withdrawal,
            data: RUN_REDEEMER_CBOR,
          },
        ]),
      );
      expect(result.resolvedInputs).toEqual(
        expect.arrayContaining(parkedScriptUtxos),
      );
    });

    it('attaches the proxy and the logic on a network without parked copies', async () => {
      const { state, grants } = withGrant();
      const { run } = scenario({ state, grants, network: unparkedChainId });
      const result = expectSuccess(
        await run({ type: 'revoke-grant', slot: 0n }),
      );
      expect(bodyOf(result).referenceInputs).toBeUndefined();
      expect(transactionOf(result).witnessSet().toCore().scripts).toEqual([
        version.accountValidator,
        currentLogic.script,
      ]);
    });

    it('attaches the stake script beside the referenced proxy and logic for a stake operation', async () => {
      const { run } = scenario({
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 1_000_000n,
          }),
        },
      });
      const result = expectSuccess(await run({ type: 'withdraw-rewards' }));
      expect(transactionOf(result).witnessSet().toCore().scripts).toEqual([
        identity.stakeScript,
      ]);
      expect(bodyOf(result).referenceInputs).toHaveLength(
        parkedScriptUtxos.length,
      );
    });

    it('refuses, before any evaluation, an account whose logic credential is not registered', async () => {
      const { run, provider } = scenario({
        chain: {
          logicRewardAccount: { isRegistered: false, withdrawableAmount: 0n },
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'logic-not-registered',
        rewardAccount: logicRewardAccountOf(),
      });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    describe('a logic reward balance someone paid', () => {
      const drawing = {
        logicRewardAccount: {
          isRegistered: true,
          withdrawableAmount: 1_500_000n,
        },
      };

      it('keeps a draw beside an operation that pays nothing out at the account, which only the fee sponsor refuses', async () => {
        const { run } = scenario({ chain: drawing });
        expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual(
          {
            code: 'sponsor-rules',
            violations: [
              {
                rule: 'no_foreign_scripts',
                reason: 'logic-draw',
                logic: currentLogic.hash,
                quantity: 1_500_000n,
                rewardAccount: logicRewardAccountOf(),
              },
            ],
          },
        );
      });

      it('builds no owner spend that draws, which inspection refuses before the sponsor rules', async () => {
        const { run } = scenario({ chain: drawing });
        const failure = expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: recipientAddress, value: { coins: 5_000_000n } },
            ],
          }),
        );
        expect(failure).toMatchObject({
          code: 'inspection-refused',
          refusals: [
            {
              code: 'custody-unsupported-operation',
              reason: 'logic-draw-leaves-account',
              logic: currentLogic.hash,
              quantity: 1_500_000n,
            },
          ],
        });
      });
    });

    it('refuses an account whose control names a logic outside the catalogue', async () => {
      const { run, provider } = scenario({
        state: accountState({ logic: HexBlob('69'.repeat(28)) }),
      });
      expect(
        expectFailure(await run({ type: 'revoke-all-grants' })),
      ).toMatchObject({ code: 'account-not-live', status: 'invalid' });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it.each([
      ['referenced', undefined],
      ['attached', unparkedChainId],
    ])(
      'pays two revokes from the owner fee reserve target with the scripts %s, at the budgets upstream measured',
      async (_how, network) => {
        const { state, grants } = withGrant();
        const { run, evaluated } = scenario({
          state,
          grants,
          control: controlUtxo(state, { coins: 3_500_000n }),
          funds: [],
          chain: { evaluate: evaluateLikeDevnet },
          network,
        });
        const result = expectSuccess(
          await run({ type: 'revoke-grant', slot: 0n }),
        );
        const draftFee = evaluated[0].body().fee();
        expect(result.fee).toBeLessThanOrEqual(draftFee);
        // The first revoke takes its fee from the reserve; the second's draft
        // must then find its own fee above the grown state's minimum and the
        // growth margin.
        expect(
          result.fee + draftFee + 2n * REVOKE_GROWTH + GROWTH_MARGIN,
        ).toBeLessThanOrEqual(RESERVE_TARGET);
      },
    );
  });

  describe('owner spend', () => {
    it('pays the requested outputs and returns the rest to the account', async () => {
      const { run } = scenario({
        funds: [fundUtxo(1, 3_000_000n), fundUtxo(2, 6_000_000n)],
      });
      const output = {
        address: recipientAddress,
        value: { coins: 5_000_000n },
      };
      const result = expectSuccess(
        await run({ type: 'owner-spend', outputs: [output] }),
      );
      const body = bodyOf(result);
      expect(
        body.outputs.filter(({ address }) => address === recipientAddress),
      ).toEqual([output]);
      expect(body.inputs).toHaveLength(3);
      expect(changeOf(result)[0].value.coins).toBe(
        3_000_000n + 6_000_000n - 5_000_000n - body.fee,
      );
    });

    it('pays out a token and returns the rest of it', async () => {
      const { run } = scenario({
        funds: [
          fundUtxo(1, 20_000_000n),
          fundUtxo(2, 5_000_000n, {
            value: { coins: 5_000_000n, assets: new Map([[TOKEN, 100n]]) },
          }),
        ],
      });
      const output = {
        address: recipientAddress,
        value: { coins: 2_000_000n, assets: new Map([[TOKEN, 10n]]) },
      };
      const result = expectSuccess(
        await run({ type: 'owner-spend', outputs: [output] }),
      );
      expect(
        changeOf(result).map(({ value }) => value.assets?.get(TOKEN)),
      ).toEqual([90n]);
    });

    it('refuses a token the account does not hold', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              {
                address: recipientAddress,
                value: { coins: 2_000_000n, assets: new Map([[TOKEN, 1n]]) },
              },
            ],
          }),
        ),
      ).toMatchObject({ code: 'insufficient-funds' });
    });

    it('refuses outputs the account cannot pay as asked', async () => {
      const { run } = scenario();
      const refusal = async (output: Cardano.TxOut) =>
        expectFailure(await run({ type: 'owner-spend', outputs: [output] }));
      const mainnetAddress = Cardano.Address.fromBech32(recipientAddress)
        .asBase()!
        .getPaymentCredential();
      expect(
        await refusal({
          address: Cardano.EnterpriseAddress.fromCredentials(
            Cardano.NetworkId.Mainnet,
            mainnetAddress,
          )
            .toAddress()
            .toBech32() as Cardano.PaymentAddress,
          value: { coins: 2_000_000n },
        }),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'invalid-output',
        message: 'Output 0 is not an address on the account network',
      });
      expect(
        await refusal({
          address: identity.address,
          value: { coins: 2_000_000n },
        }),
      ).toMatchObject({ message: 'Output 0 pays the account itself' });
      expect(
        await refusal({
          address: recipientAddress,
          value: {
            coins: 2_000_000n,
            assets: new Map([[grantTokenOf(0n), 1n]]),
          },
        }),
      ).toMatchObject({ message: 'Output 0 carries a custody account token' });
      expect(
        await refusal({ address: recipientAddress, value: { coins: 1000n } }),
      ).toMatchObject({ message: 'Output 0 holds less than its minimum ADA' });
    });

    it('refuses a Byron output before any provider call', async () => {
      const { run, provider } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: TESTNET_BYRON_ADDRESS, value: { coins: 2_000_000n } },
            ],
          }),
        ),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'invalid-output',
        message:
          'Output 0 is a Byron address, which a Plutus transaction cannot pay',
      });
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('refuses an output that pays the sponsor, which the sponsor would refuse', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              { address: sponsorAddress, value: { coins: 2_000_000n } },
            ],
          }),
        ),
      ).toEqual({
        code: 'sponsor-rules',
        violations: [
          {
            rule: 'sponsor_outflow_zero',
            reason: 'pays-sponsor',
            outputIndex: 1,
          },
        ],
      });
    });

    it('refuses an output no account builder could ever spend', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'owner-spend',
            outputs: [
              {
                address: unspendableCustodyAddress,
                value: { coins: 2_000_000n },
              },
            ],
          }),
        ),
      ).toMatchObject({
        code: 'inspection-refused',
        refusals: [{ code: 'custody-locked-output' }],
      });
    });
  });

  describe('staking', () => {
    it('delegates the account stake with the stake script', async () => {
      const poolId = Cardano.PoolId(
        'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
      );
      const { run } = scenario();
      const result = expectSuccess(await run({ type: 'delegate', poolId }));
      const tx = transactionOf(result);
      expect(tx.body().toCore().certificates).toEqual([
        {
          __typename: Cardano.CertificateType.StakeDelegation,
          poolId,
          stakeCredential: {
            type: Cardano.CredentialType.ScriptHash,
            hash: identity.stakeScriptHash,
          },
        },
      ]);
      // The proxy and the logic come from their parked UTxOs.
      expect(tx.witnessSet().toCore().scripts).toEqual([identity.stakeScript]);
      expect(tx.body().toCore().withdrawals).toEqual([
        { stakeAddress: logicRewardAccountOf(), quantity: 0n },
      ]);
      expect(
        tx
          .witnessSet()
          .redeemers()
          ?.toCore()
          .map(({ purpose }) => purpose),
      ).toEqual(
        expect.arrayContaining([
          Cardano.RedeemerPurpose.certificate,
          Cardano.RedeemerPurpose.withdrawal,
        ]),
      );
    });

    it('refuses a malformed pool id', async () => {
      const { run } = scenario();
      expect(
        expectFailure(
          await run({
            type: 'delegate',
            poolId: 'pool1nope' as Cardano.PoolId,
          }),
        ),
      ).toMatchObject({ code: 'invalid-operation', reason: 'invalid-pool-id' });
    });

    it('withdraws the whole reward balance into the account change', async () => {
      const { run } = scenario({
        funds: [],
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 10_000_000n,
          }),
        },
      });
      const result = expectSuccess(await run({ type: 'withdraw-rewards' }));
      const body = bodyOf(result);
      // The logic run and the account's rewards, each with its redeemer.
      expect(body.withdrawals).toHaveLength(2);
      expect(body.withdrawals).toEqual(
        expect.arrayContaining([
          { stakeAddress: logicRewardAccountOf(), quantity: 0n },
          { stakeAddress: identity.rewardAccount, quantity: 10_000_000n },
        ]),
      );
      expect(
        redeemersOf(result).filter(
          ({ purpose }) => purpose === Cardano.RedeemerPurpose.withdrawal,
        ),
      ).toHaveLength(2);
      expect(body.inputs).toHaveLength(1);
      expect(controlOf(result).control.value.coins).toBe(2_000_000n);
      expect(changeOf(result).map(({ value }) => value.coins)).toEqual([
        10_000_000n - body.fee,
      ]);
    });

    it('adds fund UTxOs when the rewards do not cover the fee', async () => {
      const { run } = scenario({
        funds: [fundUtxo(1, 5_000_000n)],
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 100_000n,
          }),
        },
      });
      const result = expectSuccess(await run({ type: 'withdraw-rewards' }));
      const body = bodyOf(result);
      expect(body.inputs).toHaveLength(2);
      expect(changeOf(result)[0].value.coins).toBe(
        5_000_000n + 100_000n - body.fee,
      );
    });

    it('withdraws small rewards into the control output, which pays the fee', async () => {
      const state = accountState();
      const { run } = scenario({
        state,
        control: controlUtxo(state, { coins: 3_000_000n }),
        funds: [],
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 100_000n,
          }),
        },
      });
      const result = expectSuccess(await run({ type: 'withdraw-rewards' }));
      expect(controlOf(result).control.value.coins).toBe(
        3_000_000n + 100_000n - bodyOf(result).fee,
      );
    });

    it('refuses a withdrawal with no rewards', async () => {
      const { run } = scenario({
        chain: {
          rewardAccount: () => ({
            isRegistered: true,
            withdrawableAmount: 0n,
          }),
        },
      });
      expect(
        expectFailure(await run({ type: 'withdraw-rewards' })),
      ).toMatchObject({ code: 'invalid-operation', reason: 'no-rewards' });
    });
  });

  describe('account resolution', () => {
    it('refuses an account id that names no custody account', async () => {
      const { run } = scenario({ store: { account: undefined } });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'unknown-account',
      });
    });

    it('refuses an account of another network', async () => {
      const account = custodyAccount();
      const { run } = scenario({
        store: {
          account: {
            ...account,
            blockchainSpecific: {
              ...account.blockchainSpecific,
              chainId: Cardano.ChainIds.Preview,
            },
          },
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'unknown-account',
      });
    });

    it('refuses an account whose stored identity is not the derived one', async () => {
      const account = custodyAccount();
      const { run } = scenario({
        store: {
          account: {
            ...account,
            blockchainSpecific: {
              ...account.blockchainSpecific,
              address: otherRecipientAddress,
            },
          },
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'unknown-account',
      });
    });

    it('refuses an account the store holds no UTxOs of', async () => {
      expect(
        expectFailure(
          await runBuild(operationRequest({ type: 'revoke-all-grants' }), {
            store: { isClassified: false },
          }),
        ),
      ).toEqual({ code: 'account-not-live', status: 'unsynced' });
    });

    it('refuses an account whose UTxOs are not known yet', async () => {
      const { run } = scenario({ store: { isClassified: false } });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'account-not-live',
        status: 'unsynced',
      });
    });

    it('refuses an account that is not created', async () => {
      const funds = [fundUtxo(1, 20_000_000n)];
      const { run } = scenario({ store: { settledUtxos: funds } });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'account-not-live',
        status: 'notCreated',
      });
    });

    it('refuses an account with more than one control UTxO', async () => {
      const utxos = [controlUtxo(), controlUtxo(accountState(), { seed: 101 })];
      const { run } = scenario({ store: { settledUtxos: utxos } });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'account-not-live',
        status: 'invalid',
      });
    });

    it('refuses while a submitted operation has not settled', async () => {
      const settled = [controlUtxo(), fundUtxo(1, 20_000_000n)];
      const pending = controlUtxo(accountState(), { seed: 200 });
      const { run } = scenario({
        store: {
          settledUtxos: settled,
          inFlightUtxos: [pending, fundUtxo(1, 20_000_000n)],
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'operation-in-progress',
      });
    });

    it('refuses when the chain holds another control UTxO than the store', async () => {
      const { run } = scenario({
        chain: {
          utxosAt: () => [controlUtxo(accountState(), { seed: 300 })],
        },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'stale-control',
      });
    });

    it('refuses when the chain no longer holds a control UTxO', async () => {
      const { run } = scenario({ chain: { utxosAt: () => [] } });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'stale-control',
      });
    });

    it('reads the account UTxOs with their reference scripts', async () => {
      const { run, provider } = scenario();
      expectSuccess(await run({ type: 'revoke-all-grants' }));
      expect(provider.getUtxosAtAddress).toHaveBeenCalledWith(
        { address: identity.address, withReferenceScripts: true },
        { chainId },
      );
    });

    it('reports a failed chain read as unavailable', async () => {
      const { run, provider } = scenario();
      provider.getUtxosAtAddress.mockReturnValue(
        of(Err(providerError('down'))) as never,
      );
      expect(
        expectFailure(await run({ type: 'revoke-all-grants' })),
      ).toMatchObject({
        code: 'unavailable',
        message: expect.stringContaining('Custody account UTxOs') as unknown,
      });
    });

    it('refuses an owner operation from an observer', async () => {
      const { run } = scenario({
        store: { account: custodyAccount(null as never) },
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'observer-account',
      });
    });

    it('refuses an account whose device is not listed', async () => {
      const { run } = scenario({
        state: accountState({ devices: [HexBlob(otherDeviceKeyHash)] }),
      });
      expect(expectFailure(await run({ type: 'revoke-all-grants' }))).toEqual({
        code: 'device-not-listed',
        keyHash: deviceKeyHash,
      });
    });

    it('builds on the account network', () => {
      expect(chainId).toEqual(Cardano.ChainIds.Preprod);
    });
  });
});

// The control-funded path supplies no change outputs to the coin selector.
describe('estimated collateral for a control-funded owner operation', () => {
  it('reports insufficient collateral before evaluating instead of reseeding the execution budget', async () => {
    const state = accountState({ nextSlot: 1n, outstanding: 1n });
    const control = controlUtxo(state, { coins: 20_000_000n });
    const estimate = custodyExecutionEstimate({ device: 1, logic: 'owner' });
    const referenceFee =
      leastFeeOf(
        { scripts: [], referenceInputs: parkedScriptUtxos },
        protocolParameters,
      ) - BigInt(protocolParameters.minFeeConstant);
    const target =
      ((preEvaluationFeeBound(protocolParameters, estimate) + referenceFee) *
        150n +
        99n) /
      100n;
    const collateral: Cardano.Utxo = [
      collateralUtxo[0],
      {
        ...collateralUtxo[1],
        value: { coins: target + 59_000n },
      },
    ];
    const { provider, evaluated } = fakeProvider({
      utxosAt: address => (address === identity.address ? [control] : []),
      evaluate: evaluateAll({
        memory: Math.floor(estimate.memory / 2 / 1.1),
        steps: Math.floor(estimate.steps / 2 / 1.1),
      }),
    });

    const outcome = await runBuild(
      {
        requestId: 'estimated-collateral',
        accountId,
        operation: { type: 'revoke-all-grants' },
        funding: collateralFunding({ collateralUtxo: collateral }),
      },
      { provider, store: { settledUtxos: [control] } },
    );

    expect(expectFailure(outcome).code).toBe('collateral-insufficient');
    expect(evaluated).toHaveLength(0);
  });
});
