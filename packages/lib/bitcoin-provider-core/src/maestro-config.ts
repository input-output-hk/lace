import { HttpClient, buildUrl } from '@lace-lib/util-provider';
import Bottleneck from 'bottleneck';
import memoize from 'lodash/memoize';

import type { RateLimiterConfig } from '@lace-lib/util-provider';

export type MaestroClientConfig = {
  projectId?: string;
  baseUrl: string;
  apiVersion?: string;
};

export type MaestroConfig = {
  clientConfig: MaestroClientConfig;
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
