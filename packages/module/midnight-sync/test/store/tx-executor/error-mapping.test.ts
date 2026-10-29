import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import { AttestationError } from '../../../src/store/attested-proving-service';
import { TemenosAttestationError } from '../../../src/store/temenos-attested-prover';
import {
  mapMidnightBuildError,
  mapMidnightConfirmError,
  mapMidnightSubmitError,
} from '../../../src/store/tx-executor/error-mapping';

describe('mapMidnightConfirmError', () => {
  it.each([mapMidnightConfirmError, mapMidnightSubmitError])(
    'preserves the SDK FiberFailure message despite its custom JSON representation',
    async mapError => {
      const error = await Effect.runPromise(
        Effect.fail(new Error('Too many proof material uploads')),
      ).catch((failure: Error) => failure);
      const result = mapError(error);
      expect(result.error?.message).toBe('Too many proof material uploads');
      expect(result.error?.name).toContain('FiberFailure');
    },
  );

  it.each([
    new AttestationError('example', 'evidence', 'raw provider diagnostic'),
    new TemenosAttestationError('bind-channel'),
  ])('maps attestation failures to translated recovery copy', error => {
    const result = mapMidnightConfirmError(error);
    expect(result.errorTranslationKeys).toEqual({
      title: 'midnight.tee-attestation.failure.title',
      subtitle: 'midnight.tee-attestation.failure.recovery',
    });
    expect(result.error?.message).toBe(error.message);
  });

  it('returns generic keys with serialized error', () => {
    const error = new Error('Some SDK error');
    error.name = 'SdkError';

    const result = mapMidnightConfirmError(error);

    expect(result.errorTranslationKeys).toEqual({
      title: 'tx-executor.confirmation-error.generic.title',
      subtitle: 'tx-executor.confirmation-error.generic.subtitle',
    });
    expect(result.error).toMatchObject({
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
