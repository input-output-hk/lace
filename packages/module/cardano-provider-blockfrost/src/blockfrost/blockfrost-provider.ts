// copied from @cardano-sdk/cardano-services-client
import { contextLogger } from '@cardano-sdk/util';
import { toProviderError } from '@lace-lib/util-provider';

import type { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import type { HealthCheckResponse, Provider } from '@cardano-sdk/core';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';
import type { AsyncReturnType } from 'type-fest';

interface PaginatedRequestProps {
  endpoint: string;
  pageSize: number;
  requestInit?: RequestInit;
  page?: number;
}

export abstract class BlockfrostProvider implements Provider {
  protected logger: Logger;
  readonly #client: HttpClient;

  public constructor(client: HttpClient, logger: Logger) {
    this.#client = client;
    this.logger = contextLogger(logger, this.constructor.name);
  }

  public async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const result = await this.#client.request<
        AsyncReturnType<BlockFrostAPI['health']>
      >('health');
      return { ok: result.data.is_healthy };
    } catch (error) {
      return { ok: false, reason: toProviderError(error).message };
    }
  }

  /**
   * @param endpoint e.g. 'blocks/latest'
   * @param requestInit request options
   * @throws {ProviderError}
   */
  protected async request<T>(
    endpoint: string,
    requestInit?: RequestInit,
  ): Promise<T> {
    try {
      this.logger.debug('request', endpoint);
      const response = await this.#client.request<T>(endpoint, requestInit);
      this.logger.debug('response', response);
      return response?.data;
    } catch (error) {
      this.logger.debug('error', error);
      throw toProviderError(error);
    }
  }

  /**
   * @param endpoint e.g. 'blocks/latest'
   * @param pageSize number of items per page
   * @param requestInit request options
   * @throws {ProviderError}
   */
  protected async paginatedRequests<T extends unknown[]>({
    endpoint,
    pageSize,
    requestInit,
    page = 1,
  }: PaginatedRequestProps): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${separator}page=${page}&count=${pageSize}`;
    const response = await this.request<T>(url, requestInit);

    return response.length === pageSize
      ? ([
          ...response,
          ...(await this.paginatedRequests<T>({
            endpoint,
            pageSize,
            requestInit,
            page: page + 1,
          })),
        ] as T)
      : response;
  }
}
