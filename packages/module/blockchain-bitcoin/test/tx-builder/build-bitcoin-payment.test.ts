import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { Err, Ok, Timestamp } from '@lace-lib/util';
import { address as bitcoinAddress, networks, opcodes } from 'bitcoinjs-lib';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { decodeUnsignedTxFromString } from '../../src/common';
import {
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
  buildBitcoinPayment,
} from '../../src/tx-builder';

import type { BuildBitcoinPaymentParams } from '../../src/tx-builder';
import type { BitcoinWallet } from '../../src/wallet';
import type { Activity } from '@lace-contract/activities';
import type {
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';

const ownAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const recipientAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';
const previousTxId =
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58';

const derivedOwnAddress = {
  address: ownAddress,
  addressType: 'NativeSegWit',
  network: BitcoinNetwork.Testnet,
  account: 0,
  chain: 'external',
  index: 0,
  publicKeyHex:
    '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
};

const feeMarket = {
  fast: { feeRate: 0.001, targetConfirmationTime: 60 },
  standard: { feeRate: 0.0005, targetConfirmationTime: 600 },
  slow: { feeRate: 0.0001, targetConfirmationTime: 6000 },
};

const makeUtxo = (index: number, satoshis: number): BitcoinUTxO => ({
  txId: previousTxId,
  index,
  satoshis,
  address: ownAddress,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
});

const inFlight = (metadata: BitcoinInFlightUtxoActivityMetadata): Activity => ({
  accountId: AccountId('test-account'),
  activityId: 'pending-activity-id',
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: { Bitcoin: metadata },
});

const makeWallet = (
  utxos: BitcoinUTxO[],
  overrides: Record<string, unknown> = {},
): BitcoinWallet =>
  ({
    network: BitcoinNetwork.Testnet,
    utxos$: of(utxos),
    addresses$: of([derivedOwnAddress]),
    address: derivedOwnAddress,
    getCurrentFeeMarket: vi.fn(() => of(Ok(feeMarket))),
    ...overrides,
  } as unknown as BitcoinWallet);

const fundedUtxos = [makeUtxo(0, 10_000_000)];

const makeParams = (
  overrides: Partial<BuildBitcoinPaymentParams> = {},
): BuildBitcoinPaymentParams => ({
  wallet: makeWallet(fundedUtxos),
  pendingActivities: [],
  outputs: [{ address: recipientAddress, amount: 1_000_000 }],
  feeRate: { feeOption: 'Low' },
  ...overrides,
});

const outputAddress = (script: Buffer): string | undefined => {
  try {
    return bitcoinAddress.fromOutputScript(script, networks.testnet);
  } catch {
    return undefined;
  }
};

describe('buildBitcoinPayment', () => {
  it('builds a Custom rate without reading the fee market', async () => {
    const getCurrentFeeMarket = vi.fn(() =>
      of(
        Err(
          new ProviderError(
            ProviderFailure.ConnectionFailure,
            undefined,
            'Fee market unreachable',
          ),
        ),
      ),
    );
    const logger = { debug: vi.fn() };

    const payment = await buildBitcoinPayment(
      makeParams({
        wallet: makeWallet(fundedUtxos, { getCurrentFeeMarket }),
        feeRate: { feeOption: 'Custom', customFeeRate: 0.0002 },
        logger: logger as unknown as BuildBitcoinPaymentParams['logger'],
      }),
    );

    expect(payment.fee).toBeGreaterThan(0n);
    expect(getCurrentFeeMarket).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Bitcoin buildTx: Using fee rate of 0.0002 BTC/kB',
    );
  });

  it.each([
    ['Fast', 0.001],
    ['Average', 0.0005],
    ['Low', 0.0001],
  ] as const)('resolves %s to its fee market tier', async (feeOption, rate) => {
    const logger = { debug: vi.fn() };

    await buildBitcoinPayment(
      makeParams({
        feeRate: { feeOption },
        logger: logger as unknown as BuildBitcoinPaymentParams['logger'],
      }),
    );

    expect(logger.debug).toHaveBeenCalledWith(
      `Bitcoin buildTx: Using fee rate of ${rate} BTC/kB`,
    );
  });

  it('charges a higher fee for a faster tier', async () => {
    const slow = await buildBitcoinPayment(
      makeParams({ feeRate: { feeOption: 'Low' } }),
    );
    const fast = await buildBitcoinPayment(
      makeParams({ feeRate: { feeOption: 'Fast' } }),
    );

    expect(fast.fee).toBeGreaterThan(slow.fee);
  });

  it.each([
    ['no custom rate at all', undefined],
    ['a zero rate', 0],
    ['a negative rate', -0.0001],
    ['a non-finite rate', Number.NaN],
  ])('throws InvalidFeeRate for %s', async (_label, customFeeRate) => {
    const result = buildBitcoinPayment(
      makeParams({ feeRate: { feeOption: 'Custom', customFeeRate } }),
    );

    await expect(result).rejects.toBeInstanceOf(BitcoinTxBuildError);
    await expect(result).rejects.toMatchObject({
      code: BitcoinTxBuildErrorCode.InvalidFeeRate,
    });
  });

  it('does not spend outpoints consumed by pending activities', async () => {
    const payment = await buildBitcoinPayment(
      makeParams({
        wallet: makeWallet([makeUtxo(0, 10_000_000), makeUtxo(1, 5_000_000)]),
        pendingActivities: [
          inFlight({
            consumedInputs: [{ txId: previousTxId, index: 0 }],
            producedOutputs: [],
          }),
        ],
      }),
    );

    const { context: psbt } = decodeUnsignedTxFromString(payment.serializedTx);
    expect(psbt.txInputs.map(input => input.index)).toEqual([1]);
  });

  it('fails when every outpoint is consumed by a pending activity', async () => {
    const result = buildBitcoinPayment(
      makeParams({
        pendingActivities: [
          inFlight({
            consumedInputs: [{ txId: previousTxId, index: 0 }],
            producedOutputs: [],
          }),
        ],
      }),
    );

    await expect(result).rejects.toMatchObject({
      code: BitcoinTxBuildErrorCode.NoUtxos,
    });
  });

  it('sends the change to the wallet address', async () => {
    const payment = await buildBitcoinPayment(makeParams());

    const { context: psbt } = decodeUnsignedTxFromString(payment.serializedTx);
    const addresses = psbt.txOutputs.map(output =>
      outputAddress(output.script),
    );
    expect(addresses).toEqual([recipientAddress, ownAddress]);
    expect(psbt.txOutputs[0].value).toBe(1_000_000);
  });

  it('adds an OP_RETURN output for the memo', async () => {
    const payment = await buildBitcoinPayment(makeParams({ memo: 'hello' }));

    const { context: psbt } = decodeUnsignedTxFromString(payment.serializedTx);
    const opReturn = psbt.txOutputs.filter(
      output => output.script[0] === opcodes.OP_RETURN,
    );
    expect(opReturn).toHaveLength(1);
    expect(opReturn[0].script.toString('utf8')).toContain('hello');
    expect(opReturn[0].value).toBe(0);
  });

  it('adds no OP_RETURN output without a memo', async () => {
    const payment = await buildBitcoinPayment(makeParams());

    const { context: psbt } = decodeUnsignedTxFromString(payment.serializedTx);
    expect(
      psbt.txOutputs.some(output => output.script[0] === opcodes.OP_RETURN),
    ).toBe(false);
  });

  it('returns the fee paid by the built transaction', async () => {
    const payment = await buildBitcoinPayment(makeParams());

    const tx = decodeUnsignedTxFromString(payment.serializedTx);
    const inputTotal = tx.context.data.inputs.reduce(
      (sum, input) => sum + (input.witnessUtxo?.value ?? 0),
      0,
    );
    const outputTotal = tx.context.txOutputs.reduce(
      (sum, output) => sum + output.value,
      0,
    );
    expect(payment.fee).toBe(BigInt(tx.fee));
    expect(payment.fee).toBe(BigInt(inputTotal - outputTotal));
    expect(tx.network).toBe(BitcoinNetwork.Testnet);
  });
});
