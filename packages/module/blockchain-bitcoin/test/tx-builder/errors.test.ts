import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { describe, expect, it } from 'vitest';

import {
  BitcoinTxBuildError,
  BitcoinTxBuildErrorCode,
  buildErrorTranslationKey,
  TransactionBuilder,
} from '../../src/tx-builder';

import type { DerivedAddress } from '../../src/common';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

const knownAddress = {
  address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
  publicKeyHex:
    '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
} as unknown as DerivedAddress;

const changeAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const recipientAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';

const utxo: BitcoinUTxO = {
  txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
  index: 0,
  satoshis: 10_000_000,
  address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
};

const captureError = (function_: () => unknown): unknown => {
  try {
    function_();
  } catch (error) {
    return error;
  }
  throw new Error('Expected function to throw');
};

describe('buildErrorTranslationKey', () => {
  it.each([
    [BitcoinTxBuildErrorCode.NoUtxos, 'tx-executor.building-error.no-utxos'],
    [
      BitcoinTxBuildErrorCode.InsufficientFunds,
      'tx-executor.building-error.insufficient-funds',
    ],
    [
      BitcoinTxBuildErrorCode.NoOutputs,
      'tx-executor.building-error.no-outputs',
    ],
    [
      BitcoinTxBuildErrorCode.ChangeAddressNotSet,
      'tx-executor.building-error.generic',
    ],
    [
      BitcoinTxBuildErrorCode.InvalidChangeAddress,
      'tx-executor.building-error.invalid-change-address',
    ],
    [
      BitcoinTxBuildErrorCode.InvalidRecipientAddress,
      'tx-executor.building-error.invalid-recipient-address',
    ],
    [
      BitcoinTxBuildErrorCode.UnresolvedUtxoAddress,
      'tx-executor.building-error.unresolved-utxo-address',
    ],
    [
      BitcoinTxBuildErrorCode.MessageTooLong,
      'tx-executor.building-error.message-too-long',
    ],
  ])('maps code %s to its translation key', (code, expectedKey) => {
    expect(buildErrorTranslationKey(new BitcoinTxBuildError(code, 'msg'))).toBe(
      expectedKey,
    );
  });

  it('falls back to the generic key for non-build errors', () => {
    expect(buildErrorTranslationKey(new Error('boom'))).toBe(
      'tx-executor.building-error.generic',
    );
    expect(buildErrorTranslationKey('not-an-error')).toBe(
      'tx-executor.building-error.generic',
    );
  });
});

describe('TransactionBuilder typed errors', () => {
  const newBuilder = () =>
    new TransactionBuilder(BitcoinNetwork.Testnet, 0.001, [knownAddress]);

  it('throws NoUtxos when the UTxO set is empty', () => {
    const builder = newBuilder();
    builder.setChangeAddress(changeAddress);
    builder.addOutput(recipientAddress, 1000);

    const error = captureError(() => builder.build());
    expect(error).toBeInstanceOf(BitcoinTxBuildError);
    expect((error as BitcoinTxBuildError).code).toBe(
      BitcoinTxBuildErrorCode.NoUtxos,
    );
  });

  it('throws InsufficientFunds when funds cannot cover amount plus fee', () => {
    const builder = newBuilder();
    builder.setUtxoSet([utxo]);
    builder.setChangeAddress(changeAddress);
    builder.addOutput(recipientAddress, utxo.satoshis + 1_000_000);

    const error = captureError(() => builder.build());
    expect(error).toBeInstanceOf(BitcoinTxBuildError);
    expect((error as BitcoinTxBuildError).code).toBe(
      BitcoinTxBuildErrorCode.InsufficientFunds,
    );
  });

  it('throws ChangeAddressNotSet when change address is missing', () => {
    const builder = newBuilder();
    builder.setUtxoSet([utxo]);
    builder.addOutput(recipientAddress, 1000);

    expect(
      (captureError(() => builder.build()) as BitcoinTxBuildError).code,
    ).toBe(BitcoinTxBuildErrorCode.ChangeAddressNotSet);
  });

  it('throws NoOutputs when no outputs were added', () => {
    const builder = newBuilder();
    builder.setUtxoSet([utxo]);
    builder.setChangeAddress(changeAddress);

    expect(
      (captureError(() => builder.build()) as BitcoinTxBuildError).code,
    ).toBe(BitcoinTxBuildErrorCode.NoOutputs);
  });

  it('throws UnresolvedUtxoAddress when a selected UTxO address is unknown', () => {
    const builder = new TransactionBuilder(BitcoinNetwork.Testnet, 0.001, []);
    builder.setUtxoSet([utxo]);
    builder.setChangeAddress(changeAddress);
    builder.addOutput(recipientAddress, 1000);

    expect(
      (captureError(() => builder.build()) as BitcoinTxBuildError).code,
    ).toBe(BitcoinTxBuildErrorCode.UnresolvedUtxoAddress);
  });

  it('throws InvalidChangeAddress for an invalid change address', () => {
    const builder = newBuilder();

    expect(
      (
        captureError(() =>
          builder.setChangeAddress('not-a-valid-address'),
        ) as BitcoinTxBuildError
      ).code,
    ).toBe(BitcoinTxBuildErrorCode.InvalidChangeAddress);
  });

  it('throws InvalidRecipientAddress for an invalid recipient address', () => {
    const builder = newBuilder();

    expect(
      (
        captureError(() =>
          builder.addOutput('not-a-valid-address', 1000),
        ) as BitcoinTxBuildError
      ).code,
    ).toBe(BitcoinTxBuildErrorCode.InvalidRecipientAddress);
  });

  it('throws MessageTooLong when the OP_RETURN message exceeds 80 bytes', () => {
    const builder = newBuilder();

    expect(
      (
        captureError(() =>
          builder.addOpReturnOutput('a'.repeat(81)),
        ) as BitcoinTxBuildError
      ).code,
    ).toBe(BitcoinTxBuildErrorCode.MessageTooLong);
  });
});
