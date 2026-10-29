import {
  Serialization,
  ProviderError,
  ProviderFailure,
  SerializationError,
  SerializationFailure,
} from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { sanitiseSignTxError } from '../src/common/utils/sign-tx-error-details';
import { inspectTransaction } from '../src/common/utils/transaction-inspector';

describe('signing error diagnostics', () => {
  it.each(Object.values(ProviderFailure))(
    'preserves SDK provider reason %s without the private response detail',
    reason => {
      const error = new ProviderError(
        reason,
        new TypeError('Failed to fetch'),
        'alice@example.com',
      );
      expect(sanitiseSignTxError(error, 'signing preparation')).toEqual({
        stage: 'signing preparation',
        name: 'ProviderError',
        message: `${reason} ([redacted])`,
        reason,
        cause: {
          stage: 'signing preparation',
          name: 'TypeError',
          message: 'Failed to fetch',
        },
      });
    },
  );
  it.each(Object.values(SerializationFailure))(
    'preserves SDK serialisation reason %s without transaction data',
    reason => {
      expect(
        sanitiseSignTxError(
          new SerializationError(reason, 'addr_test1private'),
          'transaction inspection',
        ),
      ).toEqual({
        stage: 'transaction inspection',
        name: 'SerializationError',
        message: `${reason} ([redacted])`,
        reason,
      });
    },
  );
  it('propagates the SDK error through transaction inspection', async () => {
    expect((await inspectTransaction('deadbeef')).error).toEqual({
      stage: 'transaction inspection',
      name: 'CborInvalidOperationException',
      message: 'Major type mismatch, expected type 4 but got 6',
    });
  });
  it('preserves the real SDK parser error, including expected and actual CBOR types', () => {
    let error: unknown;
    try {
      Serialization.Transaction.fromCbor(Serialization.TxCBOR('deadbeef'));
    } catch (caught) {
      error = caught;
    }
    expect(sanitiseSignTxError(error, 'transaction inspection')).toEqual({
      stage: 'transaction inspection',
      name: 'CborInvalidOperationException',
      message: 'Major type mismatch, expected type 4 but got 6',
    });
  });

  it('preserves error causes and redacts variable fields before propagation', () => {
    const error = Object.assign(new Error('Wallet not found for ID: Alice'), {
      name: 'APIError',
      code: -2,
      cause: new TypeError('Unexpected end of buffer'),
      stack: 'alice@example.com /Users/Alice/secret',
    });
    expect(sanitiseSignTxError(error, 'signing preparation')).toEqual({
      stage: 'signing preparation',
      name: 'APIError',
      code: -2,
      message: 'Wallet not found for ID: [redacted]',
      cause: {
        stage: 'signing preparation',
        name: 'TypeError',
        message: 'Unexpected end of buffer',
      },
    });
  });

  it.each([
    'Alice alice@example.com addr_test1private https://example.com/?secret=123',
    'Unexpected end of buffer alice@example.com',
    'Major type mismatch, expected type alice@example.com but got 6',
    '__proto__',
  ])('never copies unrecognised free text: %s', message => {
    const result = sanitiseSignTxError(
      { name: message, message, code: message, stack: message },
      'signing',
    );
    expect(result).toEqual({
      stage: 'signing',
      name: 'Error',
      message: '[Unrecognised message omitted for privacy]',
    });
  });

  it('bounds cyclic SDK innerError chains and remains safe after serialisation', () => {
    const error = Object.assign(new Error('Unexpected end of buffer'), {
      innerError: undefined as unknown,
    });
    error.innerError = error;
    const result = sanitiseSignTxError(error, 'signing');
    expect(JSON.stringify(result).length).toBeLessThan(1000);
    expect(
      sanitiseSignTxError(JSON.parse(JSON.stringify(result)), 'signing'),
    ).toEqual(result);
  });
});
