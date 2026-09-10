import { describe, expect, it } from 'vitest';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../src/api-error';

describe('BitcoinAPIError', () => {
  it('sets the error name, code and info from the constructor arguments', () => {
    const error = new BitcoinAPIError(
      BitcoinAPIErrorCode.Refused,
      'User rejected the request',
    );

    expect(error.name).toBe('BitcoinAPIError');
    expect(error.code).toBe(BitcoinAPIErrorCode.Refused);
    expect(error.info).toBe('User rejected the request');
  });

  it('propagates the info as the standard Error message', () => {
    const error = new BitcoinAPIError(
      BitcoinAPIErrorCode.InternalError,
      'Something went wrong',
    );

    expect(error.message).toBe('Something went wrong');
  });

  it('is an instance of Error', () => {
    const error = new BitcoinAPIError(
      BitcoinAPIErrorCode.InvalidRequest,
      'Invalid input',
    );

    expect(error).toBeInstanceOf(Error);
  });

  it('maps each error code to its documented numeric value', () => {
    expect(BitcoinAPIErrorCode.InvalidRequest).toBe(-1);
    expect(BitcoinAPIErrorCode.InternalError).toBe(-2);
    expect(BitcoinAPIErrorCode.Refused).toBe(-3);
  });
});
