import { InvalidStringError } from '@cardano-sdk/util';
import { Err, Ok } from '@lace-sdk/util';

import type { Result } from '@lace-sdk/util';

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
