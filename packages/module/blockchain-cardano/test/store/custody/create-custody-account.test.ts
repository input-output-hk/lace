import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { assertWithinTransactionLimits } from '@lace-contract/cardano-context';
import {
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  decodeCustodyAccountState,
  deriveCustodyDeviceKey,
  encodeCustodyMintRedeemer,
} from '@lace-lib/cardano-custody';
import { Err } from '@lace-lib/util';
import { of } from 'rxjs';
import { beforeAll, describe, expect, it } from 'vitest';

import { CUSTODY_CREATION_SCAN_LIMIT } from '../../../src/store/custody/create-custody-account';
import {
  changeReserveAt,
  controlLovelaceFor,
  preEvaluationFeeBound,
} from '../../../src/store/custody/custody-assembly';
import {
  custodyExecutionEstimate,
  estimateWithinLimit,
} from '../../../src/store/custody/custody-execution-estimate';

import {
  RUN_REDEEMER_CBOR,
  collateralUtxo,
  currentLogic,
  datumCborOf,
  evaluateAll,
  providerError,
  deviceAccountPublicKey,
  expectFailure,
  expectSuccess,
  fakeProvider,
  feeFunding,
  feeUtxo,
  identityOf,
  logicRewardAccountOf,
  parkedScriptUtxos,
  protocolParameters,
  runBuild,
  sponsorAddress,
  transactionOf,
  unparkedChainId,
  utxo,
  version,
} from './fixtures';

import type { ChainFixture } from './fixtures';
import type * as Crypto from '@cardano-sdk/crypto';
import type {
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  RedeemerExecutionUnits,
} from '@lace-contract/cardano-context';
import type { CustodyAccountState } from '@lace-lib/cardano-custody';

const DEPOSIT = BigInt(protocolParameters.stakeKeyDeposit);
const MAX_SPONSORED = feeFunding().maxSponsoredLovelace;
/** The lovelace a creation leaves unused below the sponsor's limit. */
const SPONSOR_MARGIN = 100_000n;
/** The fee sponsor's `MAX_FEE_LOVELACE`. */
const SPONSOR_MAX_FEE = 2_000_000n;

/**
 * What upstream's devnet run with Preprod's parameters measured for a
 * creation (docs/devnet-evidence.md, step 1), by redeemer purpose.
 */
const DEVNET_CREATION_BUDGETS: Partial<
  Record<Cardano.RedeemerPurpose, Cardano.ExUnits>
> = {
  [Cardano.RedeemerPurpose.withdrawal]: { memory: 266_218, steps: 85_999_047 },
  [Cardano.RedeemerPurpose.mint]: { memory: 198_824, steps: 69_340_959 },
  [Cardano.RedeemerPurpose.certificate]: { memory: 115_649, steps: 36_215_971 },
};

const evaluateLikeDevnet = (
  tx: Serialization.Transaction,
): RedeemerExecutionUnits[] =>
  (tx.witnessSet().redeemers()?.toCore() ?? []).map(({ purpose, index }) => ({
    purpose,
    index,
    budget: DEVNET_CREATION_BUDGETS[purpose]!,
  }));

const cborOf = (data: Cardano.PlutusData) =>
  Serialization.PlutusData.fromCore(data).toCbor();

const initialStateOf = (creator: string): CustodyAccountState => ({
  logic: HexBlob(CURRENT_CUSTODY_CONTRACT_VERSION.currentLogicHash),
  devices: [HexBlob(creator)],
  grantGeneration: 0n,
  nextSlot: 0n,
  revoked: [],
  outstanding: 0n,
});

/** The initial state's minimum lovelace at the creator's account. */
const minimumControlOf = (creator: string) =>
  controlLovelaceFor(
    {
      identity: identityOf(creator),
      state: initialStateOf(creator),
      floor: 0n,
    },
    protocolParameters.coinsPerUtxoByte,
  );

