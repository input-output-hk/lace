import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import {
  mergeVkeyWitnesses,
  verifyVkeyWitnesses,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import {
  CardanoCustodyAgentWitnessError,
  CardanoCustodyBuildFailedError,
  CardanoCustodyFundContentionError,
  CardanoCustodyGrantSpendError,
  CardanoCustodyLogicNotServedError,
  CardanoCustodyOperationInProgressError,
  CardanoCustodyStaleControlError,
  CardanoCustodyStaleGrantError,
} from '../../src/custody/cardano-custody-errors';
import {
  buildCardanoCustodyGrantSpend,
  submitCardanoCustodyGrantSpend,
} from '../../src/custody/cardano-custody-grant-spend';
import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import { vkeyWitnessSetOf } from '../../src/custody/cardano-custody-witnesses';

import {
  agentGrant,
  agentGrantUtxo,
  agentKey,
  buildResultOf,
  controlOutput,
  createCustodyTestWallet,
  fundUtxo,
  grantedControl,
  grantedState,
  grantOutput,
  grantSpendShape,
  grantUtxo,
  identity,
  issueGrantShape,
  liveControl,
  otherAgentKey,
  payout,
  preprodEraSummaries,
  RECIPIENT_ADDRESS,
  record,
  sponsorCollateral,
  sponsorKey,
  strangerKey,
  utxo,
} from './custody-fixtures';
import { collateral, createSponsorFake, NOW } from './custody-sponsor-fake';

import type { requestCardanoCustodyBuild } from '../../src/custody/request-cardano-custody-build';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
} from '@lace-contract/cardano-context';

type CardanoCustodyBuildOutcome = Awaited<
  ReturnType<typeof requestCardanoCustodyBuild>
>;

const outputs: Cardano.TxOut[] = [
  { address: RECIPIENT_ADDRESS, value: { coins: 2_000_000n } },
];

const grantSpend = buildResultOf(grantSpendShape());
const AGENT = agentKey.keyHash;
const OTHER_AGENT = otherAgentKey.keyHash;

/** The body inputs of the fixture spend, as the build holds them. */
const spendInputs = [
  { txId: agentGrantUtxo[0].txId, index: agentGrantUtxo[0].index },
  { txId: fundUtxo[0].txId, index: fundUtxo[0].index },
];

const setup = async () => {
  const test = createCustodyTestWallet();
  const { sponsor, calls } = createSponsorFake();
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    name: 'Agent view',
  });
  test.settledUtxos$.next({
    [accountId]: [grantedControl, agentGrantUtxo, fundUtxo],
  });
  test.control.answerBuild = () => ({ ok: true, result: grantSpend });
  const build = async (
    grantee: Ed25519KeyHashHex = AGENT,
    extra: { slot?: bigint; feeBound?: bigint } = {},
  ) =>
    buildCardanoCustodyGrantSpend(test.wallet, {
      accountId,
      grantee,
      outputs,
      sponsor,
      ...extra,
    });
  const submit = async (
    agentWitness = agentKey.witnessOver(grantSpend.bodyHash),
    transaction = HexBlob(grantSpend.transaction),
    extra: { reference?: string } = {},
  ) =>
    submitCardanoCustodyGrantSpend(test.wallet, {
      accountId,
      transaction,
      agentWitness,
      sponsor,
      ...extra,
    });
  return { ...test, accountId, sponsor, calls, build, submit };
};

