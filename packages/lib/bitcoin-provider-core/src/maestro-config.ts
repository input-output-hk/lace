import { HttpClient, buildUrl } from '@lace-lib/util-provider';
import Bottleneck from 'bottleneck';
import memoize from 'lodash/memoize';

import type { RateLimiterConfig } from '@lace-lib/util-provider';

/** Where and how to reach the Maestro Bitcoin API. */
export type MaestroClientConfig = {
  /** The Maestro API key, sent as the `api-key` header. */
  projectId?: string;
  /** The base URL of the Maestro API for one network. */
  baseUrl: string;
  /** The API version path segment, such as `v0`. */
  apiVersion?: string;
};

/** The Maestro provider's configuration for one Bitcoin network. */
export type MaestroConfig = {
  /** Where and how to reach the Maestro API. */
  clientConfig: MaestroClientConfig;
  /** How many requests may be sent, and how fast the allowance refills. */
  rateLimiterConfig: RateLimiterConfig;
};

export const computeMaestroConfigIdentifier = ({
  clientConfig: { baseUrl, projectId },
}: MaestroConfig) => `${baseUrl}-${projectId}`;

export const getMaestroClient = memoize(
  ({ clientConfig, rateLimiterConfig }: MaestroConfig) => {
    const rateLimiter = new Bottleneck({
      reservoir: rateLimiterConfig.size,
      reservoirIncreaseAmount: rateLimiterConfig.increaseAmount,
      reservoirIncreaseInterval: rateLimiterConfig.increaseInterval,
      reservoirIncreaseMaximum: rateLimiterConfig.size,
    });
    return new HttpClient(
      {
        baseUrl: buildUrl([clientConfig.apiVersion], clientConfig.baseUrl),
        requestInit: { headers: { 'api-key': clientConfig.projectId ?? '' } },
      },
      { rateLimiter },
    );
  },
  computeMaestroConfigIdentifier,
);
