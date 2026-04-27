import { FeatureFlagKey } from '@lace-contract/feature';
import { AppLogger } from '@lace-sdk/util';

import defaultFeatureFlags from '../feature-flags';

import { ENV } from './config';

import type { LogLevel } from '@lace-sdk/util';

const LOG_LEVELS = new Set<string>([
  'debug',
  'error',
  'info',
  'silent',
  'trace',
  'warn',
]);
const logLevelFlag = defaultFeatureFlags.find(
  f => f.key === FeatureFlagKey('LOG_LEVEL'),
);
const rawPayload: unknown =
  logLevelFlag && 'payload' in logLevelFlag ? logLevelFlag.payload : undefined;
const logLevel: LogLevel =
  typeof rawPayload === 'string' && LOG_LEVELS.has(rawPayload)
    ? (rawPayload as LogLevel)
    : ENV === 'development'
    ? 'info'
    : 'error';

const logger = new AppLogger(logLevel);
logger.debug(`Logger initialized with log level: ${logLevel}`);

export { logger };