const creationOf = (result: CardanoCustodyBuildResult) => {
  const body = transactionOf(result).body().toCore();
  const [control, change] = body.outputs;
  const [feeInput] = result.resolvedInputs;
  return {
    body,
    control: control.value.coins,
    drawn: feeInput[1].value.coins - change.value.coins,
  };
};

/**
 * Answers every redeemer of each build with that build's budget, in the
 * order the builds first reach the provider; later builds take the last
 * budget. A build is told apart by its control lovelace, which every round
 * of a creation changes and a reseed keeps.
 */
const evaluatePerBuild = (perBuild: Cardano.ExUnits[]) => {
  const builds: bigint[] = [];
  return {
    builds,
    evaluate: (tx: Serialization.Transaction) => {
      const control = tx.body().toCore().outputs[0].value.coins;
      if (!builds.includes(control)) builds.push(control);
      return evaluateAll(
        perBuild[Math.min(builds.indexOf(control), perBuild.length - 1)],
      )(tx);
    },
  };
};

const device = {} as { xpub: Crypto.Bip32PublicKeyHex };
const keyHashAt = async (index: number) => {
  const key = await deriveCustodyDeviceKey(device.xpub, index);
  if (!key.ok) throw new Error('fixture key');
  return key.value.keyHash;
};

beforeAll(async () => {
  device.xpub = await deviceAccountPublicKey();
});

const createRequest = (
  overrides: Partial<
    Extract<CardanoCustodyBuildRequest, { operation: { type: 'create' } }>
  > = {},
): CardanoCustodyBuildRequest => ({
  requestId: 'create-1',
  operation: { type: 'create', deviceAccountPublicKey: device.xpub },
  funding: feeFunding(),
  ...overrides,
});

/** Reward account and address state per creator index. */
const chainWith = async (
  byIndex: Record<number, 'account' | 'pre-registered'>,
): Promise<ChainFixture> => {
  const registered = new Map<string, 'account' | 'pre-registered'>();
  for (const [index, kind] of Object.entries(byIndex)) {
    registered.set(
      identityOf(await keyHashAt(Number(index))).rewardAccount,
      kind,
    );
  }
  const accountAddresses = new Map(
    await Promise.all(
      Object.entries(byIndex)
        .filter(([, kind]) => kind === 'account')
        .map(async ([index]) => {
          const created = identityOf(await keyHashAt(Number(index)));
          return [created.address as string, created] as const;
        }),
    ),
  );
  return {
    rewardAccount: rewardAccount => ({
      isRegistered: registered.has(rewardAccount),
      withdrawableAmount: 0n,
    }),
    utxosAt: address => {
      const created = accountAddresses.get(address);
      return created
        ? [
            utxo(77, {
              address: created.address,
              value: {
                coins: 2_000_000n,
                assets: new Map([[created.stateNftAssetId, 1n]]),
              },
            }),
          ]
        : [];
    },
  };
};