describe('buildCardanoCustodyGrantSpend', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds the grantee's spend for an observer on the sponsor collateral", async () => {
    const { build, accountId, builds } = await setup();

    const built = await build();

    expect(built.unwrap()).toEqual({
      transaction: grantSpend.transaction,
      bodyHash: grantSpend.bodyHash,
      fee: grantSpend.fee,
      invalidHereafter: grantSpend.invalidHereafter,
    });
    expect(builds[0]).toEqual({
      requestId: expect.any(String) as unknown,
      accountId,
      operation: { type: 'grant-spend', grantee: AGENT, outputs },
      funding: {
        mode: 'collateral',
        collateralUtxo: sponsorCollateral,
        sponsorAddress: collateral.sponsorAddress,
        validUntil: NOW + 540_000,
      },
    });
  });

  it('passes the slot and the fee bound when given, and the grantee in lower case', async () => {
    const { build, builds } = await setup();

    await build(AGENT.toUpperCase() as Ed25519KeyHashHex, {
      slot: 0n,
      feeBound: 1_000_000n,
    });

    expect(builds[0].operation).toEqual({
      type: 'grant-spend',
      grantee: AGENT,
      outputs,
      slot: 0n,
      feeBound: 1_000_000n,
    });
  });

  it('waits for the era summaries the build reads', async () => {
    const { build, sponsor, eraSummaries$ } = await setup();
    eraSummaries$.next(undefined);

    const building = build();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sponsor.collateral).not.toHaveBeenCalled();
    eraSummaries$.next(preprodEraSummaries);

    expect((await building).isOk()).toBe(true);
  });

  it.each<[string, CardanoCustodyBuildError, Error]>([
    [
      'a dead grant',
      {
        code: 'grant-spend',
        reason: 'dead-grant',
        slot: 0n,
        liveness: 'revoked',
      },
      new CardanoCustodyGrantSpendError('dead-grant', {
        slot: 0n,
        liveness: 'revoked',
      }),
    ],
    [
      'an ambiguous grantee',
      {
        code: 'grant-spend',
        reason: 'ambiguous-grant',
        grantee: AGENT,
        slots: [0n, 1n],
      },
      new CardanoCustodyGrantSpendError('ambiguous-grant', {
        grantee: AGENT,
        slots: [0n, 1n],
      }),
    ],
    [
      'a fee above the bound',
      { code: 'grant-spend', reason: 'fee-above-bound', fee: 2n, feeBound: 1n },
      new CardanoCustodyGrantSpendError('fee-above-bound', {
        fee: 2n,
        feeBound: 1n,
      }),
    ],
  ])('maps %s to its reason', async (_, error, expected) => {
    const { build, control } = await setup();
    control.answerBuild = () => ({ ok: false, error });

    const built = await build();

    expect(built.isErr() && built.error).toEqual(expected);
  });

  it('refuses a sponsor address that holds no payment key before building', async () => {
    const { build, sponsor, builds } = await setup();
    sponsor.collateral.mockResolvedValue({
      ...collateral,
      sponsorAddress: record.address,
    });

    const built = await build();

    expect(built.isErr() && built.error).toBeInstanceOf(
      CardanoCustodyBuildFailedError,
    );
    expect(builds).toEqual([]);
  });

  it('refuses while a submitted owner operation has not settled, before asking the sponsor', async () => {
    const { build, accountId, sponsor, settledUtxos$, activities$ } =
      await setup();
    settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });
    activities$.next({
      [accountId]: [
        {
          accountId,
          activityId: 'pending',
          timestamp: NOW as never,
          tokenBalanceChanges: [],
          type: ActivityType.Pending,
          blockchainSpecific: {
            Cardano: {
              consumedInputs: [liveControl[0]],
              producedOutputs: [
                [{ txId: 'ab'.repeat(32), index: 0 }, grantedControl[1]],
              ],
            },
          },
        },
      ],
    });

    const built = await build();

    expect(built.isErr() && built.error).toMatchObject({
      code: 'custody-operation-in-progress',
    });
    expect(sponsor.collateral).not.toHaveBeenCalled();
  });

  describe('spends of other grants built side by side', () => {
    it('leave out the funds a spend of another grantee holds', async () => {
      const { build, builds } = await setup();

      await build(AGENT);
      await build(OTHER_AGENT);

      expect(builds[0].operation).not.toHaveProperty('excludedInputs');
      expect(builds[1].operation).toMatchObject({
        excludedInputs: spendInputs,
      });
    });

    it('do not leave out the funds of the same grantee, whose new spend replaces the old', async () => {
      const { build, builds } = await setup();

      await build(AGENT);
      await build(AGENT);
      await build(OTHER_AGENT);

      expect(builds[1].operation).not.toHaveProperty('excludedInputs');
      expect(builds[2].operation).toMatchObject({
        excludedInputs: spendInputs,
      });
    });

    it('use the funds again once the held spend can no longer be included', async () => {
      const { build, builds } = await setup();
      await build(AGENT);

      vi.setSystemTime(NOW + 540_000);
      await build(OTHER_AGENT);

      expect(builds[1].operation).not.toHaveProperty('excludedInputs');
    });

    it('use the funds again once the held spend is submitted', async () => {
      const { build, submit, builds } = await setup();
      await build(AGENT);
      expect((await submit()).isOk()).toBe(true);

      await build(OTHER_AGENT);

      expect(builds[1].operation).not.toHaveProperty('excludedInputs');
    });

    it('keep the hold while the agent may submit the same spend again', async () => {
      const { build, submit, builds } = await setup();
      await build(AGENT);
      await submit(strangerKey.witnessOver(grantSpend.bodyHash));

      await build(OTHER_AGENT);

      expect(builds[1].operation).toMatchObject({
        excludedInputs: spendInputs,
      });
    });

    describe('at once', () => {
      const otherGrantUtxo = grantUtxo({
        ...agentGrant,
        slot: 1n,
        grantee: HexBlob(OTHER_AGENT),
      });
      const secondFund = utxo(0x12, payout(10_000_000n, identity.address));
      const keyOf = ({ txId, index }: Cardano.TxIn) => `${txId}#${index}`;

      const spendOf = (grantee: string, fund: Cardano.Utxo) => {
        const grantInput = grantee === AGENT ? agentGrantUtxo : otherGrantUtxo;
        return buildResultOf({
          ...grantSpendShape(),
          inputs: [grantInput, fund],
          spendRedeemers: [
            { spent: grantInput, redeemer: { kind: 'spendWithGrant' } },
            { spent: fund, redeemer: { kind: 'fund' } },
          ],
        });
      };

      /** Answers each build with a spend of the first fund it may take. */
      const answerWithFreeFund =
        (failFor?: string) =>
        (request: CardanoCustodyBuildRequest): CardanoCustodyBuildOutcome => {
          const operation = request.operation as Extract<
            CardanoCustodyAccountOperation,
            { type: 'grant-spend' }
          >;
          if (operation.grantee === failFor) {
            return {
              ok: false,
              error: { code: 'unavailable', message: 'provider down' },
            };
          }
          const excluded = new Set((operation.excludedInputs ?? []).map(keyOf));
          const fund = [fundUtxo, secondFund].find(
            ([input]) => !excluded.has(keyOf(input)),
          );
          if (!fund) throw new Error('Every fund is held');
          return { ok: true, result: spendOf(operation.grantee, fund) };
        };

      const inputKeysOf = (transaction: string) =>
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(transaction))
          .body()
          .toCore()
          .inputs.map(keyOf)
          .sort();

      it('take disjoint funds, the later build leaving out what the earlier holds', async () => {
        const { build, builds, control } = await setup();
        control.answerBuild = answerWithFreeFund();

        const [first, second] = await Promise.all([
          build(AGENT),
          build(OTHER_AGENT),
        ]);

        const firstInputs = inputKeysOf(first.unwrap().transaction);
        const secondInputs = inputKeysOf(second.unwrap().transaction);
        expect(firstInputs.filter(key => secondInputs.includes(key))).toEqual(
          [],
        );
        expect(builds[0].operation).not.toHaveProperty('excludedInputs');
        const [, { operation }] = builds;
        expect(
          'excludedInputs' in operation &&
            operation.excludedInputs?.map(keyOf).sort(),
        ).toEqual(firstInputs);
      });

      it('leave out nothing of a build of another grantee that failed', async () => {
        const { build, builds, control } = await setup();
        control.answerBuild = answerWithFreeFund(AGENT);

        const [failed, other] = await Promise.all([
          build(AGENT),
          build(OTHER_AGENT),
        ]);

        expect(failed.isErr()).toBe(true);
        expect(other.isOk()).toBe(true);
        expect(builds[1].operation).not.toHaveProperty('excludedInputs');
      });

      it('go on once the build request of another grantee throws', async () => {
        const { build, builds, control } = await setup();
        const answer = answerWithFreeFund();
        control.answerBuild = request => {
          if (
            'grantee' in request.operation &&
            request.operation.grantee === AGENT
          ) {
            throw new Error('module crashed');
          }
          return answer(request);
        };

        const [failed, other] = await Promise.all([
          build(AGENT),
          build(OTHER_AGENT),
        ]);

        expect(failed.isErr()).toBe(true);
        expect(other.isOk()).toBe(true);
        expect(builds[1].operation).not.toHaveProperty('excludedInputs');
      });
    });

    it("keep a grantee's held spend when its next build fails", async () => {
      const { build, builds, control } = await setup();
      await build(AGENT);
      control.answerBuild = () => ({
        ok: false,
        error: { code: 'unavailable', message: 'provider down' },
      });
      await build(AGENT);

      control.answerBuild = () => ({ ok: true, result: grantSpend });
      await build(OTHER_AGENT);

      expect(builds[2].operation).toMatchObject({
        excludedInputs: spendInputs,
      });
    });

    it('run together for different grantees, one at a time for one grantee', async () => {
      const { build, accountId } = await setup();

      const [first, second, other] = await Promise.all([
        build(AGENT),
        build(AGENT),
        build(OTHER_AGENT),
      ]);

      expect(first.isOk()).toBe(true);
      expect(second.isErr() && second.error).toEqual(
        new CardanoCustodyOperationInProgressError(accountId),
      );
      expect(other.isOk()).toBe(true);
    });
  });
});

