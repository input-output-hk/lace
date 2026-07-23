import { buildUrl, HttpClient } from '@lace-lib/util-provider';
import Bottleneck from 'bottleneck';
import memoize from 'lodash/memoize';

import type { RateLimiterConfig } from '@lace-lib/util-provider';

export type BlockfrostClientConfig = {
  projectId?: string;
  baseUrl: string;
  apiVersion?: string;
};

export type BlockfrostConfig = {
  clientConfig: BlockfrostClientConfig;
  rateLimiterConfig: RateLimiterConfig;
};

export const computeBlockfrostConfigIdentifier = ({
  clientConfig: { baseUrl, projectId },
}: BlockfrostConfig) => `${baseUrl}-${projectId}`;

export const getBlockfrostClient = memoize(
  ({ clientConfig, rateLimiterConfig }: BlockfrostConfig) => {
    const rateLimiter = new Bottleneck({
      reservoir: rateLimiterConfig.size,
      reservoirIncreaseAmount: rateLimiterConfig.increaseAmount,
      reservoirIncreaseInterval: rateLimiterConfig.increaseInterval,
      reservoirIncreaseMaximum: rateLimiterConfig.size,
    });
    return new HttpClient(
      {
        baseUrl: buildUrl(
          ['api', clientConfig.apiVersion],
          clientConfig.baseUrl,
        ),
        requestInit: { headers: { project_id: clientConfig.projectId ?? '' } },
      },
      { rateLimiter },
    );
  },
  computeBlockfrostConfigIdentifier,
);
