import { HttpClient, buildUrl } from '@lace-lib/util-provider';

import type { RateLimiter } from '@lace-lib/util-provider';

export type CreateBlockfrostHttpClientProps = {
  /** Blockfrost base URL, e.g. `https://cardano-mainnet.blockfrost.io`. */
  baseUrl: string;
  /** Blockfrost project token sent as the `project_id` header. */
  projectId: string;
  /** Blockfrost API version path segment. Defaults to `v0`. */
  apiVersion?: string;
  /** Optional rate limiter (e.g. a `Bottleneck` instance) for honouring project quotas. */
  rateLimiter?: RateLimiter;
};

/**
 * Build an `HttpClient` pre-configured for Blockfrost: appends `api/<version>` to
 * the base URL and sets the `project_id` header on every request. The returned
 * client is the constructor argument expected by every `Blockfrost*Provider`.
 */
export const createBlockfrostHttpClient = ({
  baseUrl,
  projectId,
  apiVersion = 'v0',
  rateLimiter,
}: CreateBlockfrostHttpClientProps): HttpClient =>
  new HttpClient(
    {
      baseUrl: buildUrl(['api', apiVersion], baseUrl),
      requestInit: { headers: { project_id: projectId } },
    },
    { rateLimiter },
  );
