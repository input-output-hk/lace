import { AuthenticationCancelledError } from '@lace-contract/signer';
import { describe, expect, it } from 'vitest';

import {
  classifyDeviceHint,
  deviceHintKey,
  withDeviceHint,
} from '../../src/store/side-effects/device-hint';

import type { DeviceSigningError } from '../../src/store/side-effects/device-hint';

/** The chain a closed Cardano app produces: a status error, transport-wrapped. */
const appNotOpenError = () => {
  const status = new Error('General error 0x6e01');
  const transport = new Error(
    'Cannot communicate with Ledger Cardano App',
  ) as Error & { innerError?: unknown };
  transport.innerError = status;
  return transport;
};

describe('classifyDeviceHint', () => {
  it('names the app-not-open guidance for a closed Cardano app', () => {
    expect(classifyDeviceHint(appNotOpenError())).toBe(
      'hw-error.app-not-open.subtitle',
    );
  });

  it('names the locked-device guidance for status 0x5515', () => {
    expect(classifyDeviceHint(new Error('General error 0x5515'))).toBe(
      'hw-error.device-locked.subtitle',
    );
  });

  it('names the disconnected guidance for a lost USB handle', () => {
    expect(
      classifyDeviceHint(new Error('Pre-authorized USB device not found')),
    ).toBe('hw-error.device-disconnected.subtitle');
  });

  // The generic copy ("Something went wrong…") says less than the failure key it
  // would sit under, so it is worse than showing nothing extra.
  it('offers nothing for an error it cannot categorise', () => {
    expect(classifyDeviceHint(new Error('something else entirely'))).toBe(
      undefined,
    );
  });
});

describe('withDeviceHint', () => {
  it('carries the guidance to a catcher that cannot see where the error came from', () => {
    const wrapped = withDeviceHint(appNotOpenError());
    expect(deviceHintKey(wrapped)).toBe('hw-error.app-not-open.subtitle');
    expect((wrapped as DeviceSigningError).innerError).toBeInstanceOf(Error);
  });

  // The sweep reads this identity to tell "the user dismissed the prompt" from
  // "the sweep failed"; wrapping it would turn a cancel into a failure screen.
  it('leaves a cancellation with its own identity', () => {
    const cancelled = new AuthenticationCancelledError();
    expect(withDeviceHint(cancelled)).toBe(cancelled);
  });

  it('leaves an uncategorised error untouched', () => {
    const error = new Error('something else entirely');
    expect(withDeviceHint(error)).toBe(error);
  });
});

describe('deviceHintKey', () => {
  // The reason the wrapper exists: a node that answers "transaction rejected"
  // trips the same keyword test a device rejection does, so a provider error
  // reaching the sweep's catchError must not be reported as a device problem.
  it('offers nothing for a provider error that reads like a device refusal', () => {
    expect(deviceHintKey(new Error('transaction rejected by the node'))).toBe(
      undefined,
    );
  });
});
