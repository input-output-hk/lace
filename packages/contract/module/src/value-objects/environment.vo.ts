import { InvalidStringError } from '@cardano-sdk/util';
import { Err, Ok } from '@lace-lib/util';

import type { Result } from '@lace-lib/util';

/**
 * The environment the app runs in. The `Environment` function parses a string
 * into one, returning an error for any other value.
 */
export type Environment = 'development' | 'production' | 'test';
/**
 * Parses a string as an {@link Environment}.
 *
 * @returns `Ok` with the environment, or `Err` with an `InvalidStringError`
 *   for any other value.
 */
export const Environment = (
  environment: string,
): Result<Environment, InvalidStringError> => {
  if (!['development', 'production', 'test'].includes(environment))
    return Err(
      new InvalidStringError(
        `Expected 'production' or 'development', got '${environment}'`,
      ),
    );
  return Ok(environment as Environment);
};

/** Tells whether the environment is `production`. */
export const isProductionEnvironment = (environment: Environment): boolean =>
  environment === 'production';
