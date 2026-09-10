import { describe, expect, it, vi } from 'vitest';

import {
  mapMidnightBuildError,
  mapMidnightConfirmError,
  mapMidnightSubmitError,
} from '../../../src/store/tx-executor/error-mapping';

vi.mock('@lace-lib/util-store', async () => ({
  ...(await vi.importActual('@lace-lib/util-store')),
  serializeError: ({ message, name }: Error) => ({ message, name }),
}));

vi.mock('@lace-lib/util-redacted', () => ({
  filterRedacted: (value: unknown) => value,
}));

describe('mapMidnightConfirmError', () => {
  it('returns generic keys with serialized error', () => {
    const error = new Error('Some SDK error');
    error.name = 'SdkError';

    const result = mapMidnightConfirmError(error);

    expect(result.errorTranslationKeys).toEqual({
      title: 'tx-executor.confirmation-error.generic.title',
      subtitle: 'tx-executor.confirmation-error.generic.subtitle',
    });
    expect(result.error).toEqual({
      message: 'Some SDK error',
      name: 'SdkError',
    });
  });
});

describe('mapMidnightSubmitError', () => {
  it('returns generic keys with serialized error', () => {
    const error = new Error('Network timeout');

    const result = mapMidnightSubmitError(error);

    expect(result.errorTranslationKeys).toEqual({
      title: 'tx-executor.submission-error.generic.title',
      subtitle: 'tx-executor.submission-error.generic.subtitle',
    });
    expect(result.error).toBeDefined();
  });
});

describe('mapMidnightBuildError', () => {
  it('maps "Not enough Dust generated" error to insufficient-dust key', () => {
    const error = new Error('Not enough Dust generated to pay the fee');

    expect(mapMidnightBuildError(error)).toBe(
      'tx-executor.building-error.insufficient-dust',
    );
  });

  it('maps "No dust tokens found" error to insufficient-dust key', () => {
    const error = new Error('No dust tokens found in the wallet state');

    expect(mapMidnightBuildError(error)).toBe(
      'tx-executor.building-error.insufficient-dust',
    );
  });

  it('returns generic key for unknown errors', () => {
    const error = new Error('Unknown error');

    expect(mapMidnightBuildError(error)).toBe(
      'tx-executor.building-error.generic',
    );
  });

  it('handles errors with undefined message gracefully', () => {
    const error = new Error();

    expect(mapMidnightBuildError(error)).toBe(
      'tx-executor.building-error.generic',
    );
  });
});