describe('custody account creation', () => {
  it('builds at the first unregistered creator index in fee mode', async () => {
    const { provider } = fakeProvider();
    const result = expectSuccess(await runBuild(createRequest(), { provider }));

    const creator = await keyHashAt(0);
    const created = identityOf(creator);
    const tx = transactionOf(result);
    const body = tx.body().toCore();

    expect(result.creation).toEqual({
      creatorIndex: 0,
      identity: {
        chainId: Cardano.ChainIds.Preprod,
        accountValidatorHash: created.contractVersion.accountValidatorHash,
        creatorKeyHash: creator,
        stakeScriptHash: created.stakeScriptHash,
        address: created.address,
        rewardAccount: created.rewardAccount,
      },
    });
    expect(result.accountRecord).toEqual(createCustodyAccountRecord(created));
    expect(result.bodyHash).toBe(tx.getId());
    expect(result.resolvedInputs).toEqual([
      feeUtxo,
      ...parkedScriptUtxos,
      collateralUtxo,
    ]);
    expect(body.inputs).toEqual([
      { txId: feeUtxo[0].txId, index: feeUtxo[0].index },
    ]);
    // The proxy and the logic come from their parked UTxOs; only the stake
    // script, applied to the creator, is attached.
    expect(body.referenceInputs).toEqual(
      parkedScriptUtxos.map(([{ txId, index }]) => ({ txId, index })),
    );
    expect(tx.witnessSet().toCore().scripts).toEqual([created.stakeScript]);
    expect(body.withdrawals).toEqual([
      { stakeAddress: logicRewardAccountOf(), quantity: 0n },
    ]);
    expect(body.mint).toEqual(new Map([[created.stateNftAssetId, 1n]]));
    expect(body.certificates).toEqual([
      {
        __typename: Cardano.CertificateType.Registration,
        stakeCredential: {
          type: Cardano.CredentialType.ScriptHash,
          hash: created.stakeScriptHash,
        },
        deposit: BigInt(protocolParameters.stakeKeyDeposit),
      },
    ]);
    expect(body.requiredExtraSignatures).toEqual([creator]);
    expect(body.collaterals).toEqual([
      { txId: collateralUtxo[0].txId, index: collateralUtxo[0].index },
    ]);
    expect(body.collateralReturn?.address).toBe(sponsorAddress);
    expect(body.totalCollateral).toBeDefined();

    const [control, change] = body.outputs;
    expect(body.outputs).toHaveLength(2);
    expect(control.address).toBe(created.address);
    expect(control.value).toEqual({
      coins: MAX_SPONSORED - DEPOSIT - body.fee - SPONSOR_MARGIN,
      assets: new Map([[created.stateNftAssetId, 1n]]),
    });
    const state = decodeCustodyAccountState(control.datum!);
    expect(state.ok && datumCborOf(state.value)).toBe(
      datumCborOf(initialStateOf(creator)),
    );
    expect(state.ok && state.value.logic).toBe(version.currentLogicHash);
    expect(
      (tx.witnessSet().redeemers()?.toCore() ?? []).map(
        ({ purpose, data }) => ({ purpose, data: cborOf(data) }),
      ),
    ).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.mint,
        data: cborOf(encodeCustodyMintRedeemer({ kind: 'createAccount' })),
      },
      { purpose: Cardano.RedeemerPurpose.certificate, data: 'd87980' },
      { purpose: Cardano.RedeemerPurpose.withdrawal, data: RUN_REDEEMER_CBOR },
    ]);
    expect(change.address).toBe(sponsorAddress);
    expect(feeUtxo[1].value.coins - change.value.coins).toBe(
      MAX_SPONSORED - SPONSOR_MARGIN,
    );
    expect(result.fee).toBe(body.fee);
    expect(result.invalidHereafter).toBe(
      body.validityInterval?.invalidHereafter,
    );
  });

  it('attaches the proxy and the logic on a network without parked copies', async () => {
    const result = expectSuccess(
      await runBuild(createRequest(), { store: { chainId: unparkedChainId } }),
    );
    const tx = transactionOf(result);
    const created = identityOf(await keyHashAt(0));
    expect(tx.body().toCore().referenceInputs).toBeUndefined();
    expect(tx.witnessSet().toCore().scripts).toEqual([
      version.accountValidator,
      currentLogic.script,
      created.stakeScript,
    ]);
    expect(result.resolvedInputs).toEqual([feeUtxo, collateralUtxo]);
  });

  it.each([
    ['Preprod, where the proxy and the logic are referenced', undefined],
    ['a network where they are attached', unparkedChainId],
  ])(
    'fits the size limit and the sponsor fee cap on %s, at the budgets upstream measured',
    async (_network, storeChainId) => {
      const { provider } = fakeProvider({ evaluate: evaluateLikeDevnet });
      const result = expectSuccess(
        await runBuild(createRequest(), {
          provider,
          store: storeChainId ? { chainId: storeChainId } : {},
        }),
      );
      const usage = assertWithinTransactionLimits(
        transactionOf(result),
        result.resolvedInputs,
        protocolParameters,
      );
      expect(usage.signedTxSize).toBeLessThanOrEqual(
        protocolParameters.maxTxSize,
      );
      expect(result.fee).toBeLessThanOrEqual(SPONSOR_MAX_FEE);
    },
  );

  it('prices the referenced scripts below attaching them', async () => {
    const referenced = expectSuccess(await runBuild(createRequest()));
    const attached = expectSuccess(
      await runBuild(createRequest(), { store: { chainId: unparkedChainId } }),
    );
    expect(referenced.fee).toBeLessThan(attached.fee);
  });

  describe('logic credential', () => {
    it('refuses before any other read when the logic credential is not registered', async () => {
      const { provider } = fakeProvider({
        logicRewardAccount: { isRegistered: false, withdrawableAmount: 0n },
      });
      expect(
        expectFailure(await runBuild(createRequest(), { provider })),
      ).toEqual({
        code: 'logic-not-registered',
        rewardAccount: logicRewardAccountOf(),
      });
      expect(provider.getRewardAccountInfo).toHaveBeenCalledTimes(1);
      expect(provider.getRewardAccountInfo).toHaveBeenCalledWith(
        { rewardAccount: logicRewardAccountOf() },
        { chainId: Cardano.ChainIds.Preprod },
      );
      expect(provider.evaluateTx).not.toHaveBeenCalled();
    });

    it('reads registration, not delegation: a logic delegated to no pool builds', async () => {
      const { provider } = fakeProvider({
        logicRewardAccount: {
          isRegistered: true,
          isActive: false,
          withdrawableAmount: 0n,
        },
      });
      expectSuccess(await runBuild(createRequest(), { provider }));
    });

    it('builds no creation the fee sponsor refuses for drawing a logic reward balance', async () => {
      // The sponsor refuses any draw from the logic credential; where a
      // draw goes when it builds is in custody-logic-draw.test.ts.
      const { provider } = fakeProvider({
        logicRewardAccount: {
          isRegistered: true,
          withdrawableAmount: 1_500_000n,
        },
      });
      expect(
        expectFailure(await runBuild(createRequest(), { provider })),
      ).toMatchObject({ code: 'sponsor-rules' });
    });

    it('reports a failed read of the logic credential as unavailable', async () => {
      const { provider } = fakeProvider();
      provider.getRewardAccountInfo.mockReturnValueOnce(
        of(Err(providerError('down'))) as never,
      );
      expect(
        expectFailure(await runBuild(createRequest(), { provider })),
      ).toMatchObject({
        code: 'unavailable',
        message: expect.stringContaining(
          'Custody logic reward account',
        ) as unknown,
      });
    });
  });

  it('moves past pre-registered creator indices without counting them', async () => {
    const { provider } = fakeProvider(
      await chainWith({ 0: 'pre-registered', 1: 'pre-registered' }),
    );
    const result = expectSuccess(await runBuild(createRequest(), { provider }));
    expect(result.creation?.creatorIndex).toBe(2);
    expect(
      transactionOf(result).body().toCore().requiredExtraSignatures,
    ).toEqual([await keyHashAt(2)]);
  });

  it('answers an existing account with its record instead of building', async () => {
    const { provider } = fakeProvider(
      await chainWith({ 0: 'pre-registered', 1: 'account' }),
    );
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toEqual({
      code: 'account-exists',
      creatorIndex: 1,
      record: createCustodyAccountRecord(identityOf(await keyHashAt(1))),
    });
  });

  it('starts the scan at the requested creator index', async () => {
    const { provider } = fakeProvider(await chainWith({ 0: 'account' }));
    const result = expectSuccess(
      await runBuild(
        createRequest({
          operation: {
            type: 'create',
            deviceAccountPublicKey: device.xpub,
            startIndex: 1,
          },
        }),
        { provider },
      ),
    );
    expect(result.creation?.creatorIndex).toBe(1);
  });

  it('gives up after the scan limit of pre-registered indices', async () => {
    const { provider } = fakeProvider({
      rewardAccount: () => ({ isRegistered: true, withdrawableAmount: 0n }),
    });
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toEqual({
      code: 'index-exhausted',
      startIndex: 0,
      scanned: CUSTODY_CREATION_SCAN_LIMIT,
    });
    // The logic credential, then every creator index.
    expect(provider.getRewardAccountInfo).toHaveBeenCalledTimes(
      1 + CUSTODY_CREATION_SCAN_LIMIT,
    );
  });

  it('refuses an invalid start index', async () => {
    const { provider } = fakeProvider();
    for (const startIndex of [
      -1,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      // The scan would reach the first hardened index.
      2 ** 31 - CUSTODY_CREATION_SCAN_LIMIT + 1,
    ]) {
      expect(
        expectFailure(
          await runBuild(
            createRequest({
              operation: {
                type: 'create',
                deviceAccountPublicKey: device.xpub,
                startIndex,
              },
            }),
            { provider },
          ),
        ),
      ).toEqual({
        code: 'invalid-operation',
        reason: 'invalid-start-index',
        message: `Invalid creator start index ${startIndex}`,
      });
    }
    expect(provider.getRewardAccountInfo).not.toHaveBeenCalled();
  });

  it('scans from the last start index that keeps the scan soft', async () => {
    const startIndex = 2 ** 31 - CUSTODY_CREATION_SCAN_LIMIT;
    const result = expectSuccess(
      await runBuild(
        createRequest({
          operation: {
            type: 'create',
            deviceAccountPublicKey: device.xpub,
            startIndex,
          },
        }),
      ),
    );
    expect(result.creation?.creatorIndex).toBe(startIndex);
  });

  it('refuses a device key that does not derive', async () => {
    expect(
      expectFailure(
        await runBuild(
          createRequest({
            operation: {
              type: 'create',
              deviceAccountPublicKey: `${'00'.repeat(31)}7f${'ab'.repeat(
                32,
              )}` as Crypto.Bip32PublicKeyHex,
            },
          }),
        ),
      ),
    ).toMatchObject({
      code: 'invalid-operation',
      reason: 'invalid-device-key',
    });
  });

  describe('control output headroom', () => {
    it('leaves what the sponsor limit allows as headroom above the initial state', async () => {
      const { provider } = fakeProvider({ evaluate: evaluateLikeDevnet });
      const result = expectSuccess(
        await runBuild(createRequest(), { provider }),
      );
      const { body, control } = creationOf(result);
      const minimum = minimumControlOf(await keyHashAt(0));

      // The numbers the creation build's comment states, at the budgets
      // upstream's devnet measured.
      expect(body.fee).toBe(486_317n);
      expect(control).toBe(3_413_683n);
      expect(minimum).toBe(1_586_080n);
    });

    it('keeps the initial minimum when the limit leaves no headroom', async () => {
      const minimum = minimumControlOf(await keyHashAt(0));
      const { fee } = creationOf(
        expectSuccess(await runBuild(createRequest())),
      ).body;
      const maxSponsoredLovelace = fee + DEPOSIT + minimum + 50_000n;
      const { control, drawn } = creationOf(
        expectSuccess(
          await runBuild(
            createRequest({ funding: feeFunding({ maxSponsoredLovelace }) }),
          ),
        ),
      );
      expect(control).toBe(minimum);
      expect(drawn).toBe(fee + DEPOSIT + minimum);
      expect(drawn).toBeLessThanOrEqual(maxSponsoredLovelace);
    });

    it('stays within what a small fee UTxO can fund', async () => {
      // Balancing prices the largest fee the execution estimate allows
      // before evaluation, so the fee UTxO must cover it, the deposit, the
      // control output and the change minimum.
      const smallFeeUtxo = utxo(905, {
        address: sponsorAddress,
        value: { coins: 7_000_000n },
      });
      const { control, drawn, body } = creationOf(
        expectSuccess(
          await runBuild(
            createRequest({ funding: feeFunding({ feeUtxo: smallFeeUtxo }) }),
          ),
        ),
      );
      const fundableAt = (seed: Cardano.ExUnits) =>
        smallFeeUtxo[1].value.coins -
        changeReserveAt(sponsorAddress, protocolParameters.coinsPerUtxoByte) -
        DEPOSIT -
        preEvaluationFeeBound(protocolParameters, seed);
      expect(control).toBe(
        fundableAt(
          estimateWithinLimit(
            custodyExecutionEstimate({
              createAccount: 1,
              operate: 1,
              logic: 'arrival',
            }),
            protocolParameters.maxExecutionUnitsPerTransaction,
          ),
        ),
      );
      // Pricing the per-transaction limit instead would lock less.
      expect(control).toBeGreaterThan(
        fundableAt(protocolParameters.maxExecutionUnitsPerTransaction),
      );
      expect(control).toBeLessThan(
        MAX_SPONSORED - DEPOSIT - body.fee - SPONSOR_MARGIN,
      );
      expect(drawn).toBe(body.fee + DEPOSIT + control);
    });

    it('settles the control lovelace on a fee that moved after the first build', async () => {
      // The second and third builds measure higher than the first, so the
      // fee grows by more than the margin and a third build settles the
      // control output. Both measure above the execution estimate, so each
      // is reseeded once: three evaluations where the first build has two.
      const { evaluate, builds } = evaluatePerBuild([
        { memory: 300_000, steps: 100_000_000 },
        { memory: 2_000_000, steps: 1_500_000_000 },
      ]);
      const { provider, evaluated } = fakeProvider({ evaluate });
      const { body, control, drawn } = creationOf(
        expectSuccess(await runBuild(createRequest(), { provider })),
      );
      expect(builds).toHaveLength(3);
      expect(evaluated).toHaveLength(2 + 3 + 3);
      expect(control).toBe(MAX_SPONSORED - DEPOSIT - body.fee - SPONSOR_MARGIN);
      expect(drawn).toBe(MAX_SPONSORED - SPONSOR_MARGIN);
    });

    it('gives up when the fee keeps growing past the limit', async () => {
      // Every build measures higher than the one before it, by more than the
      // margin, so no build's control lovelace fits its own fee.
      const { evaluate, builds } = evaluatePerBuild([
        { memory: 300_000, steps: 100_000_000 },
        { memory: 2_000_000, steps: 1_500_000_000 },
        { memory: 4_000_000, steps: 3_000_000_000 },
      ]);
      const { provider } = fakeProvider({ evaluate });
      const failure = expectFailure(
        await runBuild(createRequest(), { provider }),
      );
      expect(failure).toMatchObject({
        code: 'sponsor-limit',
        maxSponsoredLovelace: MAX_SPONSORED,
      });
      expect(builds).toHaveLength(3);
    });
  });

  it('refuses a draw above what the lease sponsors', async () => {
    expect(
      expectFailure(
        await runBuild(
          createRequest({
            funding: feeFunding({ maxSponsoredLovelace: 3_000_000n }),
          }),
        ),
      ),
    ).toMatchObject({
      code: 'sponsor-limit',
      maxSponsoredLovelace: 3_000_000n,
    });
  });

  it('refuses a funding window that has already closed', async () => {
    const validUntil = Date.now() - 1000;
    expect(
      expectFailure(
        await runBuild(createRequest({ funding: feeFunding({ validUntil }) })),
      ),
    ).toEqual({ code: 'validity-window', validUntil });
  });

  it('refuses a funding window without a finite end', async () => {
    expect(
      expectFailure(
        await runBuild(
          createRequest({ funding: feeFunding({ validUntil: Number.NaN }) }),
        ),
      ),
    ).toMatchObject({ code: 'validity-window' });
  });

  it('fails with the provider message when a script fails', async () => {
    const { provider } = fakeProvider({
      evaluate: () => new Error('CreateAccount failed'),
    });
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toEqual({
      code: 'script-evaluation-failed',
      message: expect.stringContaining('CreateAccount failed') as unknown,
    });
  });

  it('fails when the provider leaves a redeemer unevaluated', async () => {
    const { provider } = fakeProvider({ evaluate: () => [] });
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toMatchObject({ code: 'script-evaluation-failed' });
  });

  it('refuses a collateral UTxO too small for the collateral', async () => {
    expect(
      expectFailure(
        await runBuild(
          createRequest({
            funding: feeFunding({
              collateralUtxo: utxo(903, {
                address: sponsorAddress,
                value: { coins: 1_000_000n },
              }),
            }),
          }),
        ),
      ),
    ).toMatchObject({ code: 'collateral-insufficient' });
  });

  it('refuses a fee UTxO that cannot pay the creation', async () => {
    expect(
      expectFailure(
        await runBuild(
          createRequest({
            funding: feeFunding({
              feeUtxo: utxo(904, {
                address: sponsorAddress,
                value: { coins: 3_000_000n },
              }),
            }),
          }),
        ),
      ),
    ).toMatchObject({ code: 'insufficient-funds' });
  });

  it('reports a failed read of a creator reward account as unavailable', async () => {
    const { provider } = fakeProvider();
    provider.getRewardAccountInfo
      .mockImplementationOnce(
        provider.getRewardAccountInfo.getMockImplementation()!,
      )
      .mockReturnValue(of(Err(providerError('down'))) as never);
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toMatchObject({
      code: 'unavailable',
      message: expect.stringContaining('Custody reward account') as unknown,
    });
  });

  it('reports an identity the chain id cannot carry as unavailable', async () => {
    expect(
      expectFailure(
        await runBuild(createRequest(), {
          store: {
            chainId: {
              networkId: Cardano.NetworkId.Testnet,
              networkMagic: Cardano.NetworkMagics.Mainnet,
            },
          },
        }),
      ),
    ).toMatchObject({ code: 'unavailable' });
  });

  it('raises a budget the final transaction measures above its declaration', async () => {
    let calls = 0;
    const { provider } = fakeProvider({
      // Drafts measure low and final transactions high, within the
      // execution estimate. The creation is built twice, the second time
      // with its control lovelace settled, and each build evaluates a draft
      // and a final transaction twice.
      evaluate: tx => {
        calls++;
        return evaluateAll(
          calls % 2 === 0
            ? { memory: 400_000, steps: 150_000_000 }
            : { memory: 300_000, steps: 100_000_000 },
        )(tx);
      },
    });
    const result = expectSuccess(await runBuild(createRequest(), { provider }));
    expect(calls).toBe(8);
    expect(
      transactionOf(result)
        .witnessSet()
        .redeemers()
        ?.toCore()
        .map(({ executionUnits }) => executionUnits),
    ).toEqual([
      { memory: 440_000, steps: 165_000_000 },
      { memory: 440_000, steps: 165_000_000 },
      { memory: 440_000, steps: 165_000_000 },
    ]);
  });

  it('gives up when the final transaction keeps measuring above its budgets', async () => {
    let measured = 300_000;
    const { provider } = fakeProvider({
      evaluate: tx => {
        measured = Math.ceil(measured * 1.5);
        return evaluateAll({ memory: measured, steps: 100_000_000 })(tx);
      },
    });
    expect(
      expectFailure(await runBuild(createRequest(), { provider })),
    ).toMatchObject({ code: 'script-evaluation-failed' });
  });
});
