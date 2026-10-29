import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import {
  createCustodyAccountRecord,
  encodeCustodyAccountRedeemer,
  encodeCustodyLogicRedeemer,
} from '@lace-lib/cardano-custody';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CustodyBuildFailure } from '../../../src/store/custody/build-failure';
import {
  grantOutputOf,
  resolvedInputsOf,
} from '../../../src/store/custody/custody-assembly';
import {
  createSlotClock,
  validitySlotFor,
} from '../../../src/store/custody/custody-chain';
import { buildWithEvaluatedBudgets } from '../../../src/store/custody/custody-evaluation';
import { custodyExecutionEstimate } from '../../../src/store/custody/custody-execution-estimate';
import { custodyScriptWitnesses } from '../../../src/store/custody/custody-scripts';
import { finalizeCustodyBuild } from '../../../src/store/custody/custody-validation';

import {
  accountId,
  accountState,
  chainId,
  collateralFunding,
  controlUtxo,
  deviceKeyHash,
  eraSummaries,
  EXPIRY_MS,
  expectSuccess,
  fakeProvider,
  fundUtxo,
  granteeKeyHash,
  identity,
  grantUtxo,
  identityOf,
  lovelaceGrant,
  recipientAddress,
  otherDeviceKeyHash,
  protocolParameters,
  runBuild,
  transactionOf,
  utxo,
} from './fixtures';

import type { CustodyChain } from '../../../src/store/custody/custody-chain';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildError,
  CardanoCustodyBuildResult,
  CardanoCustodyCollateralFunding,
} from '@lace-contract/cardano-context';
import type { CustodyGrant } from '@lace-lib/cardano-custody';

const limits = vi.hoisted(() => ({ error: undefined as Error | undefined }));

vi.mock('@lace-contract/cardano-context', async importOriginal => {
  const actual = await importOriginal<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@lace-contract/cardano-context')
  >();
  return {
    ...actual,
    assertWithinTransactionLimits: (
      ...args: Parameters<typeof actual.assertWithinTransactionLimits>
    ) => {
      if (limits.error) throw limits.error;
      return actual.assertWithinTransactionLimits(...args);
    },
  };
});

const state = accountState({ grantGeneration: 1n });
const funding: CardanoCustodyCollateralFunding = collateralFunding();
const fixture = {} as {
  built: CardanoCustodyBuildResult;
  issued: CardanoCustodyBuildResult;
  spend: {
    transaction: Serialization.Transaction;
    resolvedInputs: Cardano.Utxo[];
    after: CustodyGrant;
  };
};

beforeAll(async () => {
  const utxos = [
    controlUtxo(accountState(), { coins: 10_000_000n }),
    fundUtxo(1, 20_000_000n),
  ];
  const { provider } = fakeProvider({ utxosAt: () => utxos });
  const build = async (operation: CardanoCustodyAccountOperation) =>
    expectSuccess(
      await runBuild(
        { requestId: operation.type, accountId, operation, funding },
        { provider, store: { settledUtxos: utxos } },
      ),
    );
  fixture.built = await build({ type: 'revoke-all-grants' });
  fixture.issued = await build({
    type: 'issue-grant',
    scope: {
      grantee: HexBlob(granteeKeyHash),
      asset: { policyId: HexBlob(''), assetName: HexBlob('') },
      perCallCap: 20_000_000n,
      cap: 50_000_000n,
      lovelacePerCallCap: 0n,
      lovelaceCap: 0n,
      expiresAt: EXPIRY_MS,
      recipients: [],
    },
  });
});

const chain = (
  parameters: Cardano.ProtocolParameters = protocolParameters,
): CustodyChain => ({
  chainId,
  protocolParameters: parameters,
  clock: createSlotClock(eraSummaries),
  now: Date.now(),
  provider: fakeProvider().provider as never,
});

/**
 * A grant spend assembled by hand: the control UTxO referenced, the grant
 * and one fund spent, the logic run with the proxy and the logic read from
 * where Preprod parks them, the grant recreated with its value and its cap
 * lowered by the payout and a 2 ADA fee bound.
 */
