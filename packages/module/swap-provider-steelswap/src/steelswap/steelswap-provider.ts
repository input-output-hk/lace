import { Err, Ok } from '@lace-sdk/util';
import { from } from 'rxjs';

import {
  fromBuildResponse,
  fromDexList,
  fromEstimateResponse,
  fromTokenSummary,
  toBuildRequest,
  toEstimateRequest,
  toSwapProviderError,
} from './steelswap-mappers';

import type {
  SteelSwapBuildResponse,
  SteelSwapEstimateResponse,
  SteelSwapTokenSummary,
} from './steelswap-types';
import type { AppConfig } from '@lace-contract/module';
import type { SwapProvider } from '@lace-contract/swap-provider';

const jsonPost = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `SteelSwap API error (${response.status}): ${
        text || response.statusText
      }`,
    );
  }
  return response.json() as Promise<T>;
};

const jsonGet = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `SteelSwap API error (${response.status}): ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
};

export const createSteelSwapProvider = (config: AppConfig): SwapProvider => ({
  getQuote: request =>
    from(
      jsonPost<SteelSwapEstimateResponse>(
        `${config.steelswapApiBaseUrl}/swap/estimate/`,
        toEstimateRequest(request),
      )
        .then(response => Ok(fromEstimateResponse(response, request)))
        .catch(error => Err(toSwapProviderError(error))),
    ),

  buildSwapTx: request =>
    from(
      jsonPost<SteelSwapBuildResponse>(
        `${config.steelswapApiBaseUrl}/swap/build/`,
        toBuildRequest(request),
      )
        .then(response => Ok(fromBuildResponse(response)))
        .catch(error => Err(toSwapProviderError(error))),
    ),

  listTokens: () =>
    from(
      jsonGet<SteelSwapTokenSummary[]>(
        `${config.steelswapApiBaseUrl}/tokens/list/`,
      )
        .then(tokens =>
          Ok(tokens.map(t => fromTokenSummary(t, config.nftCdnUrl))),
        )
        .catch(error => Err(toSwapProviderError(error))),
    ),

  listDexes: () =>
    from(
      jsonGet<string[]>(`${config.steelswapApiBaseUrl}/dex/list/`)
        .then(dexes => Ok(fromDexList(dexes)))
        .catch(error => Err(toSwapProviderError(error))),
    ),

  searchTokens: (_networkId, query) =>
    from(
      jsonPost<SteelSwapTokenSummary[]>(
        `${config.steelswapApiBaseUrl}/tokens/find-pairs/`,
        { token: query },
      )
        .then(tokens =>
          Ok(tokens.map(t => fromTokenSummary(t, config.nftCdnUrl))),
        )
        .catch(error => Err(toSwapProviderError(error))),
    ),
});
