import {
  MultisigNotSupportedError,
  WrongScriptTypeError,
} from '@lace-lib/bitcoin-air-gapped-protocol';
import { TransportStatusError } from '@ledgerhq/errors';
import { describe, expect, it } from 'vitest';

import { classifyHardwareError } from '../src/classify-hardware-error';
import { isHardwareErrorCategory } from '../src/hardware-error-categories';
import { WrongDeviceError } from '../src/seed-signer-errors';

describe('classifyHardwareError -- air-gapped QR exchange cancel', () => {
  it('classifies the overlay cancel as cancelled, not unauthorized', () => {
    const error = new Error('Seed signer QR exchange was cancelled');
    error.name = 'AirGappedQrExchangeCancelledError';
    expect(classifyHardwareError(error)).toBe('cancelled');
  });

  it('still classifies a device-side cancel message as unauthorized', () => {
    expect(classifyHardwareError(new Error('Cancelled'))).toBe('unauthorized');
  });
});

/**
 * Builds errors shaped exactly like @ledgerhq/errors TransportStatusError and
 * LockedDeviceError: the class name plus a "Ledger device: <text> (0x<code>)"
 * message. The fixtures document the observed shapes; the real-construction
 * cases below build actual @ledgerhq/errors instances so a library upgrade
 * that changes the message format or the 0x5515 -> LockedDeviceError remap
 * fails the tests instead of silently regressing classification.
 */
const ledgerTransportStatusError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

describe('classifyHardwareError -- Ledger transport status errors', () => {
  it('classifies a locked device as device-locked regardless of the app', () => {
    const error = ledgerTransportStatusError(
      'LockedDeviceError',
      'Ledger device: Locked device (0x5515)',
    );
    expect(classifyHardwareError(error)).toBe('device-locked');
  });

  it.each([
    ['CLA_NOT_SUPPORTED', 'Ledger device: CLA_NOT_SUPPORTED (0x6e00)'],
    [
      'CLA_NOT_SUPPORTED_BOOTLOADER',
      'Ledger device: CLA_NOT_SUPPORTED_BOOTLOADER (0x6e01)',
    ],
    ['INS_NOT_SUPPORTED', 'Ledger device: INS_NOT_SUPPORTED (0x6d00)'],
  ])('classifies a wrong-app %s status as app-not-open', (_, message) => {
    const error = ledgerTransportStatusError('TransportStatusError', message);
    expect(classifyHardwareError(error)).toBe('app-not-open');
  });

  it('does not classify an unrecognized status code as app-not-open', () => {
    const error = ledgerTransportStatusError(
      'TransportStatusError',
      'Ledger device: Invalid data received (0x6a80)',
    );
    expect(classifyHardwareError(error)).toBe('generic');
  });

  it('classifies a real locked-device instance as device-locked', () => {
    expect(classifyHardwareError(new TransportStatusError(0x5515))).toBe(
      'device-locked',
    );
  });

  it.each([
    ['0x6e00', 0x6e00],
    ['0x6e01', 0x6e01],
    ['0x6d00', 0x6d00],
  ])(
    'classifies a real %s wrong-app instance as app-not-open',
    (_, statusCode) => {
      expect(classifyHardwareError(new TransportStatusError(statusCode))).toBe(
        'app-not-open',
      );
    },
  );

  it('classifies a silent export refusal as wrong-network-app', () => {
    const error = ledgerTransportStatusError(
      'TransportStatusError',
      'Ledger device: UNKNOWN_ERROR (0x6a82)',
    );
    expect(classifyHardwareError(error)).toBe('wrong-network-app');
  });

  it('classifies a real silent export refusal instance as wrong-network-app', () => {
    expect(classifyHardwareError(new TransportStatusError(0x6a_82))).toBe(
      'wrong-network-app',
    );
  });
});

describe('classifyHardwareError -- Ledger Cardano app connection errors', () => {
  it('classifies a Cardano app connection failure as app-not-open', () => {
    const error = new Error(
      'Cannot communicate with Ledger Cardano App. General error 0x6e01',
    );
    expect(classifyHardwareError(error)).toBe('app-not-open');
  });

  it('classifies a locked device reported via the Cardano app path as device-locked', () => {
    const error = new Error(
      'Cannot communicate with Ledger Cardano App. General error 0x5515',
    );
    expect(classifyHardwareError(error)).toBe('device-locked');
  });
});