beforeAll(async () => {
  const grant = lovelaceGrant();
  const state = accountState({ nextSlot: 1n, outstanding: 1n });
  const control = controlUtxo(state);
  const spent = grantUtxo(grant);
  const fund = fundUtxo(1, 20_000_000n);
  const after: CustodyGrant = {
    ...grant,
    scope: { ...grant.scope, cap: grant.scope.cap - 7_000_000n },
  };
  const spendChain = chain();
  const { contractVersion } = identity;
  const [logic] = contractVersion.logics;
  const witnesses = custodyScriptWitnesses(contractVersion, spendChain, [
    contractVersion.accountValidator,
    logic.script,
  ]);
  const transaction = await buildWithEvaluatedBudgets({
    chain: spendChain,
    funds: { selected: [fund], remaining: [] },
    plan: funds => ({
      inputs: [
        {
          utxo: spent,
          redeemer: encodeCustodyAccountRedeemer({ kind: 'spendWithGrant' }),
        },
        ...funds.map(utxo => ({
          utxo,
          redeemer: encodeCustodyAccountRedeemer({ kind: 'fund' }),
        })),
      ],
      referenceInputs: [control, ...witnesses.referenced],
      outputs: [
        grantOutputOf(identity, after, spent[1].value.coins),
        { address: recipientAddress, value: { coins: 5_000_000n } },
      ],
      changeAddress: identity.address,
      scripts: witnesses.attached,
      withdrawals: [
        {
          rewardAccount: Cardano.RewardAccount.fromCredential(
            { type: Cardano.CredentialType.ScriptHash, hash: logic.hash },
            chainId.networkId,
          ),
          quantity: 0n,
          redeemer: encodeCustodyLogicRedeemer(),
        },
      ],
      executionEstimate: custodyExecutionEstimate({
        spendWithGrant: 1,
        fund: funds.length,
        logic: 'agent',
      }),
      requiredSigner: granteeKeyHash,
      invalidHereafter: validitySlotFor(funding.validUntil, spendChain),
      collateral: {
        utxo: funding.collateralUtxo,
        returnAddress: funding.sponsorAddress,
      },
    }),
  });
  fixture.spend = {
    transaction,
    resolvedInputs: resolvedInputsOf(transaction, [
      spent,
      fund,
      control,
      ...witnesses.referenced,
      funding.collateralUtxo,
    ]),
    after,
  };
});

type CustodyBuildExpectation = Parameters<typeof finalizeCustodyBuild>[2];

const expectation = (
  overrides: Partial<CustodyBuildExpectation> = {},
): CustodyBuildExpectation => ({
  record: createCustodyAccountRecord(identity),
  control: { state, lovelace: 10_000_000n },
  signer: deviceKeyHash,
  deviceKeyHash,
  outflow: { requested: { coins: 0n }, withdrawal: 0n },
  funding,
  ...overrides,
});

const refusalOf = (
  overrides: Partial<CustodyBuildExpectation>,
  parameters?: Cardano.ProtocolParameters,
  built: CardanoCustodyBuildResult = fixture.built,
): CardanoCustodyBuildError => {
  try {
    finalizeCustodyBuild(
      {
        transaction: transactionOf(built),
        resolvedInputs: built.resolvedInputs,
      },
      chain(parameters),
      expectation(overrides),
    );
  } catch (error) {
    if (error instanceof CustodyBuildFailure) return error.reason;
    throw error;
  }
  throw new Error('expected a refusal');
};

