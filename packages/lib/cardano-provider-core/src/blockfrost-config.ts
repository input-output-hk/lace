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

/**
 * Per-network-magic {@link BlockfrostConfig}s over the Lace Blockfrost proxy
 * (1 = preprod, 2 = preview, 764824073 = mainnet). ONE `proxyBaseUrl` serves
 * every network: the proxy routes by path (`<base>/<surface>/<network>`) and
 * injects the project key server-side, so no config carries a `projectId`
 * (audit LW-14499). `surface` is the proxy's per-app route prefix. This is the
 * proxy contract's single in-repo home — every workspace app derives its
 * per-network URLs here (the extension shell keeps a hand-mirrored copy: its
 * closure admits no monorepo package, ADR 37).
 */
export const blockfrostProxyConfigs = ({
  proxyBaseUrl,
  surface,
  rateLimiterConfig,
}: {
  proxyBaseUrl: string;
  surface: 'extension' | 'mobile';
  rateLimiterConfig: RateLimiterConfig;
}): Record<number, BlockfrostConfig> => {
  // Trailing slash trimmed so the path join never doubles up.
  const base = proxyBaseUrl.trim().replace(/\/$/, '');
  const config = (network: string): BlockfrostConfig => ({
    clientConfig: {
      baseUrl: `${base}/${surface}/${network}`,
      apiVersion: 'v0',
    },
    rateLimiterConfig,
  });
  return {
    [1]: config('preprod'),
    [2]: config('preview'),
    [764_824_073]: config('mainnet'),
  };
};

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
        requestInit: {
          headers: {
            // Omit the header entirely when no key is configured (proxy
            // path) — some gateways reject a present-but-empty auth header.
            ...(clientConfig.projectId && {
              project_id: clientConfig.projectId,
            }),
          },
        },
      },
      { rateLimiter },
    );
  },
  computeBlockfrostConfigIdentifier,
);