describe('classifyHardwareError -- Seed Signer Bitcoin export errors', () => {
  it('classifies a wrong-script-type domain error to its specific category', () => {
    expect(classifyHardwareError(new WrongScriptTypeError())).toBe(
      'wrong-script-type',
    );
  });

  it('classifies a multisig domain error to its specific category', () => {
    expect(classifyHardwareError(new MultisigNotSupportedError())).toBe(
      'multisig-not-supported',
    );
  });

  it('classifies a wrong-device domain error to its specific category', () => {
    expect(classifyHardwareError(new WrongDeviceError())).toBe('wrong-device');
  });

  it('classifies a plain error carrying the wrong-device code in its message', () => {
    expect(classifyHardwareError(new Error('SEED_SIGNER_WRONG_DEVICE'))).toBe(
      'wrong-device',
    );
  });

  it('does not collapse the Bitcoin export errors into the generic category', () => {
    expect(classifyHardwareError(new WrongScriptTypeError())).not.toBe(
      'generic',
    );
    expect(classifyHardwareError(new MultisigNotSupportedError())).not.toBe(
      'generic',
    );
    expect(classifyHardwareError(new WrongDeviceError())).not.toBe('generic');
  });

  it('still returns generic for an unrecognised error', () => {
    expect(classifyHardwareError(new Error('boom'))).toBe('generic');
  });
});

describe('classifyHardwareError -- Trezor THP (Safe 7+) errors', () => {
  it('classifies a THP transport-busy failure as trezor-suite-required', () => {
    expect(
      classifyHardwareError(new Error('Initialize failed: ThpTransportBusy')),
    ).toBe('trezor-suite-required');
  });

  it('classifies a Trezor Connect payload carrying a THP code', () => {
    const wrapped = new Error('Trezor transport failed');
    (wrapped as { innerError?: unknown }).innerError = {
      error: 'Initialize failed',
      code: 'ThpTransportBusy',
    };
    expect(classifyHardwareError(wrapped)).toBe('trezor-suite-required');
  });

  it('classifies a THP device-locked failure as trezor-suite-required', () => {
    expect(classifyHardwareError(new Error('ThpDeviceLocked'))).toBe(
      'trezor-suite-required',
    );
  });

  it('does not divert non-THP transport failures', () => {
    expect(classifyHardwareError(new Error('Transport failed'))).toBe(
      'device-disconnected',
    );
  });
});

describe('classifyHardwareError -- Chrome Local Network Access denial', () => {
  it('classifies the denied localhost permission as local-network-blocked', () => {
    expect(
      classifyHardwareError(new Error('Browser_LocalNetworkPermissionMissing')),
    ).toBe('local-network-blocked');
  });

  it('classifies a Trezor Connect payload carrying the permission code', () => {
    const wrapped = new Error('Trezor call failed');
    (wrapped as { innerError?: unknown }).innerError = {
      error: 'Local network permission missing',
      code: 'Browser_LocalNetworkPermissionMissing',
    };
    expect(classifyHardwareError(wrapped)).toBe('local-network-blocked');
  });
});

describe('isHardwareErrorCategory', () => {
  // Re-listing the members pins the public contract: renaming or removing a
  // category must break this test, not silently narrow the guard.
  it.each([
    'already-added',
    'app-not-open',
    'cancelled',
    'device-disconnected',
    'device-locked',
    'device-picker-rejected',
    'generic',
    'local-network-blocked',
    'multisig-not-supported',
    'not-supported',
    'trezor-suite-required',
    'unauthorized',
    'version-unsupported',
    'wrong-device',
    'wrong-network-app',
    'wrong-script-type',
  ] as const)('accepts the category %s', category => {
    expect(isHardwareErrorCategory(category)).toBe(true);
  });

  it('accepts what classifyHardwareError classifies a live error into', () => {
    expect(
      isHardwareErrorCategory(
        classifyHardwareError(
          new Error('Cannot communicate with Ledger Cardano App'),
        ),
      ),
    ).toBe(true);
  });

  it.each(['creation-failed', 'biometric-auth-failed', '', undefined])(
    'rejects the non-device reason %s',
    reason => {
      expect(isHardwareErrorCategory(reason)).toBe(false);
    },
  );
});
