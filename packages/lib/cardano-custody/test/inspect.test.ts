import { Cardano, Serialization } from '@cardano-sdk/core';
import { blake2b, Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  addCustodyDevice,
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  encodeCustodyMintRedeemer,
  removeCustodyDevice,
  revokeAllCustodyGrants,
  revokeCustodyGrant,
} from '../src';

import {
  account,
  BARE_VALIDATOR_ADDRESS,
  buildTransaction,
  controlOutput,
  creation,
  device,
  DEVICE_ADDRESS,
  deviceRewrite,
  embedded,
  fund,
  fundOutput,
  grantOutput,
  grantToken,
  identity,
  MAINNET_ACCOUNT_ADDRESS,
  NFT,
  otherAccount,
  otherIdentity,
  payout,
  POOL_ID,
  record,
  RESERVE_DATUM,
  reserveOutput,
  slotToPosixMs,
  SPONSOR_ADDRESS,
  SPONSOR_KEY,
  sponsorCollateral,
  sponsorFee,
  STAKE_CREDENTIAL,
  utxo,
  VALID_UNTIL,
  VALIDATOR_POINTER_ADDRESS,
  VALIDATOR_WITH_KEY_STAKE_ADDRESS,
  withRedeemer,
} from './custody-transactions';
import {
  fixtureGrants,
  grantedState,
  initialState,
  LOGIC_HASH,
  OTHER_DEVICE_KEY,
  OWNER_KEY,
  TOKEN_NAME,
  TOKEN_POLICY,
} from './fixtures';
import {
  accepted,
  inspect,
  inspectBuilt,
  keyOf,
  onlyAccount,
  reasonsOf,
  REFERENCE_SCRIPT,
  refusalsOf,
  transition,
} from './inspect-helpers';

import type { CustodyAccountState } from '../src';
import type { TransactionShape } from './custody-transactions';
import type { Inspection } from './inspect-helpers';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

const TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${TOKEN_NAME}`);
const DATUM_HASH = Hash32ByteBase16('00'.repeat(32));

const control = utxo(0x10, controlOutput(grantedState));
const funds = utxo(0x11, fundOutput(10_000_000n));
/** Metadata under label 1971: a payment intent id, as Midnight City reads it. */
const PAYMENT_REFERENCE: Cardano.TxMetadata = new Map([
  [
    1971n,
    new Map<Cardano.Metadatum, Cardano.Metadatum>([['intentId', 'pi_42']]),
  ],
]);

/** A sponsored owner spend of 3 tADA to the stranger from a 10 tADA fund UTxO. */
const ownerSpend = (
  changes: Partial<TransactionShape> = {},
): TransactionShape => ({
  ...deviceRewrite(grantedState, grantedState),
  inputs: [control, funds, sponsorFee],
  spendRedeemers: [device(control), fund(funds)],
  outputs: [
    controlOutput(grantedState),
    payout(3_000_000n),
    fundOutput(7_000_000n),
    payout(4_800_000n, SPONSOR_ADDRESS),
  ],
  ...changes,
});

const delegation: Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeDelegation,
  stakeCredential: STAKE_CREDENTIAL,
  poolId: POOL_ID,
};

const withControlOutput = (
  shape: TransactionShape,
  txOut: Cardano.TxOut,
): TransactionShape => ({
  ...shape,
  outputs: [txOut, ...shape.outputs.slice(1)],
});

const withControlResolution = (txOut: Cardano.TxOut): TransactionShape => {
  const resolved = utxo(0x10, txOut);
  return {
    ...deviceRewrite(grantedState, grantedState),
    inputs: [resolved, sponsorFee],
    spendRedeemers: [device(resolved)],
  };
};

/** Eight devices and 32 revoked slots: the largest state the validator accepts. */
const fullState: CustodyAccountState = {
  logic: LOGIC_HASH,
  devices: [
    OWNER_KEY,
    ...Array.from({ length: 7 }, (_, index) => keyOf(0x60 + index)),
  ],
  grantGeneration: 3n,
  nextSlot: 48n,
  revoked: Array.from({ length: 32 }, (_, slot) => BigInt(slot)),
  outstanding: 16n,
};

describe('inspectCustodyTransaction', () => {
  describe('accepts what Lace builds', () => {
    it('reads a creation', () => {
      const inspection = accepted(inspect(creation(initialState)));
      const report = onlyAccount(inspection);
      expect(report).toEqual({
        accountValidatorHash: account.accountValidatorHash,
        stakeScriptHash: account.stakeScriptHash,
        contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
        address: identity.address,
        rewardAccount: identity.rewardAccount,
        controlOutput: {
          outputIndex: 0,
          state: initialState,
          lovelace: 2_100_000n,
        },
        fundInputs: [],
        reserveInputs: [],
        accountOutputs: [
          {
            outputIndex: 0,
            value: controlOutput(initialState, 2_100_000n).value,
            datum: 'inline',
            kind: 'control',
          },
        ],
        issuedGrants: [],
        sweptGrants: [],
        certificates: [
          { certificateIndex: 0, kind: 'registration', deposit: 2_000_000n },
        ],
        operations: [{ kind: 'create' }],
        netOutflow: { lovelace: -2_100_000n, assets: new Map([[NFT, -1n]]) },
      });
      expect(inspection).toEqual({
        accounts: [report],
        deposits: [],
        externalOutputs: [
          {
            outputIndex: 1,
            address: SPONSOR_ADDRESS,
            value: { coins: 700_000n },
          },
        ],
        externalInputs: [
          {
            input: { txId: sponsorFee[0].txId, index: 0 },
            address: SPONSOR_ADDRESS,
            value: { coins: 5_000_000n },
            isDeviceKey: false,
          },
        ],
        collateralInputs: [
          {
            input: { txId: sponsorCollateral[0].txId, index: 0 },
            address: SPONSOR_ADDRESS,
            value: { coins: 5_000_000n },
            isDeviceKey: false,
          },
        ],
        collateralReturn: {
          address: SPONSOR_ADDRESS,
          value: { coins: 4_500_000n },
        },
        requiredSigners: [OWNER_KEY],
        validity: {
          invalidHereafter: {
            slot: VALID_UNTIL,
            posixMs: slotToPosixMs(VALID_UNTIL),
          },
        },
        fee: 200_000n,
        feeShares: {
          payers: [SPONSOR_ADDRESS],
          externalShare: 200_000n,
          accountShare: 0n,
        },
      });
    });

    it.each([
      {
        name: 'a revoked grant',
        before: grantedState,
        after: transition(revokeCustodyGrant(grantedState, 1n, fixtureGrants)),
        operations: [{ kind: 'revoke-grant', slot: 1n }],
      },
      {
        name: 'two revoked grants',
        before: grantedState,
        after: { ...grantedState, revoked: [2n, 0n] },
        operations: [
          { kind: 'revoke-grant', slot: 2n },
          { kind: 'revoke-grant', slot: 0n },
        ],
      },
      {
        name: 'revoking every grant',
        before: { ...grantedState, revoked: [1n] },
        after: revokeAllCustodyGrants({ ...grantedState, revoked: [1n] }),
        operations: [{ kind: 'revoke-all-grants' }],
      },
      {
        name: 'revoking every grant of an account without grants',
        before: initialState,
        after: revokeAllCustodyGrants(initialState),
        operations: [{ kind: 'revoke-all-grants' }],
      },
      {
        name: 'a generation step that keeps a revoked slot',
        before: { ...grantedState, revoked: [1n] },
        after: { ...grantedState, revoked: [1n], grantGeneration: 1n },
        operations: [{ kind: 'change-grant-generation' }],
      },
      {
        name: 'a generation jump',
        before: grantedState,
        after: { ...grantedState, grantGeneration: 7n },
        operations: [{ kind: 'change-grant-generation' }],
      },
      {
        name: 'an added device',
        before: initialState,
        after: transition(addCustodyDevice(initialState, OTHER_DEVICE_KEY, [])),
        operations: [{ kind: 'add-device', device: OTHER_DEVICE_KEY }],
      },
      {
        name: 'a removed device',
        before: { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] },
        after: grantedState,
        operations: [{ kind: 'remove-device', device: OTHER_DEVICE_KEY }],
      },
      {
        name: 'the signing device removing itself',
        before: { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] },
        after: transition(
          removeCustodyDevice(
            { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] },
            OWNER_KEY,
          ),
        ),
        operations: [{ kind: 'remove-device', device: OWNER_KEY }],
      },
      {
        name: 'reordered devices',
        before: { ...grantedState, devices: [OWNER_KEY, OTHER_DEVICE_KEY] },
        after: { ...grantedState, devices: [OTHER_DEVICE_KEY, OWNER_KEY] },
        operations: [{ kind: 'reorder-state' }],
      },
      {
        name: 'reordered revoked slots',
        before: { ...grantedState, revoked: [0n, 1n] },
        after: { ...grantedState, revoked: [1n, 0n] },
        operations: [{ kind: 'reorder-state' }],
      },
      {
        name: 'an unchanged state',
        before: grantedState,
        after: grantedState,
        operations: [],
      },
      {
        name: 'the eighth device beside 32 revoked slots and 16 grants',
        before: { ...fullState, devices: fullState.devices.slice(0, 7) },
        after: fullState,
        operations: [{ kind: 'add-device', device: fullState.devices[7] }],
      },
      {
        name: 'revoking every grant of the largest state',
        before: fullState,
        after: revokeAllCustodyGrants(fullState),
        operations: [{ kind: 'revoke-all-grants' }],
      },
    ] as const)('reads $name', ({ before, after, operations }) => {
      const report = onlyAccount(
        accepted(inspect(deviceRewrite(before, after))),
      );
      expect(report.operations).toEqual(operations);
      expect(report.controlInput).toEqual({
        input: { txId: utxo(0x10, controlOutput(before))[0].txId, index: 0 },
        state: before,
        lovelace: 2_000_000n,
      });
      expect(report.controlOutput).toEqual({
        outputIndex: 0,
        state: after,
        lovelace: 2_000_000n,
      });
      expect(report.stateChange).toMatchObject({ before, after });
      expect(report.netOutflow).toEqual({ lovelace: 0n, assets: new Map() });
    });

    it('reads the state change of a combined rewrite', () => {
      const before = { ...grantedState, revoked: [0n, 1n] };
      const after = {
        ...before,
        devices: [OWNER_KEY, OTHER_DEVICE_KEY],
        revoked: [0n],
        grantGeneration: 2n,
      };
      const report = onlyAccount(
        accepted(inspect(deviceRewrite(before, after))),
      );
      expect(report.operations).toEqual([
        { kind: 'change-grant-generation' },
        { kind: 'add-device', device: OTHER_DEVICE_KEY },
      ]);
      expect(report.stateChange).toEqual({
        before,
        after,
        devicesAdded: [OTHER_DEVICE_KEY],
        devicesRemoved: [],
        revokedAdded: [],
        revokedRemoved: [1n],
        grantGeneration: { before: 0n, after: 2n },
        isReordered: false,
      });
    });

    it('reads an owner spend', () => {
      const inspection = accepted(inspect(ownerSpend()));
      const report = onlyAccount(inspection);
      expect(report.operations).toEqual([{ kind: 'owner-spend' }]);
      expect(report.netOutflow).toEqual({
        lovelace: 3_000_000n,
        assets: new Map(),
      });
      expect(report.fundInputs).toEqual([
        {
          input: { txId: funds[0].txId, index: 0 },
          value: { coins: 10_000_000n },
          hasReferenceScript: false,
        },
      ]);
      expect(report.accountOutputs).toEqual([
        {
          outputIndex: 0,
          value: controlOutput(grantedState).value,
          datum: 'inline',
          kind: 'control',
        },
        {
          outputIndex: 2,
          value: { coins: 7_000_000n },
          datum: 'none',
          kind: 'fund',
        },
      ]);
      expect(
        inspection.externalOutputs.map(({ outputIndex }) => outputIndex),
      ).toEqual([1, 3]);
      expect(inspection.externalInputs).toHaveLength(1);
    });

    it('reads tokens leaving in an owner spend', () => {
      const stocked = utxo(
        0x11,
        fundOutput(10_000_000n, new Map([[TOKEN, 30n]])),
      );
      const report = onlyAccount(
        accepted(
          inspect(
            ownerSpend({
              inputs: [control, stocked, sponsorFee],
              spendRedeemers: [device(control), fund(stocked)],
              outputs: [
                controlOutput(grantedState),
                {
                  address: payout(0n).address,
                  value: { coins: 3_000_000n, assets: new Map([[TOKEN, 10n]]) },
                },
                fundOutput(7_000_000n, new Map([[TOKEN, 20n]])),
              ],
            }),
          ),
        ),
      );
      expect(report.netOutflow).toEqual({
        lovelace: 3_000_000n,
        assets: new Map([[TOKEN, 10n]]),
      });
    });

    it('reads an owner spend paid from the control lovelace', () => {
      const shape = deviceRewrite(grantedState, grantedState);
      const report = onlyAccount(
        accepted(
          inspect({
            ...shape,
            inputs: [shape.inputs[0]],
            outputs: [controlOutput(grantedState, 1_800_000n)],
            collateralReturn: undefined,
          }),
        ),
      );
      expect(report.controlInput?.lovelace).toBe(2_000_000n);
      expect(report.controlOutput?.lovelace).toBe(1_800_000n);
      expect(report.operations).toEqual([]);
      expect(report.netOutflow.lovelace).toBe(200_000n);
    });

    it('reads reserves the owner spends and writes', () => {
      const ownReserve = utxo(0x12, reserveOutput(3_000_000n));
      const foreignReserve = utxo(0x13, {
        ...fundOutput(1_500_000n),
        datum: 42n,
        scriptReference: REFERENCE_SCRIPT,
      });
      const hashedReserve = utxo(0x14, {
        ...fundOutput(1_000_000n),
        datumHash: DATUM_HASH,
      });
      const report = onlyAccount(
        accepted(
          inspect({
            ...deviceRewrite(grantedState, grantedState),
            inputs: [control, ownReserve, foreignReserve, hashedReserve],
            spendRedeemers: [
              device(control),
              fund(ownReserve),
              fund(foreignReserve),
              fund(hashedReserve),
            ],
            outputs: [
              controlOutput(grantedState),
              reserveOutput(5_000_000n),
              payout(300_000n, SPONSOR_ADDRESS),
            ],
          }),
        ),
      );
      expect(report.reserveInputs).toEqual([
        {
          input: { txId: ownReserve[0].txId, index: 0 },
          value: { coins: 3_000_000n },
          datum: 'inline',
          isOwnFormat: true,
          hasReferenceScript: false,
        },
        {
          input: { txId: foreignReserve[0].txId, index: 0 },
          value: { coins: 1_500_000n },
          datum: 'inline',
          isOwnFormat: false,
          hasReferenceScript: true,
        },
        {
          input: { txId: hashedReserve[0].txId, index: 0 },
          value: { coins: 1_000_000n },
          datum: 'hash',
          isOwnFormat: false,
          hasReferenceScript: false,
        },
      ]);
      expect(report.fundInputs).toEqual([]);
      expect(report.accountOutputs[1]).toEqual({
        outputIndex: 1,
        value: { coins: 5_000_000n },
        datum: 'inline',
        kind: 'reserve',
      });
      expect(report.operations).toEqual([{ kind: 'owner-spend' }]);
    });

    it('reads a pool delegation', () => {
      const report = onlyAccount(
        accepted(
          inspect({
            ...deviceRewrite(grantedState, grantedState),
            certificates: [delegation],
          }),
        ),
      );
      expect(report.certificates).toEqual([
        { certificateIndex: 0, kind: 'pool-delegation', poolId: POOL_ID },
      ]);
      expect(report.operations).toEqual([
        { kind: 'delegate', poolId: POOL_ID },
      ]);
    });

    it.each([5_000_000n, 0n])('reads a withdrawal of %s lovelace', quantity => {
      const rewrite = deviceRewrite(grantedState, grantedState);
      const report = onlyAccount(
        accepted(
          inspect({
            ...rewrite,
            withdrawals: [{ stakeAddress: identity.rewardAccount, quantity }],
            outputs:
              quantity === 0n
                ? rewrite.outputs
                : [...rewrite.outputs, fundOutput(quantity)],
          }),
        ),
      );
      expect(report.withdrawal).toBe(quantity);
      expect(report.operations).toEqual([
        { kind: 'withdraw-rewards', quantity },
      ]);
      expect(report.netOutflow.lovelace).toBe(-quantity);
    });

    it('accepts a device of the previous state whose key hash is not 28 bytes when it stays', () => {
      const shortKey = HexBlob('dd'.repeat(27));
      const before = { ...grantedState, devices: [OWNER_KEY, shortKey] };
      expect(
        inspect(deviceRewrite(before, { ...before, revoked: [0n] })).ok,
      ).toBe(true);
      expect(
        onlyAccount(
          accepted(
            inspect(deviceRewrite(before, { ...before, devices: [OWNER_KEY] })),
          ),
        ).operations,
      ).toEqual([{ kind: 'remove-device', device: shortKey }]);
    });

    it('reads a payment to another custody account as a deposit', () => {
      const inspection = accepted(
        inspect(
          ownerSpend({
            outputs: [
              controlOutput(grantedState),
              { address: otherIdentity.address, value: { coins: 3_000_000n } },
              fundOutput(7_000_000n),
              {
                ...reserveOutput(1_000_000n),
                address: otherIdentity.address,
              },
            ],
          }),
        ),
      );
      expect(inspection.deposits).toEqual([
        {
          outputIndex: 1,
          address: otherIdentity.address,
          value: { coins: 3_000_000n },
          ...otherAccount,
          datum: 'none',
        },
        {
          outputIndex: 3,
          address: otherIdentity.address,
          value: { coins: 1_000_000n },
          ...otherAccount,
          datum: 'inline',
        },
      ]);
      expect(onlyAccount(inspection).netOutflow.lovelace).toBe(3_000_000n);
    });

    it('counts a reserve written to the account as returned', () => {
      const report = onlyAccount(
        accepted(
          inspect(
            ownerSpend({
              outputs: [
                controlOutput(grantedState),
                payout(3_000_000n),
                reserveOutput(7_000_000n),
              ],
            }),
          ),
        ),
      );
      expect(report.accountOutputs[1]).toMatchObject({
        datum: 'inline',
        kind: 'reserve',
      });
      expect(report.netOutflow.lovelace).toBe(3_000_000n);
    });

    it('marks inputs and collateral paid by the device key', () => {
      const deviceFunds = utxo(0x20, payout(5_000_000n, DEVICE_ADDRESS));
      const deviceCollateral = utxo(0x21, payout(5_000_000n, DEVICE_ADDRESS));
      const inspection = accepted(
        inspect({
          ...deviceRewrite(grantedState, grantedState),
          inputs: [control, deviceFunds],
          collaterals: [deviceCollateral],
        }),
      );
      expect(inspection.externalInputs).toMatchObject([{ isDeviceKey: true }]);
      expect(inspection.collateralInputs).toMatchObject([
        { isDeviceKey: true },
      ]);
    });

    it('pairs spend redeemers with inputs of one transaction by output index', () => {
      const sameTransactionControl = utxo(0x10, controlOutput(grantedState), 1);
      const sameTransactionFunds = utxo(0x10, fundOutput(10_000_000n), 0);
      expect(
        onlyAccount(
          accepted(
            inspect(
              ownerSpend({
                inputs: [
                  sameTransactionControl,
                  sameTransactionFunds,
                  sponsorFee,
                ],
                spendRedeemers: [
                  device(sameTransactionControl),
                  fund(sameTransactionFunds),
                ],
              }),
            ),
          ),
        ).operations,
      ).toEqual([{ kind: 'owner-spend' }]);
    });

    it('tells device-paid inputs from others of every address kind', () => {
      const devicePointer = new Cardano.Address({
        type: Cardano.AddressType.PointerKey,
        networkId: Cardano.NetworkId.Testnet,
        paymentPart: {
          type: Cardano.CredentialType.KeyHash,
          hash: OWNER_KEY as Hash28ByteBase16,
        },
        pointer: {
          slot: 1n,
          txIndex: Cardano.TxIndex(0),
          certIndex: Cardano.CertIndex(0),
        },
      }).toBech32() as Cardano.PaymentAddress;
      const byron = Cardano.PaymentAddress(
        'Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi',
      );
      const inspection = accepted(
        inspect({
          ...deviceRewrite(grantedState, grantedState),
          inputs: [
            control,
            utxo(0x20, payout(1_000_000n, devicePointer)),
            utxo(0x21, payout(1_000_000n, byron)),
          ],
        }),
      );
      expect(
        inspection.externalInputs.map(({ isDeviceKey }) => isDeviceKey),
      ).toEqual([true, false]);
    });

    it('accepts a device rewrite without a record or a device key when a listed device signs', () => {
      expect(
        inspect(deviceRewrite(grantedState, grantedState), {
          accountRecord: undefined,
          deviceKeyHash: undefined,
        }).ok,
      ).toBe(true);
    });

    it('accepts the record as JSON text and the device key in upper case', () => {
      expect(
        inspect(deviceRewrite(grantedState, grantedState), {
          accountRecord: JSON.stringify(record),
          deviceKeyHash: OWNER_KEY.toUpperCase(),
        }).ok,
      ).toBe(true);
    });

    it('keeps the inline datum of a resolution that also reports its hash', () => {
      const report = onlyAccount(
        accepted(
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              datumHash: DATUM_HASH,
            }),
          ),
        ),
      );
      expect(report.controlInput?.state).toEqual(grantedState);
    });

    it('pairs a resolution with its input whatever the case of the transaction id', () => {
      const built = buildTransaction(deviceRewrite(grantedState, grantedState));
      expect(
        inspectBuilt({
          ...built,
          resolvedInputs: built.resolvedInputs.map(([input, output]) => [
            {
              ...input,
              txId: input.txId.toUpperCase() as Cardano.TransactionId,
            },
            output,
          ]),
        }).ok,
      ).toBe(true);
    });

    it('reports the validity bounds and the donation', () => {
      const inspection = accepted(
        inspect({
          ...deviceRewrite(grantedState, grantedState),
          invalidBefore: Cardano.Slot(VALID_UNTIL - 100),
          body: { donation: 1_000_000n },
        }),
      );
      expect(inspection.validity).toEqual({
        invalidBefore: {
          slot: VALID_UNTIL - 100,
          posixMs: slotToPosixMs(Cardano.Slot(VALID_UNTIL - 100)),
        },
        invalidHereafter: {
          slot: VALID_UNTIL,
          posixMs: slotToPosixMs(VALID_UNTIL),
        },
      });
      expect(inspection.donation).toBe(1_000_000n);
    });

    it('reads the metadata an owner spend carries as auxiliary data', () => {
      const inspection = accepted(
        inspect({
          ...ownerSpend(),
          auxiliaryData: { blob: PAYMENT_REFERENCE },
        }),
      );
      expect(inspection.metadata).toEqual(PAYMENT_REFERENCE);
      expect(onlyAccount(inspection).operations).toEqual([
        { kind: 'owner-spend' },
      ]);
    });

    it('reports no metadata for auxiliary data without any', () => {
      const inspection = accepted(
        inspect({ ...ownerSpend(), auxiliaryData: { blob: new Map() } }),
      );
      expect(inspection).not.toHaveProperty('metadata');
    });

    it('reports nothing for a transaction that only pays a custody account when no record names it', () => {
      const inspection = accepted(
        inspect(
          {
            inputs: [sponsorFee],
            outputs: [fundOutput(3_000_000n)],
          },
          { accountRecord: undefined },
        ),
      );
      expect(inspection.accounts).toEqual([]);
      expect(inspection.deposits).toMatchObject([
        { outputIndex: 0, ...account, datum: 'none' },
      ]);
      expect(inspection.validity).toEqual({});
    });
  });

  describe('refuses before anyone signs', () => {
    const otherRecord = createCustodyAccountRecord(otherIdentity);
    const shortKey = HexBlob('dd'.repeat(27));
    const rewrite = deviceRewrite(grantedState, grantedState);
    const creatorOnly = creation(initialState);
    const grantUtxo = utxo(0x13, grantOutput(fixtureGrants[0]));

    it.each<[string, () => Inspection, string[]]>([
      [
        'a record for another network',
        () =>
          inspect(rewrite, { accountRecord: { ...record, networkMagic: 2 } }),
        ['custody-context-mismatch/invalid-record'],
      ],
      [
        'a record that is not a record',
        () => inspect(rewrite, { accountRecord: 'not json' }),
        ['custody-context-mismatch/invalid-record'],
      ],
      [
        'a record of an unsupported contract version',
        () =>
          inspect(rewrite, {
            accountRecord: { ...record, accountValidatorHash: 'ee'.repeat(28) },
          }),
        ['custody-unsupported-version/unsupported-contract-version'],
      ],
      [
        'a transaction operating an account other than the record names',
        () => inspect(rewrite, { accountRecord: otherRecord }),
        [
          'custody-context-mismatch/foreign-account',
          'custody-context-mismatch/account-not-operated',
        ],
      ],
      [
        'a transaction that only pays the account the record names',
        () =>
          inspect({ inputs: [sponsorFee], outputs: [fundOutput(3_000_000n)] }),
        ['custody-context-mismatch/account-not-operated'],
      ],
    ])('%s', (_, run, reasons) => {
      expect(reasonsOf(run())).toEqual(reasons);
    });

    it('names the refused record step', () => {
      expect(
        refusalsOf(
          inspect(rewrite, { accountRecord: { ...record, networkMagic: 2 } }),
        ),
      ).toEqual([
        {
          code: 'custody-context-mismatch',
          reason: 'invalid-record',
          recordError: {
            step: 5,
            code: 'network-mismatch',
            expected: 1,
            actual: 2,
          },
        },
      ]);
    });

    describe('when the resolutions do not match the body', () => {
      const built = () =>
        buildTransaction({
          ...rewrite,
          referenceInputs: [utxo(0x30, payout(1_000_000n, SPONSOR_ADDRESS))],
        });

      it.each<[string, number, string]>([
        ['an input', 0, 'inputs'],
        ['a reference input', 2, 'referenceInputs'],
        ['a collateral input', 3, 'collaterals'],
      ])('refuses %s without a resolution', (_, position, source) => {
        const transaction = built();
        const missing = transaction.resolvedInputs[position];
        expect(
          refusalsOf(
            inspectBuilt({
              ...transaction,
              resolvedInputs: transaction.resolvedInputs.filter(
                resolved => resolved !== missing,
              ),
            }),
          ),
        ).toEqual([
          {
            code: 'custody-context-mismatch',
            reason: 'unresolved-input',
            input: { txId: missing[0].txId, index: missing[0].index },
            source,
          },
        ]);
      });

      it('refuses a resolution of an outpoint the body does not name', () => {
        const transaction = built();
        const extra = utxo(0x31, payout(1n, SPONSOR_ADDRESS));
        expect(
          refusalsOf(
            inspectBuilt({
              ...transaction,
              resolvedInputs: [...transaction.resolvedInputs, extra],
            }),
          ),
        ).toEqual([
          {
            code: 'custody-context-mismatch',
            reason: 'resolution-not-in-body',
            input: { txId: extra[0].txId, index: 0 },
          },
        ]);
      });

      it('refuses a second resolution of one outpoint', () => {
        const transaction = built();
        expect(
          reasonsOf(
            inspectBuilt({
              ...transaction,
              resolvedInputs: [
                ...transaction.resolvedInputs,
                [transaction.resolvedInputs[1][0], payout(1n)],
              ],
            }),
          ),
        ).toEqual(['custody-context-mismatch/duplicate-resolution']);
      });

      it('refuses a resolution whose address does not parse', () => {
        const transaction = built();
        const [first, ...rest] = transaction.resolvedInputs;
        expect(
          reasonsOf(
            inspectBuilt({
              ...transaction,
              resolvedInputs: [
                [
                  first[0],
                  {
                    ...first[1],
                    address: 'nonsense' as Cardano.PaymentAddress,
                  },
                ],
                ...rest,
              ],
            }),
          ),
        ).toEqual(['custody-context-mismatch/invalid-resolution']);
      });
    });

    it.each<[string, () => Inspection, string[]]>([
      [
        'a control resolution on another network',
        () =>
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              address: MAINNET_ACCOUNT_ADDRESS,
            }),
          ),
        ['custody-context-mismatch/network-mismatch'],
      ],
      [
        'a control output on another network',
        () =>
          inspect(
            withControlOutput(rewrite, {
              ...controlOutput(grantedState),
              address: MAINNET_ACCOUNT_ADDRESS,
            }),
          ),
        ['custody-context-mismatch/network-mismatch'],
      ],
      [
        'a control UTxO spent with the grant redeemer',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [
              withRedeemer(rewrite.inputs[0], { kind: 'spendWithGrant' }),
            ],
          }),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a control UTxO spent with the sweep redeemer',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [
              withRedeemer(rewrite.inputs[0], { kind: 'sweepGrant' }),
            ],
          }),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a control UTxO spent with the fund redeemer',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [fund(rewrite.inputs[0])],
          }),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a fund UTxO spent with the device redeemer',
        () =>
          inspect(
            ownerSpend({ spendRedeemers: [device(control), device(funds)] }),
          ),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a grant UTxO spent with the fund redeemer',
        () =>
          inspect({
            ...rewrite,
            inputs: [control, grantUtxo, sponsorFee],
            spendRedeemers: [device(control), fund(grantUtxo)],
            outputs: [...rewrite.outputs, grantOutput(fixtureGrants[0])],
          }),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a grant UTxO spent with the device redeemer',
        () =>
          inspect({
            ...rewrite,
            inputs: [control, grantUtxo, sponsorFee],
            spendRedeemers: [device(control), device(grantUtxo)],
            outputs: [...rewrite.outputs, grantOutput(fixtureGrants[0])],
          }),
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'a reserve spent with the device redeemer',
        () => {
          const reserve = utxo(0x12, reserveOutput(3_000_000n));
          return inspect(
            ownerSpend({
              inputs: [control, reserve, sponsorFee],
              spendRedeemers: [device(control), device(reserve)],
            }),
          );
        },
        ['custody-context-mismatch/redeemer-mismatch'],
      ],
      [
        'swapped spend redeemers',
        () =>
          inspect(
            ownerSpend({ spendRedeemers: [fund(control), device(funds)] }),
          ),
        [
          'custody-context-mismatch/redeemer-mismatch',
          'custody-context-mismatch/redeemer-mismatch',
        ],
      ],
      [
        'an unknown spend redeemer',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [
              {
                utxo: rewrite.inputs[0],
                data: { constructor: 4n, fields: { items: [] } },
              },
            ],
          }),
        ['custody-unsupported-operation/unknown-redeemer'],
      ],
      [
        'a grant redeemer that names its slot',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [
              {
                utxo: rewrite.inputs[0],
                data: { constructor: 1n, fields: { items: [0n] } },
              },
            ],
          }),
        ['custody-unsupported-operation/unknown-redeemer'],
      ],
      [
        'a spend redeemer of the integer zero',
        () =>
          inspect({
            ...rewrite,
            spendRedeemers: [{ utxo: rewrite.inputs[0], data: 0n }],
          }),
        ['custody-unsupported-operation/unknown-redeemer'],
      ],
      [
        'a custody input without a spend redeemer',
        () => inspect({ ...rewrite, spendRedeemers: [] }),
        ['custody-unsupported-operation/missing-redeemer'],
      ],
      [
        'a control resolution without a datum',
        () =>
          inspect(
            withControlResolution({
              address: identity.address,
              value: controlOutput(grantedState).value,
            }),
          ),
        ['custody-malformed-datum/control-input-datum'],
      ],
      [
        'a control resolution under a datum hash',
        () =>
          inspect(
            withControlResolution({
              address: identity.address,
              value: controlOutput(grantedState).value,
              datumHash: DATUM_HASH,
            }),
          ),
        ['custody-malformed-datum/control-input-datum'],
      ],
      [
        'a control resolution whose datum is not an account state',
        () =>
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              datum: 42n,
            }),
          ),
        ['custody-malformed-datum/control-input-datum'],
      ],
      [
        'a control resolution holding another token',
        () =>
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              value: {
                coins: 2_000_000n,
                assets: new Map([
                  [NFT, 1n],
                  [TOKEN, 1n],
                ]),
              },
            }),
          ),
        ['custody-malformed-datum/control-input-value'],
      ],
      [
        'a control resolution without the state NFT',
        () =>
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              value: { coins: 2_000_000n },
            }),
          ),
        [
          'custody-context-mismatch/redeemer-mismatch',
          'custody-context-mismatch/control-output-without-control-input',
          'custody-unsupported-operation/reserve-without-control',
        ],
      ],
      [
        'a fund resolution claiming a key address',
        () => {
          const disguised = utxo(0x11, payout(10_000_000n, SPONSOR_ADDRESS));
          return inspect(
            ownerSpend({
              inputs: [control, disguised, sponsorFee],
              spendRedeemers: [device(control), fund(disguised)],
            }),
          );
        },
        ['custody-context-mismatch/redeemer-on-key-input'],
      ],
      [
        'resolutions hiding every custody input',
        () => {
          const disguised = utxo(0x10, payout(2_000_000n, SPONSOR_ADDRESS));
          return inspect(
            {
              ...rewrite,
              inputs: [disguised, sponsorFee],
              spendRedeemers: [],
              outputs: [payout(2_000_000n, SPONSOR_ADDRESS)],
            },
            { accountRecord: undefined },
          );
        },
        ['custody-context-mismatch/unused-logic'],
      ],
      [
        'resolutions hiding every custody input of a transaction attaching its scripts',
        () => {
          const disguised = utxo(0x10, payout(2_000_000n, SPONSOR_ADDRESS));
          return inspect(
            embedded({
              ...rewrite,
              inputs: [disguised, sponsorFee],
              spendRedeemers: [],
              outputs: [payout(2_000_000n, SPONSOR_ADDRESS)],
            }),
            { accountRecord: undefined },
          );
        },
        [
          'custody-context-mismatch/unused-account-validator',
          'custody-context-mismatch/unused-logic',
        ],
      ],
      [
        'a control resolution claiming a key address',
        () =>
          inspect(withControlResolution(payout(2_000_000n, SPONSOR_ADDRESS))),
        [
          'custody-context-mismatch/redeemer-on-key-input',
          'custody-context-mismatch/control-output-without-control-input',
        ],
      ],
      [
        'a control resolution claiming a key address beside the attached proxy',
        () =>
          inspect(
            embedded(
              withControlResolution(payout(2_000_000n, SPONSOR_ADDRESS)),
            ),
          ),
        [
          'custody-context-mismatch/redeemer-on-key-input',
          'custody-context-mismatch/unused-account-validator',
          'custody-context-mismatch/control-output-without-control-input',
        ],
      ],
      [
        'two control resolutions',
        () => {
          const second = utxo(0x12, controlOutput(grantedState));
          return inspect({
            ...rewrite,
            inputs: [rewrite.inputs[0], second, sponsorFee],
            spendRedeemers: [device(rewrite.inputs[0]), device(second)],
          });
        },
        ['custody-context-mismatch/multiple-control-inputs'],
      ],
      [
        'a control resolution at another account',
        () =>
          inspect(
            withControlResolution({
              ...controlOutput(grantedState),
              address: otherIdentity.address,
            }),
          ),
        [
          'custody-context-mismatch/foreign-account',
          'custody-context-mismatch/redeemer-mismatch',
          'custody-context-mismatch/control-output-without-control-input',
          'custody-unsupported-operation/account-token-misplaced',
          'custody-unsupported-operation/reserve-without-control',
        ],
      ],
    ])('refuses %s', (_, run, reasons) => {
      expect(reasonsOf(run())).toEqual(reasons);
    });

    it.each<[string, () => Inspection, string[]]>([
      [
        'a deposit spent without an account token',
        () => {
          const shape = ownerSpend();
          return inspect({
            ...shape,
            inputs: [funds, sponsorFee],
            spendRedeemers: [fund(funds)],
            outputs: shape.outputs.slice(1),
          });
        },
        [
          'custody-context-mismatch/unused-logic',
          'custody-unsupported-operation/fund-without-account-token',
        ],
      ],
      [
        'a deposit spent beside only a reference to the control UTxO',
        () => {
          const shape = ownerSpend();
          return inspect({
            ...shape,
            inputs: [funds, sponsorFee],
            referenceInputs: [control],
            spendRedeemers: [fund(funds)],
            outputs: shape.outputs.slice(1),
          });
        },
        [
          'custody-unsupported-operation/fund-without-account-token',
          'custody-unsupported-operation/reference-control',
        ],
      ],
      [
        'a deposit of another account riding on this control UTxO',
        () => {
          const otherFunds = utxo(0x12, {
            address: otherIdentity.address,
            value: { coins: 5_000_000n },
          });
          return inspect(
            ownerSpend({
              inputs: [control, funds, otherFunds, sponsorFee],
              spendRedeemers: [device(control), fund(funds), fund(otherFunds)],
            }),
            { accountRecord: undefined },
          );
        },
        ['custody-unsupported-operation/fund-without-account-token'],
      ],
      [
        'a reserve spent without the control UTxO',
        () => {
          const reserve = utxo(0x12, reserveOutput(3_000_000n));
          return inspect({
            ...rewrite,
            inputs: [reserve, sponsorFee],
            spendRedeemers: [fund(reserve)],
            outputs: [payout(7_800_000n, SPONSOR_ADDRESS)],
          });
        },
        [
          'custody-context-mismatch/unused-logic',
          'custody-unsupported-operation/reserve-without-control',
        ],
      ],
      [
        'an owner operation that also references a control UTxO of its account',
        () =>
          inspect({
            ...rewrite,
            referenceInputs: [utxo(0x15, controlOutput(grantedState))],
          }),
        ['custody-unsupported-operation/reference-control'],
      ],
    ])('refuses %s', (_, run, reasons) => {
      expect(reasonsOf(run())).toEqual(reasons);
    });

    it.each<[string, Cardano.TxOut[], string[]]>([
      [
        'no control output',
        [payout(4_700_000n, SPONSOR_ADDRESS)],
        ['custody-malformed-datum/control-output-count'],
      ],
      [
        'two control outputs',
        [controlOutput(grantedState), controlOutput(grantedState)],
        ['custody-malformed-datum/control-output-count'],
      ],
      [
        'a control output holding another token',
        [
          {
            ...controlOutput(grantedState),
            value: {
              coins: 2_000_000n,
              assets: new Map([
                [NFT, 1n],
                [TOKEN, 1n],
              ]),
            },
          },
        ],
        ['custody-malformed-datum/control-output-value'],
      ],
      [
        'a control output under a datum hash',
        [
          {
            address: identity.address,
            value: controlOutput(grantedState).value,
            datumHash: DATUM_HASH,
          },
        ],
        ['custody-malformed-datum/control-output-datum'],
      ],
      [
        'a control output whose datum is not an account state',
        [{ ...controlOutput(grantedState), datum: 42n }],
        ['custody-malformed-datum/control-output-datum'],
      ],
      [
        'a control output carrying a reference script',
        [{ ...controlOutput(grantedState), scriptReference: REFERENCE_SCRIPT }],
        ['custody-unsupported-operation/control-output-reference-script'],
      ],
      [
        'the state NFT sent to another account',
        [{ ...controlOutput(grantedState), address: otherIdentity.address }],
        [
          'custody-unsupported-operation/account-token-misplaced',
          'custody-malformed-datum/control-output-count',
        ],
      ],
      [
        'the state NFT sent away from every account',
        [{ ...controlOutput(grantedState), address: SPONSOR_ADDRESS }],
        [
          'custody-unsupported-operation/account-token-misplaced',
          'custody-malformed-datum/control-output-count',
        ],
      ],
      [
        'the state NFT sent to the bare validator',
        [{ ...controlOutput(grantedState), address: BARE_VALIDATOR_ADDRESS }],
        [
          'custody-unsupported-operation/account-token-misplaced',
          'custody-malformed-datum/control-output-count',
          'custody-locked-output/unspendable-address',
        ],
      ],
    ])('refuses %s', (_, outputs, reasons) => {
      expect(reasonsOf(inspect({ ...rewrite, outputs }))).toEqual(reasons);
    });

    it.each<[string, () => Inspection]>([
      [
        'a creation',
        () =>
          inspect(
            creation(initialState, {
              outputs: [
                {
                  ...controlOutput(initialState, 2_100_000n),
                  scriptReference:
                    CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
                },
                payout(700_000n, SPONSOR_ADDRESS),
              ],
            }),
          ),
      ],
      [
        'a device rewrite',
        () =>
          inspect(
            withControlOutput(rewrite, {
              ...controlOutput(grantedState),
              scriptReference:
                CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
            }),
          ),
      ],
    ])(
      'refuses the account validator as the control output reference script of %s, which would stop every later operation',
      (_, run) => {
        expect(refusalsOf(run())).toEqual([
          {
            code: 'custody-unsupported-operation',
            reason: 'control-output-reference-script',
            outputIndex: 0,
          },
        ]);
      },
    );

    it.each<[string, CustodyAccountState, string[]]>([
      [
        'a new device whose key hash is not 28 bytes',
        { ...grantedState, devices: [OWNER_KEY, shortKey] },
        ['custody-malformed-datum/state-violation'],
      ],
      [
        'more than 8 devices',
        {
          ...grantedState,
          devices: Array.from({ length: 9 }, (_, index) =>
            index === 0 ? OWNER_KEY : keyOf(0x60 + index),
          ),
        },
        ['custody-malformed-datum/state-violation'],
      ],
      [
        'no device',
        { ...grantedState, devices: [] },
        ['custody-malformed-datum/state-violation'],
      ],
      [
        'a duplicate device',
        { ...grantedState, devices: [OWNER_KEY, OWNER_KEY] },
        ['custody-malformed-datum/state-violation'],
      ],
      [
        'a negative grant generation',
        { ...grantedState, grantGeneration: -1n },
        [
          'custody-malformed-datum/state-violation',
          'custody-malformed-datum/generation-decreased',
        ],
      ],
      [
        'a lower grant generation',
        { ...fullState, grantGeneration: 2n },
        ['custody-malformed-datum/generation-decreased'],
      ],
      [
        'more than 32 revoked slots',
        { ...fullState, revoked: [...fullState.revoked, 32n] },
        ['custody-malformed-datum/state-violation'],
      ],
    ])('refuses a new state with %s', (_, after, reasons) => {
      const before = after.revoked.length > 3 ? fullState : grantedState;
      expect(reasonsOf(inspect(deviceRewrite(before, after)))).toEqual(reasons);
    });

    it('names the state violation it refuses', () => {
      expect(
        refusalsOf(
          inspect(
            deviceRewrite(grantedState, {
              ...grantedState,
              devices: [OWNER_KEY, shortKey],
            }),
          ),
        ),
      ).toEqual([
        {
          code: 'custody-malformed-datum',
          reason: 'state-violation',
          account,
          violation: {
            code: 'invalid-device-key-hash',
            device: shortKey,
            deviceIndex: 1,
          },
        },
      ]);
    });

    it('refuses a rule the validator checks even when the previous state broke it', () => {
      const before = { ...grantedState, devices: [OWNER_KEY, OWNER_KEY] };
      expect(reasonsOf(inspect(deviceRewrite(before, before)))).toEqual([
        'custody-malformed-datum/state-violation',
      ]);
    });

    it.each([
      {
        name: 'a device the spent state does not list',
        options: { deviceKeyHash: OTHER_DEVICE_KEY },
        requiredSigners: [OTHER_DEVICE_KEY],
        reasons: ['custody-device-not-listed/not-listed'],
      },
      {
        name: 'a listed device that is not a required signer',
        options: {},
        requiredSigners: [SPONSOR_KEY],
        reasons: ['custody-device-not-listed/not-required-signer'],
      },
      {
        name: 'an unlisted device that does not sign either',
        options: { deviceKeyHash: OTHER_DEVICE_KEY },
        requiredSigners: [],
        reasons: [
          'custody-device-not-listed/not-listed',
          'custody-device-not-listed/not-required-signer',
        ],
      },
      {
        name: 'a rewrite no listed device signs',
        options: { deviceKeyHash: undefined },
        requiredSigners: [OTHER_DEVICE_KEY],
        reasons: ['custody-device-not-listed/no-device-signer'],
      },
    ])('refuses $name', ({ options, requiredSigners, reasons }) => {
      expect(
        reasonsOf(inspect({ ...rewrite, requiredSigners }, options)),
      ).toEqual(reasons);
    });

    it.each<[string, () => Inspection, string[]]>([
      [
        'a creation signed for by another device',
        () => inspect(creatorOnly, { deviceKeyHash: OTHER_DEVICE_KEY }),
        ['custody-device-not-listed/not-creator'],
      ],
      [
        'a creation the creator does not sign',
        () => inspect({ ...creatorOnly, requiredSigners: [SPONSOR_KEY] }),
        ['custody-device-not-listed/not-required-signer'],
      ],
      [
        'an initial state with another device beside the creator',
        () =>
          inspect(
            creation({
              ...initialState,
              devices: [OWNER_KEY, OTHER_DEVICE_KEY],
            }),
          ),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'an initial state listing another device instead of the creator',
        () =>
          inspect(creation({ ...initialState, devices: [OTHER_DEVICE_KEY] })),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'an initial state with a grant generation, which the validator accepts',
        () => inspect(creation({ ...initialState, grantGeneration: 1n })),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'an initial state with a next slot',
        () => inspect(creation({ ...initialState, nextSlot: 1n })),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'an initial state with a revoked slot',
        () => inspect(creation({ ...initialState, revoked: [0n] })),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'an initial state with an outstanding grant',
        () => inspect(creation({ ...initialState, outstanding: 1n })),
        ['custody-context-mismatch/initial-state'],
      ],
      [
        'a creation minting two state NFTs',
        () => inspect({ ...creatorOnly, mint: new Map([[NFT, 2n]]) }),
        ['custody-unsupported-operation/unsupported-mint'],
      ],
      [
        'a creation minting a grant token beside the state NFT',
        () =>
          inspect({
            ...creatorOnly,
            mint: new Map([
              [NFT, 1n],
              [grantToken(0n), 1n],
            ]),
          }),
        [
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/unsupported-mint',
        ],
      ],
      [
        'a creation without the mint redeemer',
        () => inspect({ ...creatorOnly, mintRedeemer: undefined }),
        ['custody-unsupported-operation/missing-redeemer'],
      ],
      [
        'a creation under the issue redeemer',
        () =>
          inspect({
            ...creatorOnly,
            mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
          }),
        ['custody-unsupported-operation/mint-redeemer-mismatch'],
      ],
      [
        'a creation with an unknown mint redeemer',
        () =>
          inspect({
            ...creatorOnly,
            mintRedeemer: { constructor: 3n, fields: { items: [] } },
          }),
        ['custody-unsupported-operation/unknown-redeemer'],
      ],
      [
        'a creation that registers nothing',
        () => inspect({ ...creatorOnly, certificates: [] }),
        ['custody-unsupported-operation/creation-without-registration'],
      ],
      [
        'a creation with a witness-free legacy registration',
        () =>
          inspect({
            ...creatorOnly,
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeRegistration,
                stakeCredential: STAKE_CREDENTIAL,
              },
            ],
          }),
        [
          'custody-unsupported-operation/refused-certificate',
          'custody-unsupported-operation/creation-without-registration',
        ],
      ],
      [
        'a creation registering and delegating at once',
        () =>
          inspect({
            ...creatorOnly,
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeRegistrationDelegation,
                stakeCredential: STAKE_CREDENTIAL,
                poolId: POOL_ID,
                deposit: 2_000_000n,
              },
            ],
          }),
        [
          'custody-unsupported-operation/unsupported-certificate',
          'custody-unsupported-operation/creation-without-registration',
        ],
      ],
      [
        'a creation that also delegates',
        () =>
          inspect({
            ...creatorOnly,
            certificates: [...creatorOnly.certificates!, delegation],
          }),
        ['custody-unsupported-operation/stake-operation-without-control'],
      ],
      [
        'a creation without a record',
        () => inspect(creatorOnly, { accountRecord: undefined }),
        ['custody-context-mismatch/creation-without-record'],
      ],
      [
        'a creation of another account',
        () => inspect(creatorOnly, { accountRecord: otherRecord }),
        [
          'custody-context-mismatch/foreign-account',
          'custody-context-mismatch/account-not-operated',
        ],
      ],
      [
        'a mint of the state NFT beside a control input',
        () =>
          inspect({
            ...rewrite,
            mint: new Map([[NFT, 1n]]),
            mintRedeemer: encodeCustodyMintRedeemer({ kind: 'createAccount' }),
          }),
        [
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/creation-without-registration',
        ],
      ],
      [
        "another account's state NFT minted beside this control input",
        () =>
          inspect(
            {
              ...rewrite,
              mint: new Map([[otherIdentity.stateNftAssetId, 1n]]),
              mintRedeemer: encodeCustodyMintRedeemer({
                kind: 'createAccount',
              }),
            },
            { accountRecord: undefined },
          ),
        [
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/creation-without-registration',
          'custody-malformed-datum/control-output-count',
        ],
      ],
      [
        'a mint of two accounts at once',
        () =>
          inspect(
            {
              ...creatorOnly,
              mint: new Map([
                [NFT, 1n],
                [otherIdentity.stateNftAssetId, 1n],
              ]),
            },
            { accountRecord: undefined, deviceKeyHash: undefined },
          ),
        [
          'custody-context-mismatch/creation-without-record',
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/creation-without-registration',
          'custody-malformed-datum/control-output-count',
        ],
      ],
      [
        'a mint under the account policy whose name is no account token name',
        () =>
          inspect({
            ...rewrite,
            mint: new Map([
              [Cardano.AssetId(`${account.accountValidatorHash}00`), 1n],
            ]),
          }),
        ['custody-unsupported-operation/unsupported-mint'],
      ],
      [
        'a registration outside creation',
        () =>
          inspect({
            ...rewrite,
            certificates: creatorOnly.certificates,
          }),
        ['custody-unsupported-operation/registration-without-creation'],
      ],
    ])('refuses %s', (_, run, reasons) => {
      expect(reasonsOf(run())).toEqual(reasons);
    });

    it.each<[string, Cardano.Certificate, string]>([
      [
        'a vote delegation',
        {
          __typename: Cardano.CertificateType.VoteDelegation,
          stakeCredential: STAKE_CREDENTIAL,
          dRep: { __typename: 'AlwaysAbstain' },
        },
        'custody-unsupported-operation/unsupported-certificate',
      ],
      [
        'a combined stake and vote delegation',
        {
          __typename: Cardano.CertificateType.StakeVoteDelegation,
          stakeCredential: STAKE_CREDENTIAL,
          poolId: POOL_ID,
          dRep: { __typename: 'AlwaysAbstain' },
        },
        'custody-unsupported-operation/unsupported-certificate',
      ],
      [
        'a deregistration',
        {
          __typename: Cardano.CertificateType.Unregistration,
          stakeCredential: STAKE_CREDENTIAL,
          deposit: 2_000_000n,
        },
        'custody-unsupported-operation/refused-certificate',
      ],
      [
        'a certificate on a key credential',
        {
          __typename: Cardano.CertificateType.StakeDelegation,
          stakeCredential: {
            type: Cardano.CredentialType.KeyHash,
            hash: SPONSOR_KEY as Hash28ByteBase16,
          },
          poolId: POOL_ID,
        },
        'custody-unsupported-operation/foreign-certificate',
      ],
      [
        'a certificate without a stake credential',
        {
          __typename: Cardano.CertificateType.PoolRetirement,
          poolId: POOL_ID,
          epoch: Cardano.EpochNo(500),
        },
        'custody-unsupported-operation/foreign-certificate',
      ],
    ])('refuses %s', (_, certificate, reason) => {
      expect(
        reasonsOf(inspect({ ...rewrite, certificates: [certificate] })),
      ).toEqual([reason]);
    });

    it.each<[string, () => Inspection, string[]]>([
      [
        'a delegation that does not spend the control UTxO',
        () =>
          inspect({
            inputs: [sponsorFee],
            outputs: [payout(4_700_000n, SPONSOR_ADDRESS)],
            certificates: [delegation],
            requiredSigners: [OWNER_KEY],
          }),
        ['custody-unsupported-operation/stake-operation-without-control'],
      ],
      [
        'a withdrawal that does not spend the control UTxO',
        () =>
          inspect({
            inputs: [sponsorFee],
            outputs: [payout(4_700_000n, SPONSOR_ADDRESS)],
            withdrawals: [
              { stakeAddress: identity.rewardAccount, quantity: 0n },
            ],
            requiredSigners: [OWNER_KEY],
          }),
        ['custody-unsupported-operation/stake-operation-without-control'],
      ],
      [
        'a delegation that references the control UTxO',
        () =>
          inspect({
            inputs: [sponsorFee],
            referenceInputs: [control],
            outputs: [payout(4_700_000n, SPONSOR_ADDRESS)],
            certificates: [delegation],
            requiredSigners: [OWNER_KEY],
          }),
        [
          'custody-unsupported-operation/reference-control',
          'custody-unsupported-operation/stake-operation-without-control',
        ],
      ],
      [
        'a withdrawal from a key reward account',
        () =>
          inspect({
            ...rewrite,
            withdrawals: [
              {
                stakeAddress: Cardano.RewardAccount.fromCredential(
                  {
                    type: Cardano.CredentialType.KeyHash,
                    hash: SPONSOR_KEY as Hash28ByteBase16,
                  },
                  Cardano.NetworkId.Testnet,
                ),
                quantity: 1n,
              },
            ],
          }),
        ['custody-unsupported-operation/foreign-withdrawal'],
      ],
      [
        'a withdrawal from the account on another network',
        () =>
          inspect({
            ...rewrite,
            withdrawals: [
              {
                stakeAddress: Cardano.RewardAccount.fromCredential(
                  STAKE_CREDENTIAL,
                  Cardano.NetworkId.Mainnet,
                ),
                quantity: 1n,
              },
            ],
          }),
        ['custody-context-mismatch/network-mismatch'],
      ],
      [
        'a mint of another policy',
        () => inspect({ ...rewrite, mint: new Map([[TOKEN, 1n]]) }),
        ['custody-unsupported-operation/foreign-mint'],
      ],
      [
        'a vote',
        () =>
          inspect({
            ...rewrite,
            body: {
              votingProcedures: [
                {
                  voter: {
                    __typename: Cardano.VoterType.dRepKeyHash,
                    credential: {
                      type: Cardano.CredentialType.KeyHash,
                      hash: OWNER_KEY as Hash28ByteBase16,
                    },
                  },
                  votes: [
                    {
                      actionId: { id: sponsorFee[0].txId, actionIndex: 0 },
                      votingProcedure: { vote: Cardano.Vote.yes, anchor: null },
                    },
                  ],
                },
              ],
            },
          }),
        ['custody-unsupported-operation/unsupported-body-field'],
      ],
    ])('refuses %s', (_, run, reasons) => {
      expect(reasonsOf(run())).toEqual(reasons);
    });

    it.each<[string, Cardano.TxOut, string]>([
      [
        'an output at the account under a datum hash',
        { ...fundOutput(1_000_000n), datumHash: DATUM_HASH },
        'custody-locked-output/datum-hash',
      ],
      [
        'an output at another account under a datum hash',
        {
          ...fundOutput(1_000_000n),
          address: otherIdentity.address,
          datumHash: DATUM_HASH,
        },
        'custody-locked-output/datum-hash',
      ],
      [
        'a reserve at the account under a datum other than d87980',
        { ...fundOutput(1_000_000n), datum: 42n },
        'custody-unsupported-operation/foreign-reserve',
      ],
      [
        'a reserve at another account under a datum other than d87980',
        {
          ...fundOutput(1_000_000n),
          address: otherIdentity.address,
          datum: 7n,
        },
        'custody-unsupported-operation/foreign-reserve',
      ],
      [
        'a reserve carrying a reference script',
        { ...reserveOutput(1_000_000n), scriptReference: REFERENCE_SCRIPT },
        'custody-unsupported-operation/foreign-reserve',
      ],
      [
        'a plain deposit carrying a reference script',
        { ...fundOutput(1_000_000n), scriptReference: REFERENCE_SCRIPT },
        'custody-unsupported-operation/deposit-reference-script',
      ],
      [
        'an output to the account validator with no stake part',
        payout(1_000_000n, BARE_VALIDATOR_ADDRESS),
        'custody-locked-output/unspendable-address',
      ],
      [
        'an output to the account validator with a key stake part',
        payout(1_000_000n, VALIDATOR_WITH_KEY_STAKE_ADDRESS),
        'custody-locked-output/unspendable-address',
      ],
      [
        'an output to the account validator with a pointer stake part',
        payout(1_000_000n, VALIDATOR_POINTER_ADDRESS),
        'custody-locked-output/unspendable-address',
      ],
    ])('refuses %s', (_, txOut, reason) => {
      expect(
        reasonsOf(
          inspect({ ...rewrite, outputs: [...rewrite.outputs, txOut] }),
        ),
      ).toEqual([reason]);
    });

    it('accepts a reserve under exactly the reserve datum', () => {
      expect(
        inspect({
          ...rewrite,
          outputs: [
            ...rewrite.outputs,
            { ...fundOutput(1_000_000n), datum: RESERVE_DATUM },
          ],
        }).ok,
      ).toBe(true);
    });

    describe('auxiliary data', () => {
      const withMetadata = (changes: Partial<TransactionShape> = {}) =>
        ownerSpend({ auxiliaryData: { blob: PAYMENT_REFERENCE }, ...changes });

      it.each<[string, () => Inspection]>([
        [
          'auxiliary data the body does not commit to',
          () =>
            inspect(withMetadata({ body: { auxiliaryDataHash: undefined } })),
        ],
        [
          'an auxiliary data hash of other auxiliary data',
          () =>
            inspect(withMetadata({ body: { auxiliaryDataHash: DATUM_HASH } })),
        ],
        [
          'an auxiliary data hash without auxiliary data',
          () =>
            inspect(ownerSpend({ body: { auxiliaryDataHash: DATUM_HASH } })),
        ],
      ])('refuses %s', (_, run) => {
        expect(refusalsOf(run())).toEqual([
          {
            code: 'custody-unsupported-operation',
            reason: 'auxiliary-data-hash-mismatch',
          },
        ]);
      });

      it('refuses auxiliary data that carries a script', () => {
        expect(
          refusalsOf(
            inspect(
              withMetadata({
                auxiliaryData: {
                  blob: PAYMENT_REFERENCE,
                  scripts: [REFERENCE_SCRIPT],
                },
              }),
            ),
          ),
        ).toEqual([
          {
            code: 'custody-unsupported-operation',
            reason: 'auxiliary-data-scripts',
          },
        ]);
      });

      it('accepts another valid encoding of the same metadata', () => {
        const { transaction, resolvedInputs } = buildTransaction(
          withMetadata(),
        );
        const metadata = transaction.auxiliaryData()?.metadata()?.toCbor();
        if (!metadata) throw new Error('expected metadata');
        // The tagged Alonzo map (tag 259, key 0 for metadata) rather than the
        // bare metadata map cardano-sdk emits for metadata-only data.
        const tagged = Serialization.AuxiliaryData.fromCbor(
          HexBlob(`d90103a100${metadata}`),
        );
        transaction.setAuxiliaryData(tagged);
        const body = transaction.body();
        body.setAuxiliaryDataHash(
          blake2b.hash<Hash32ByteBase16>(tagged.toCbor(), 32),
        );
        transaction.setBody(body);

        expect(
          refusalsOf(inspectBuilt({ transaction, resolvedInputs })),
        ).toEqual([]);
      });

      it('refuses auxiliary data it cannot decode', () => {
        const { transaction, resolvedInputs } = buildTransaction(ownerSpend());
        const unreadable = {
          body: () => transaction.body(),
          witnessSet: () => transaction.witnessSet(),
          auxiliaryData: () => {
            throw new Error('not metadata');
          },
        } as unknown as Serialization.Transaction;
        expect(
          refusalsOf(inspectBuilt({ transaction: unreadable, resolvedInputs })),
        ).toEqual([
          {
            code: 'custody-unsupported-operation',
            reason: 'auxiliary-data-unreadable',
          },
        ]);
      });
    });

    it('refuses a redeemer pointer named twice', () => {
      const { transaction, resolvedInputs } = buildTransaction(rewrite);
      // The array form of the redeemer list can repeat a pointer; Device, then SweepGrant, on input 0.
      transaction.setWitnessSet(
        Serialization.TransactionWitnessSet.fromCbor(
          HexBlob('a10582840000d87980820102840000d87b80820102'),
        ),
      );
      expect(refusalsOf(inspectBuilt({ transaction, resolvedInputs }))).toEqual(
        [
          {
            code: 'custody-unsupported-operation',
            reason: 'duplicate-redeemer',
            purpose: Cardano.RedeemerPurpose.spend,
            index: 0,
          },
        ],
      );
    });

    it('refuses a collateral return to the bare account validator', () => {
      expect(
        refusalsOf(
          inspect({
            ...rewrite,
            collateralReturn: payout(4_500_000n, BARE_VALIDATOR_ADDRESS),
          }),
        ),
      ).toEqual([
        {
          code: 'custody-locked-output',
          reason: 'unspendable-address',
          location: { kind: 'collateral-return' },
        },
      ]);
    });

    it('refuses a stray state NFT among the inputs', () => {
      const strayWithNft = utxo(0x40, {
        ...payout(1_000_000n, SPONSOR_ADDRESS),
        value: {
          coins: 1_000_000n,
          assets: new Map([[otherIdentity.stateNftAssetId, 1n]]),
        },
      });
      expect(
        refusalsOf(
          inspect({
            ...rewrite,
            inputs: [...rewrite.inputs, strayWithNft],
            outputs: [
              ...rewrite.outputs,
              {
                address: otherIdentity.address,
                value: {
                  coins: 1_000_000n,
                  assets: new Map([[otherIdentity.stateNftAssetId, 1n]]),
                },
              },
            ],
          }),
        ),
      ).toEqual([
        {
          code: 'custody-context-mismatch',
          reason: 'foreign-account',
          account: otherAccount,
        },
        {
          code: 'custody-context-mismatch',
          reason: 'control-output-without-control-input',
          account: otherAccount,
        },
        {
          code: 'custody-unsupported-operation',
          reason: 'account-token-misplaced',
          location: {
            kind: 'input',
            input: { txId: strayWithNft[0].txId, index: 0 },
          },
        },
      ]);
    });

    it('lists refusals in check order', () => {
      expect(
        reasonsOf(
          inspect(
            {
              ...rewrite,
              outputs: [
                ...rewrite.outputs,
                payout(1_000_000n, BARE_VALIDATOR_ADDRESS),
              ],
              certificates: [
                {
                  __typename: Cardano.CertificateType.Unregistration,
                  stakeCredential: STAKE_CREDENTIAL,
                  deposit: 2_000_000n,
                },
              ],
              requiredSigners: [],
            },
            { deviceKeyHash: OTHER_DEVICE_KEY },
          ),
        ),
      ).toEqual([
        'custody-unsupported-operation/refused-certificate',
        'custody-device-not-listed/not-listed',
        'custody-device-not-listed/not-required-signer',
        'custody-locked-output/unspendable-address',
      ]);
    });
  });
});