describe('submitCardanoCustodyGrantSpend', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies the agent witness, then has the sponsor sign, and submits both witnesses', async () => {
    const { submit, calls, submitted, activities$, accountId } = await setup();

    const result = await submit();

    expect(result.unwrap()).toEqual({
      txId: grantSpend.bodyHash,
      invalidHereafter: grantSpend.invalidHereafter,
    });
    expect(calls).toEqual(['collateral', 'signCollateral']);
    const signed = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(submitted[0]),
    );
    const vkeys = (signed.witnessSet().vkeys()?.toCore() ?? []).map(
      ([vkey, signature]) => ({ vkey, signature }),
    );
    const { valid, invalid } = await verifyVkeyWitnesses(signed.getId(), vkeys);
    expect(invalid).toEqual([]);
    expect([...valid.keys()].sort()).toEqual(
      [agentKey.keyHash, sponsorKey.keyHash].sort(),
    );
    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        activityId: grantSpend.bodyHash,
        blockchainSpecific: {
          Cardano: expect.objectContaining({
            consumedInputs: spendInputs,
            custody: {
              invalidHereafter: grantSpend.invalidHereafter,
              operation: 'grant-spend',
              status: 'pending',
            },
          }) as unknown,
        },
      }),
    ]);
  });

  it('keeps the app reference on the pending activity', async () => {
    const { submit, activities$, accountId } = await setup();

    await submit(undefined, undefined, { reference: 'intent-42' });

    expect(activities$.value[accountId]).toEqual([
      expect.objectContaining({
        blockchainSpecific: {
          Cardano: expect.objectContaining({
            custody: expect.objectContaining({
              reference: 'intent-42',
            }) as unknown,
          }) as unknown,
        },
      }),
    ]);
  });

  it('waits for the era summaries the grantee check reads', async () => {
    const { submit, sponsor, eraSummaries$ } = await setup();
    eraSummaries$.next(undefined);

    const submitting = submit();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sponsor.collateral).not.toHaveBeenCalled();
    eraSummaries$.next(preprodEraSummaries);

    expect((await submitting).isOk()).toBe(true);
  });

  it('accepts the agent witness in upper-case hex', async () => {
    const { submit } = await setup();
    const { vkey, signature } = agentKey.witnessOver(grantSpend.bodyHash);

    const result = await submit({
      vkey: vkey.toUpperCase(),
      signature: signature.toUpperCase(),
    } as never);

    expect(result.isOk()).toBe(true);
  });

  it.each([
    [
      'a witness by a key other than the grantee',
      () => strangerKey.witnessOver(grantSpend.bodyHash),
      'unexpected-key',
    ],
    [
      'a signature over another body',
      () => agentKey.witnessOver(buildResultOf(issueGrantShape()).bodyHash),
      'invalid-signature',
    ],
    [
      'a witness of the wrong size',
      () => ({ vkey: 'ab', signature: 'cd' }),
      'malformed',
    ],
  ])('refuses %s before the sponsor signs', async (_, witness, reason) => {
    const { submit, sponsor, submitted } = await setup();

    const result = await submit(witness() as never);

    expect(result.isErr() && result.error).toEqual(
      new CardanoCustodyAgentWitnessError(reason as never),
    );
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
  });

  it('refuses a reference over 200 characters before any sponsor request', async () => {
    const { submit, sponsor, submitted } = await setup();

    const result = await submit(undefined, undefined, {
      reference: 'x'.repeat(201),
    });

    expect(result.isErr() && result.error).toMatchObject({
      reason: 'reference-too-long',
      detail: { length: 201, limit: 200 },
    });
    expect(sponsor.collateral).not.toHaveBeenCalled();
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
  });

  it('accepts a reference of 200 characters', async () => {
    const { submit } = await setup();

    const result = await submit(undefined, undefined, {
      reference: 'x'.repeat(200),
    });

    expect(result.isOk()).toBe(true);
  });

  it('refuses a spend built on collateral the sponsor has replaced', async () => {
    const { submit, sponsor } = await setup();
    sponsor.collateral.mockResolvedValue({
      ...collateral,
      collateralUtxo: [
        { ...sponsorCollateral[0], index: 1 },
        sponsorCollateral[1],
      ],
    });

    const result = await submit();

    expect(result.isErr() && result.error).toEqual(
      new CardanoCustodyGrantSpendError('collateral-changed'),
    );
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
  });

  describe('names the input that left the wallet’s view, before the sponsor signs', () => {
    it.each([
      [
        'a control UTxO an owner operation replaced',
        [utxo(0x12, controlOutput(grantedState)), agentGrantUtxo, fundUtxo],
        new CardanoCustodyStaleControlError(),
      ],
      [
        'a grant UTxO another spend took',
        [grantedControl, fundUtxo],
        new CardanoCustodyStaleGrantError(),
      ],
      [
        'a fund UTxO another transaction took',
        [grantedControl, agentGrantUtxo],
        new CardanoCustodyFundContentionError([spendInputs[1]]),
      ],
    ])('%s', async (_, settled, expected) => {
      const { submit, settledUtxos$, accountId, sponsor } = await setup();
      settledUtxos$.next({ [accountId]: settled });

      const result = await submit();

      expect(result.isErr() && result.error).toEqual(expected);
      expect(result.isErr() && result.error.constructor).toBe(
        expected.constructor,
      );
      expect(sponsor.signCollateral).not.toHaveBeenCalled();
    });
  });

  it('resolves the inputs the build read from the chain before the wallet synced them', async () => {
    const { build, submit, settledUtxos$, accountId } = await setup();
    await build();
    settledUtxos$.next({ [accountId]: [grantedControl, agentGrantUtxo] });

    const result = await submit();

    expect(result.isOk()).toBe(true);
  });

  describe('answers a sponsor refusal that means an input left the chain', () => {
    const refusal = (rule: string, detail: string) =>
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
        rule,
        detail,
      });

    it.each([
      [
        'a replaced control UTxO',
        refusal(
          'account_transaction',
          `Input ${agentGrantUtxo[0].txId}#0 is a grant UTxO of account ${record.stakeScriptHash}, whose control UTxO is neither spent nor referenced`,
        ),
        new CardanoCustodyStaleControlError(),
      ],
      [
        'a spent grant UTxO',
        refusal(
          'account_transaction',
          `Reference input ${grantedControl[0].txId}#0 is the control UTxO of account ${record.stakeScriptHash}, which no input operates`,
        ),
        new CardanoCustodyStaleGrantError(0n),
      ],
      [
        'a spent fund UTxO',
        refusal(
          'evaluates',
          `Input ${fundUtxo[0].txId}#0 is not an unspent output the chain knows`,
        ),
        new CardanoCustodyFundContentionError([spendInputs[1]]),
      ],
      [
        'a spent fund UTxO reported before evaluation',
        refusal(
          'no_sponsor_value_elsewhere',
          'Outputs exceed the non-sponsor inputs',
        ),
        new CardanoCustodyFundContentionError([spendInputs[1]]),
      ],
    ])('%s', async (_, sponsorRefusal, expected) => {
      const { submit, sponsor, submitted } = await setup();
      sponsor.signCollateral.mockRejectedValueOnce(sponsorRefusal);

      const result = await submit();

      expect(result.isErr() && result.error).toEqual(expected);
      expect(submitted).toEqual([]);
    });

    it('answers a refusal of the logic the spend runs with its typed error', async () => {
      const { submit, sponsor, submitted } = await setup();
      sponsor.signCollateral.mockRejectedValueOnce(
        refusal(
          'known_logic',
          `The control UTxO ${grantedControl[0].txId}#0 of account ${
            record.stakeScriptHash
          } names logic ${'ab'.repeat(
            28,
          )}, which is not one of the logic scripts the service knows`,
        ),
      );

      const result = await submit();

      expect(result.isErr() && result.error).toBeInstanceOf(
        CardanoCustodyLogicNotServedError,
      );
      expect(submitted).toEqual([]);
    });

    it('passes any other refusal through', async () => {
      const { submit, sponsor } = await setup();
      const other = refusal('signers', 'A required signer is the sponsor');
      sponsor.signCollateral.mockRejectedValueOnce(other);

      const result = await submit();

      expect(result.isErr() && result.error).toBe(other);
    });
  });

  it('answers a node refusal of the spent grant UTxO with the stale grant', async () => {
    const { submit, control, activities$, accountId } = await setup();
    control.answerSubmit = () => ({
      error: `BadInputsUTxO (fromList [TxIn (TxId {unTxId = SafeHash "${agentGrantUtxo[0].txId}"}) (TxIx 0)])`,
    });

    const result = await submit();

    expect(result.isErr() && result.error).toEqual(
      new CardanoCustodyStaleGrantError(0n),
    );
    expect(activities$.value[accountId]).toBeUndefined();
  });

  it('refuses an owner operation presented as a grant spend', async () => {
    const { submit, settledUtxos$, accountId, sponsor } = await setup();
    settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });
    const issued = buildResultOf(issueGrantShape());

    const result = await submit(
      agentKey.witnessOver(issued.bodyHash),
      HexBlob(issued.transaction),
    );

    expect(result.isErr()).toBe(true);
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
  });

  it('refuses a spend whose inputs a submitted spend has not settled', async () => {
    const { submit, submitted, activities$, accountId, sponsor } =
      await setup();
    await submit();
    sponsor.collateral.mockClear();
    expect(activities$.value[accountId]).toHaveLength(1);

    const again = await submit();

    expect(again.isErr() && again.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(sponsor.signCollateral).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveLength(1);
  });

  it('refuses a spend the contract would refuse, before the sponsor signs', async () => {
    const { submit, sponsor } = await setup();
    const shape = grantSpendShape();
    // The recreated grant keeps its cap, so the spend outflows past it.
    const raised = buildResultOf({
      ...shape,
      outputs: [grantOutput(agentGrant), ...shape.outputs.slice(1)],
    });

    const result = await submit(
      agentKey.witnessOver(raised.bodyHash),
      HexBlob(raised.transaction),
    );

    expect(result.isErr() && result.error).toMatchObject({
      reason: { code: 'inspection-refused' },
    });
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
  });

  it('answers a transaction that does not decode as an error', async () => {
    const { submit, sponsor } = await setup();

    const result = await submit(
      agentKey.witnessOver(grantSpend.bodyHash),
      HexBlob('00'),
    );

    expect(result.isErr()).toBe(true);
    expect(sponsor.collateral).not.toHaveBeenCalled();
  });

  it('refuses a spend with no validity upper bound', async () => {
    const { submit, sponsor } = await setup();
    const unbounded = buildResultOf({
      ...grantSpendShape(),
      body: { validityInterval: {} },
    });

    const result = await submit(
      agentKey.witnessOver(unbounded.bodyHash),
      HexBlob(unbounded.transaction),
    );

    expect(result.isErr() && result.error).toMatchObject({
      reason: 'unknown-operation',
    });
    expect(sponsor.collateral).not.toHaveBeenCalled();
  });

  it('refuses a sponsor address that holds no payment key', async () => {
    const { submit, sponsor, submitted } = await setup();
    sponsor.collateral.mockResolvedValue({
      ...collateral,
      sponsorAddress: record.address,
    });

    const result = await submit();

    expect(result.isErr() && result.error).toEqual(
      new CardanoCustodyBuildFailedError({
        code: 'build-failed',
        message: 'The sponsor address has no payment key',
      }),
    );
    expect(sponsor.signCollateral).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
  });

  it.each([
    ['a witness by another key', () => strangerKey],
    ['the agent witness itself', () => agentKey],
  ])(
    'refuses a transaction that already carries %s, before the sponsor signs',
    async (_, key) => {
      const { submit, sponsor, submitted } = await setup();
      const witnessed = HexBlob(
        mergeVkeyWitnesses(HexBytes(grantSpend.transaction), [
          key().witnessOver(grantSpend.bodyHash),
        ]),
      );

      const result = await submit(
        agentKey.witnessOver(grantSpend.bodyHash),
        witnessed,
      );

      expect(result.isErr() && result.error).toEqual(
        new CardanoCustodyGrantSpendError('transaction-witnessed'),
      );
      expect(sponsor.collateral).not.toHaveBeenCalled();
      expect(sponsor.signCollateral).not.toHaveBeenCalled();
      expect(submitted).toEqual([]);
    },
  );

  it('refuses a second submission by the grantee while the first runs', async () => {
    const { submit, sponsor, submitted, accountId } = await setup();

    const [first, second] = await Promise.all([submit(), submit()]);

    expect(first.isOk()).toBe(true);
    expect(second.isErr() && second.error).toEqual(
      new CardanoCustodyOperationInProgressError(accountId),
    );
    expect(sponsor.signCollateral).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveLength(1);
  });

  it('refuses a sponsor witness by another key', async () => {
    const { submit, sponsor, submitted } = await setup();
    sponsor.signCollateral.mockResolvedValueOnce(
      vkeyWitnessSetOf([strangerKey.witnessOver(grantSpend.bodyHash)]),
    );

    const result = await submit();

    expect(result.isErr() && result.error).toMatchObject({
      signer: 'sponsor',
      reason: 'unexpected-key',
    });
    expect(submitted).toEqual([]);
  });
});