describe('finalizeCustodyBuild', () => {
  it('accepts the transaction it was built as', () => {
    expect(
      finalizeCustodyBuild(
        {
          transaction: transactionOf(fixture.built),
          resolvedInputs: fixture.built.resolvedInputs,
        },
        chain(),
        expectation(),
      ),
    ).toEqual(fixture.built);
  });

  it('refuses another resulting state', () => {
    expect(
      refusalOf({ control: { state: accountState(), lovelace: 10_000_000n } }),
    ).toEqual({
      code: 'build-failed',
      message:
        'The built transaction does not carry the intended account state',
    });
  });

  it('refuses another control lovelace', () => {
    expect(refusalOf({ control: { state, lovelace: 3_000_000n } })).toEqual({
      code: 'build-failed',
      message:
        'The built transaction does not lock the intended control lovelace',
    });
  });

  it('refuses a control output where none was intended', () => {
    expect(refusalOf({ control: undefined })).toEqual({
      code: 'build-failed',
      message: 'The built transaction rewrites the control state',
    });
  });

  it('accepts the grant it was built to issue, its token aside from the outflow', () => {
    const [issued] = transactionOf(fixture.issued)
      .body()
      .toCore()
      .outputs.slice(1, 2);
    const grant = lovelaceGrant({ perCallCap: 20_000_000n, cap: 50_000_000n });
    const issuedExpectation = expectation({
      control: {
        state: accountState({ nextSlot: 1n, outstanding: 1n }),
        lovelace: 10_000_000n,
      },
      issuedGrants: [{ grant, lovelace: issued.value.coins }],
    });
    expect(
      finalizeCustodyBuild(
        {
          transaction: transactionOf(fixture.issued),
          resolvedInputs: fixture.issued.resolvedInputs,
        },
        chain(),
        issuedExpectation,
      ),
    ).toEqual(fixture.issued);
    for (const issuedGrants of [
      [],
      [{ grant: { ...grant, slot: 1n }, lovelace: issued.value.coins }],
      [{ grant, lovelace: issued.value.coins + 1n }],
    ]) {
      expect(
        refusalOf(
          { ...issuedExpectation, issuedGrants },
          undefined,
          fixture.issued,
        ),
      ).toEqual({
        code: 'build-failed',
        message: 'The built transaction does not issue the intended grants',
      });
    }
  });

  it('accepts the grant spend it was built as, with the control UTxO referenced', () => {
    const { transaction, resolvedInputs, after } = fixture.spend;
    const [{ txId, index }] = controlUtxo(
      accountState({ nextSlot: 1n, outstanding: 1n }),
    );
    expect(transaction.body().toCore().referenceInputs).toContainEqual({
      txId,
      index,
    });
    const spendExpectation = expectation({
      control: undefined,
      grantSpend: { slot: 0n, after },
      signer: granteeKeyHash,
      deviceKeyHash: undefined,
      outflow: { requested: { coins: 5_000_000n }, withdrawal: 0n },
    });
    expect(
      finalizeCustodyBuild(
        { transaction, resolvedInputs },
        chain(),
        spendExpectation,
      ).resolvedInputs,
    ).toEqual(resolvedInputs);
    try {
      finalizeCustodyBuild({ transaction, resolvedInputs }, chain(), {
        ...spendExpectation,
        grantSpend: {
          slot: 0n,
          after: { ...after, scope: { ...after.scope, cap: 1n } },
        },
      });
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as CustodyBuildFailure).reason).toEqual({
        code: 'build-failed',
        message: 'The built transaction does not spend the intended grant',
      });
    }
  });

  it('refuses a sweep other than the intended one', () => {
    expect(refusalOf({ sweptSlots: [0n] })).toEqual({
      code: 'build-failed',
      message: 'The built transaction does not sweep the intended grants',
    });
  });

  it('refuses an outflow other than the requested one', () => {
    for (const outflow of [
      { requested: { coins: 1n }, withdrawal: 0n },
      { requested: { coins: 0n }, withdrawal: 1n },
      {
        requested: {
          coins: 0n,
          assets: new Map([[identity.stateNftAssetId, 1n]]),
        },
        withdrawal: 0n,
      },
    ]) {
      expect(refusalOf({ outflow })).toEqual({
        code: 'build-failed',
        message: 'The built transaction pays out more than requested',
      });
    }
  });

  it('refuses another signer', () => {
    expect(
      refusalOf({ signer: otherDeviceKeyHash, deviceKeyHash: undefined }),
    ).toEqual({
      code: 'build-failed',
      message:
        'The built transaction does not name exactly the intended signer',
    });
  });

  it('refuses what the shared custody inspection refuses', () => {
    expect(
      refusalOf({
        record: createCustodyAccountRecord(identityOf('c2'.repeat(28))),
      }),
    ).toMatchObject({
      code: 'inspection-refused',
      refusals: expect.arrayContaining([
        expect.objectContaining({ code: 'custody-context-mismatch' }),
      ]) as unknown,
    });
    expect(
      refusalOf({
        deviceKeyHash: otherDeviceKeyHash,
      }),
    ).toMatchObject({
      code: 'inspection-refused',
      refusals: expect.arrayContaining([
        expect.objectContaining({
          code: 'custody-device-not-listed',
          reason: 'not-listed',
        }),
      ]) as unknown,
    });
  });

  it('refuses a fee above what the sponsor collateral covers with its return', () => {
    const fee = transactionOf(fixture.built).body().fee();
    // The return needs 969,750 lovelace whatever four-byte amount it holds,
    // so the rest covers a fee of at most `fee - 1` at 150% collateral.
    const coins = 969_750n + ((fee - 1n) * 150n) / 100n;
    expect(
      refusalOf({
        funding: {
          ...funding,
          collateralUtxo: utxo(902, {
            ...funding.collateralUtxo[1],
            value: { coins },
          }),
        },
      }),
    ).toEqual({
      code: 'collateral-fee-ceiling',
      fee,
      maxFee: ((coins - 969_750n) * 100n) / 150n,
    });
  });

  it('refuses any fee when the collateral cannot even fund its return', () => {
    expect(
      refusalOf({
        funding: {
          ...funding,
          collateralUtxo: utxo(902, {
            ...funding.collateralUtxo[1],
            value: { coins: 900_000n },
          }),
        },
      }),
    ).toMatchObject({ code: 'collateral-fee-ceiling', maxFee: 0n });
  });

  it('sets no fee ceiling without a collateral percentage', () => {
    expect(
      finalizeCustodyBuild(
        {
          transaction: transactionOf(fixture.built),
          resolvedInputs: fixture.built.resolvedInputs,
        },
        chain({ ...protocolParameters, collateralPercentage: 0 }),
        expectation(),
      ),
    ).toEqual(fixture.built);
  });

  it('refuses what the sponsor service would refuse', () => {
    expect(
      refusalOf({
        funding: {
          ...funding,
          collateralUtxo: utxo(999, funding.collateralUtxo[1]),
        },
      }),
    ).toEqual({
      code: 'sponsor-rules',
      violations: [
        { rule: 'uses_shared_collateral', reason: 'collateral-inputs' },
      ],
    });
  });

  it('refuses a build whose script data hash the chain cost models do not reproduce', () => {
    expect(
      refusalOf(
        {},
        {
          ...protocolParameters,
          costModels: new Map([[Cardano.PlutusLanguageVersion.V3, [1, 2, 3]]]),
        },
      ),
    ).toEqual({
      code: 'sponsor-rules',
      violations: [
        expect.objectContaining({
          rule: 'script_data_hash',
          reason: 'script-data-hash-mismatch',
          declared: transactionOf(fixture.built).body().scriptDataHash(),
        }),
      ],
    });
  });

  it('refuses a transaction over the protocol limits', () => {
    const size = transactionOf(fixture.built).toCbor().length / 2;
    expect(
      refusalOf({}, { ...protocolParameters, maxTxSize: size - 1 }),
    ).toMatchObject({
      code: 'transaction-limits',
      exceeded: ['txSize'],
    });
  });

  it('lets an unexpected limits check failure through', () => {
    limits.error = new Error('cannot measure');
    try {
      expect(() =>
        finalizeCustodyBuild(
          {
            transaction: transactionOf(fixture.built),
            resolvedInputs: fixture.built.resolvedInputs,
          },
          chain(),
          expectation(),
        ),
      ).toThrow('cannot measure');
    } finally {
      limits.error = undefined;
    }
  });
});
