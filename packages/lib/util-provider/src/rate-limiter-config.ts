import { type Milliseconds } from '@lace-sdk/util';

/**
 * Defines the configuration options for a rate limiter.
 */
export type RateLimiterConfig = {
  size: number;
  increaseInterval: Milliseconds;
  increaseAmount: number;
};
