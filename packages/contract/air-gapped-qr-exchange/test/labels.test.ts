import { describe, expect, it } from 'vitest';

import { resolveExchangeLabelKeys } from '../src/labels';

describe('resolveExchangeLabelKeys', () => {
  it('uses per-phase defaults when no keys are supplied', () => {
    expect(resolveExchangeLabelKeys({}, 'request')).toEqual({
      titleKey: 'v2.air-gapped-qr-exchange.request.title',
      instructionKey: 'v2.air-gapped-qr-exchange.request.instruction',
    });

    expect(resolveExchangeLabelKeys({}, 'scan')).toEqual({
      titleKey: 'v2.air-gapped-qr-exchange.scan.title',
      instructionKey: 'v2.air-gapped-qr-exchange.scan.instruction',
    });
  });

  it('surfaces the caller-supplied titleKey and instructionKey', () => {
    const result = resolveExchangeLabelKeys(
      {
        titleKey: 'v2.ur-scanner.title',
        instructionKey: 'v2.ur-scanner.progress',
      },
      'request',
    );

    expect(result).toEqual({
      titleKey: 'v2.ur-scanner.title',
      instructionKey: 'v2.ur-scanner.progress',
    });
  });

  it('falls back per field when only one key is supplied', () => {
    expect(
      resolveExchangeLabelKeys({ titleKey: 'v2.ur-scanner.title' }, 'scan'),
    ).toEqual({
      titleKey: 'v2.ur-scanner.title',
      instructionKey: 'v2.air-gapped-qr-exchange.scan.instruction',
    });
  });

  it('uses requestInstructionKey in the request phase', () => {
    expect(
      resolveExchangeLabelKeys(
        {
          requestInstructionKey:
            'v2.air-gapped-qr-exchange.blind-signing.instruction',
        },
        'request',
      ).instructionKey,
    ).toBe('v2.air-gapped-qr-exchange.blind-signing.instruction');
  });

  it('ignores requestInstructionKey in the scan phase and uses the default', () => {
    expect(
      resolveExchangeLabelKeys(
        {
          requestInstructionKey:
            'v2.air-gapped-qr-exchange.blind-signing.instruction',
        },
        'scan',
      ).instructionKey,
    ).toBe('v2.air-gapped-qr-exchange.scan.instruction');
  });

  it('keeps instructionKey winning in the scan phase', () => {
    expect(
      resolveExchangeLabelKeys(
        {
          instructionKey: 'v2.keystone-bitcoin.import.instruction',
          requestInstructionKey:
            'v2.air-gapped-qr-exchange.blind-signing.instruction',
        },
        'scan',
      ).instructionKey,
    ).toBe('v2.keystone-bitcoin.import.instruction');
  });

  it('prefers requestInstructionKey over instructionKey in the request phase', () => {
    expect(
      resolveExchangeLabelKeys(
        {
          instructionKey: 'v2.keystone-bitcoin.import.instruction',
          requestInstructionKey:
            'v2.air-gapped-qr-exchange.blind-signing.instruction',
        },
        'request',
      ).instructionKey,
    ).toBe('v2.air-gapped-qr-exchange.blind-signing.instruction');
  });
});
