import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  addCustodyDevice,
  encodeCustodyAccountState,
  encodeCustodyMintRedeemer,
  inspectCustodyTransaction,
  revokeCustodyGrant,
} from '../src';

import {
  buildTransaction,
  controlOutput,
  device,
  DEVICE_ADDRESS,
  deviceRewrite,
  fund,
  fundOutput,
  grantOutput,
  grantSweep,
  grantToken,
  identity,
  inspectionOptions,
  otherIdentity,
  payout,
  SPONSOR_ADDRESS,
  sponsorFee,
  STRANGER_ADDRESS,
  utxo,
} from './custody-transactions';
import {
  fixtureGrants,
  grantedState,
  LOGIC_HASH,
  OTHER_DEVICE_KEY,
  OWNER_KEY,
  STRANGER_KEY,
  TOKEN_NAME,
  TOKEN_POLICY,
  tokenScope,
} from './fixtures';

import type {
  CustodyAccountState,
  CustodyResult,
  CustodyTransactionInspection,
} from '../src';
import type { TransactionShape } from './custody-transactions';
import type { CustodyInspectionOptions } from '../src/analysis/inspect';

const FEE = 200_000n;
const TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${TOKEN_NAME}`);

const inspect = (
  shape: TransactionShape,
  overrides: Partial<CustodyInspectionOptions> = {},
): CustodyTransactionInspection => {
  const { transaction, resolvedInputs } = buildTransaction(shape);
  const result = inspectCustodyTransaction(
    transaction,
    resolvedInputs,
    inspectionOptions(overrides),
  );
  if (!result.ok) {
    throw new Error(
      `Unexpected refusals: ${result.error.refusals
        .map(({ code, reason }) => `${code}/${reason}`)
        .join(', ')}`,
    );
  }
  return result.value;
};

const operationsOf = (inspection: CustodyTransactionInspection) => {
  expect(inspection.accounts).toHaveLength(1);
  return inspection.accounts[0].operations;
};

const transition = <T>(result: CustodyResult<T, unknown>): T => {
  if (!result.ok) throw new Error('Unexpected failure');
  return result.value;
};

const funds = utxo(0x11, fundOutput(20_000_000n));

/**
 * An owner operation in collateral mode: the account pays the fee from a
 * 20 tADA fund UTxO, and any payments beside its change.
 */
const accountPaid = (
  after: CustodyAccountState,
  {
    before = grantedState,
    payments = [],
    changes = {},
  }: {
    before?: CustodyAccountState;
    payments?: readonly Cardano.TxOut[];
    changes?: Partial<TransactionShape>;
  } = {},
): TransactionShape => {
  const shape = deviceRewrite(before, after);
  const [control] = shape.inputs;
  const paid = payments.reduce((total, { value }) => total + value.coins, 0n);
  return {
    ...shape,
    inputs: [control, funds],
    spendRedeemers: [device(control), fund(funds)],
    outputs: [
      controlOutput(after),
      ...payments,
      fundOutput(20_000_000n - FEE - paid),
    ],
    ...changes,
  };
};

const issuedGrant = {
  slot: 3n,
  grantee: STRANGER_KEY,
  generation: 0n,
  scope: tokenScope(),
};

const ADDED = { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] };
const ACCOUNT_PAYS_ALL = {
  payers: [],
  externalShare: 0n,
  accountShare: FEE,
};

describe('fee shares and owner spends', () => {
  it.each([
    {
      name: 'an issued grant, its lovelace staying at the account',
      after: { ...grantedState, nextSlot: 4n, outstanding: 4n },
      options: {
        payments: [grantOutput(issuedGrant)],
        changes: {
          mint: new Map([[grantToken(3n), 1n]]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
        },
      },
      operations: [{ kind: 'issue-grant', slot: 3n }],
    },
    {
      name: 'a revoked grant',
      after: transition(revokeCustodyGrant(grantedState, 1n, fixtureGrants)),
      options: {},
      operations: [{ kind: 'revoke-grant', slot: 1n }],
    },
    {
      name: 'an added device',
      after: transition(
        addCustodyDevice(grantedState, OTHER_DEVICE_KEY, fixtureGrants),
      ),
      options: {},
      operations: [{ kind: 'add-device', device: OTHER_DEVICE_KEY }],
    },
    {
      name: 'an unchanged state',
      after: grantedState,
      options: {},
      operations: [],
    },
  ] as const)(
    'names no spend for $name in collateral mode, the account paying its own fee',
    ({ after, options, operations }) => {
      const inspection = inspect(accountPaid(after, options));
      expect(operationsOf(inspection)).toEqual(operations);
      expect(inspection.accounts[0].netOutflow.lovelace).toBe(FEE);
      expect(inspection.feeShares).toEqual(ACCOUNT_PAYS_ALL);
    },
  );

  it('names no spend for a sweep whose freed lovelace stays at the account, its burned token aside', () => {
    const sweep = grantSweep({ ...grantedState, revoked: [0n] }, [
      fixtureGrants[0],
    ]);
    const [control, swept] = sweep.inputs;
    const inspection = inspect({
      ...sweep,
      inputs: [control, swept, funds],
      spendRedeemers: [...sweep.spendRedeemers!, fund(funds)],
      outputs: [sweep.outputs[0], fundOutput(20_000_000n - FEE)],
    });
    expect(operationsOf(inspection)).toEqual([
      { kind: 'sweep-grants', slots: [0n] },
    ]);
    expect(inspection.accounts[0].netOutflow).toEqual({
      lovelace: FEE,
      assets: new Map([[grantToken(0n), 1n]]),
    });
    expect(inspection.feeShares).toEqual(ACCOUNT_PAYS_ALL);
  });

  it('names no spend for an owner operation in fee mode, the sponsor paying the fee', () => {
    const inspection = inspect(deviceRewrite(grantedState, ADDED));
    expect(operationsOf(inspection)).toEqual([
      { kind: 'add-device', device: OTHER_DEVICE_KEY },
    ]);
    expect(inspection.feeShares).toEqual({
      payers: [SPONSOR_ADDRESS],
      externalShare: FEE,
      accountShare: 0n,
    });
  });

  it('names a payment from the account when an outside input pays the whole fee', () => {
    const shape = accountPaid(ADDED, { payments: [payout(2_000_000n)] });
    const inspection = inspect({
      ...shape,
      inputs: [
        ...shape.inputs,
        utxo(0x13, payout(3_000_000n, SPONSOR_ADDRESS)),
      ],
      outputs: [shape.outputs[0], shape.outputs[1], fundOutput(18_000_000n)],
      fee: 3_000_000n,
    });
    expect(operationsOf(inspection)).toEqual([
      { kind: 'add-device', device: OTHER_DEVICE_KEY },
      { kind: 'owner-spend' },
    ]);
    expect(inspection.feeShares).toEqual({
      payers: [SPONSOR_ADDRESS],
      externalShare: 3_000_000n,
      accountShare: 0n,
    });
  });

  it('names a payment from the account in collateral mode', () => {
    const inspection = inspect(
      accountPaid(grantedState, { payments: [payout(1n)] }),
    );
    expect(operationsOf(inspection)).toEqual([{ kind: 'owner-spend' }]);
    expect(inspection.feeShares).toEqual(ACCOUNT_PAYS_ALL);
  });

  it('splits the fee with a device-key input that takes its change back', () => {
    const shape = accountPaid(grantedState);
    const inspection = inspect({
      ...shape,
      inputs: [...shape.inputs, utxo(0x12, payout(3_000_000n, DEVICE_ADDRESS))],
      outputs: [
        shape.outputs[0],
        fundOutput(19_900_000n),
        payout(2_900_000n, DEVICE_ADDRESS),
      ],
    });
    expect(operationsOf(inspection)).toEqual([]);
    expect(inspection.externalInputs).toMatchObject([{ isDeviceKey: true }]);
    expect(inspection.feeShares).toEqual({
      payers: [DEVICE_ADDRESS],
      externalShare: 100_000n,
      accountShare: 100_000n,
    });
  });

  it("lists each external payer once, in the ledger's input order", () => {
    const shape = deviceRewrite(grantedState, grantedState);
    const inspection = inspect({
      ...shape,
      inputs: [
        ...shape.inputs,
        utxo(0x12, payout(1_000_000n, DEVICE_ADDRESS)),
        utxo(0x13, payout(1_000_000n, SPONSOR_ADDRESS)),
      ],
      outputs: [...shape.outputs, payout(2_100_000n, STRANGER_ADDRESS)],
    });
    expect(inspection.feeShares.payers).toEqual([
      DEVICE_ADDRESS,
      SPONSOR_ADDRESS,
    ]);
  });

  it('gives external inputs no share when the account pays their address more than they put in', () => {
    const shape = accountPaid(grantedState);
    const inspection = inspect({
      ...shape,
      inputs: [...shape.inputs, utxo(0x12, payout(1_000_000n, DEVICE_ADDRESS))],
      outputs: [
        shape.outputs[0],
        payout(4_000_000n, DEVICE_ADDRESS),
        fundOutput(16_800_000n),
      ],
    });
    expect(operationsOf(inspection)).toEqual([{ kind: 'owner-spend' }]);
    expect(inspection.feeShares).toEqual({
      payers: [DEVICE_ADDRESS],
      externalShare: 0n,
      accountShare: FEE,
    });
  });

  it('names a treasury donation from the account a spend', () => {
    const shape = accountPaid(grantedState);
    const inspection = inspect({
      ...shape,
      outputs: [shape.outputs[0], fundOutput(18_800_000n)],
      body: { donation: 1_000_000n },
    });
    expect(operationsOf(inspection)).toEqual([{ kind: 'owner-spend' }]);
    expect(inspection.feeShares).toEqual(ACCOUNT_PAYS_ALL);
  });

  it('names tokens leaving the account a spend while the sponsor pays every lovelace', () => {
    const stocked = utxo(
      0x11,
      fundOutput(20_000_000n, new Map([[TOKEN, 30n]])),
    );
    const shape = deviceRewrite(grantedState, grantedState);
    const inspection = inspect({
      ...shape,
      inputs: [shape.inputs[0], stocked, sponsorFee],
      spendRedeemers: [device(shape.inputs[0]), fund(stocked)],
      outputs: [
        shape.outputs[0],
        {
          address: STRANGER_ADDRESS,
          value: { coins: 1_500_000n, assets: new Map([[TOKEN, 10n]]) },
        },
        fundOutput(20_000_000n, new Map([[TOKEN, 20n]])),
        payout(3_300_000n, SPONSOR_ADDRESS),
      ],
    });
    expect(inspection.accounts[0].netOutflow).toEqual({
      lovelace: 0n,
      assets: new Map([[TOKEN, 10n]]),
    });
    expect(operationsOf(inspection)).toEqual([{ kind: 'owner-spend' }]);
  });

  describe('a reward withdrawal in collateral mode', () => {
    const REWARDS = 3_000_000n;
    const withdrawal = (
      outputs: readonly Cardano.TxOut[],
    ): TransactionShape => {
      const shape = accountPaid(grantedState);
      return {
        ...shape,
        outputs: [shape.outputs[0], ...outputs],
        withdrawals: [
          { stakeAddress: identity.rewardAccount, quantity: REWARDS },
        ],
      };
    };

    it('names no spend when the rewards stay in the account', () => {
      const inspection = inspect(
        withdrawal([fundOutput(20_000_000n - FEE + REWARDS)]),
      );
      expect(operationsOf(inspection)).toEqual([
        { kind: 'withdraw-rewards', quantity: REWARDS },
      ]);
    });

    it('names a spend when the rewards pay a stranger', () => {
      const inspection = inspect(
        withdrawal([fundOutput(20_800_000n), payout(2_000_000n)]),
      );
      expect(inspection.accounts[0].netOutflow.lovelace).toBe(-800_000n);
      expect(operationsOf(inspection)).toEqual([
        { kind: 'owner-spend' },
        { kind: 'withdraw-rewards', quantity: REWARDS },
      ]);
    });
  });

  describe('with several operated accounts', () => {
    const otherState: CustodyAccountState = {
      logic: LOGIC_HASH,
      devices: [OWNER_KEY],
      grantGeneration: 0n,
      nextSlot: 0n,
      revoked: [],
      outstanding: 0n,
    };
    const otherControl = utxo(0x20, {
      address: otherIdentity.address,
      value: {
        coins: 2_000_000n,
        assets: new Map([[otherIdentity.stateNftAssetId, 1n]]),
      },
      datum: encodeCustodyAccountState(otherState),
    });
    const otherFunds = utxo(0x21, {
      address: otherIdentity.address,
      value: { coins: 20_000_000n },
    });

    /** Spends the funds of both accounts, each giving up the lovelace named. */
    const bothPaying = (
      givenUp: bigint,
      otherGivenUp: bigint,
      payments: readonly Cardano.TxOut[],
    ) => {
      const shape = accountPaid(grantedState);
      return inspect(
        {
          ...shape,
          inputs: [...shape.inputs, otherControl, otherFunds],
          spendRedeemers: [
            ...(shape.spendRedeemers ?? []),
            device(otherControl),
            fund(otherFunds),
          ],
          outputs: [
            shape.outputs[0],
            fundOutput(20_000_000n - givenUp),
            otherControl[1],
            { ...otherFunds[1], value: { coins: 20_000_000n - otherGivenUp } },
            ...payments,
          ],
        },
        { accountRecord: undefined },
      );
    };

    it('names neither when they only share the fee', () => {
      const inspection = bothPaying(100_000n, 100_000n, []);
      expect(inspection.accounts.map(({ operations }) => operations)).toEqual([
        [],
        [],
      ]);
      expect(inspection.feeShares).toEqual(ACCOUNT_PAYS_ALL);
    });

    it('names every account that may pay someone, whichever pays the fee', () => {
      const inspection = bothPaying(FEE, 1_000_000n, [payout(1_000_000n)]);
      expect(inspection.accounts.map(({ operations }) => operations)).toEqual([
        [{ kind: 'owner-spend' }],
        [{ kind: 'owner-spend' }],
      ]);
    });

    it('names only the account that gives up more than the fee when the other receives', () => {
      const inspection = bothPaying(1_200_000n, -1_000_000n, []);
      expect(inspection.accounts.map(({ operations }) => operations)).toEqual([
        [{ kind: 'owner-spend' }],
        [],
      ]);
    });
  });
});
