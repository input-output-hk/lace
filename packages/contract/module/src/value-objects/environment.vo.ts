import { InvalidStringError } from '@cardano-sdk/util';
import { Err, Ok } from '@lace-lib/util';

import type { Result } from '@lace-lib/util';

export type Environment = 'development' | 'production' | 'test';
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

export const isProductionEnvironment = (environment: Environment): boolean =>
  environment === 'production';
