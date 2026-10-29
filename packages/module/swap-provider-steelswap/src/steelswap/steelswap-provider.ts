import { Err, Ok } from '@lace-lib/util';
import { from } from 'rxjs';

import {
  fromBuildResponse,
  fromDexList,
  fromEstimateResponse,
  fromTokenSummary,
  STEELSWAP_PARTNER,
  STEELSWAP_PARTNER_ADDRESS,
  toBuildRequest,
  toEstimateRequest,
  toSwapProviderError,
  type SteelSwapPartner,
} from './steelswap-mappers';

import type {
  SteelSwapBuildResponse,
  SteelSwapEstimateResponse,
  SteelSwapTokenSummary,
} from './steelswap-types';
import type { SwapProvider } from '@lace-contract/swap-provider';

/** The configuration of `createSteelSwapProvider`. */
export type SteelSwapProviderConfig = {
  /** The base URL of the SteelSwap API. */
  steelswapApiBaseUrl: string;
  /** The base URL token icons are loaded from. */
  nftCdnUrl: string;
  /**
   * The partner name and address the swaps are attributed to; the
   * provider's built-in partner when absent.
   */
  partner?: SteelSwapPartner;
};

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
  const json = (await response.json()) as T;
  return json;
};

const jsonGet = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `SteelSwap API error (${response.status}): ${response.statusText}`,
    );
  }
  const json = (await response.json()) as T;
  return json;
};

/**
 * A {@link SwapProvider} over the SteelSwap aggregator's API: it quotes swap
 * routes across Cardano DEXes, builds the unsigned swap transaction for a
 * quote, and lists and searches the tokens and DEXes it serves. Each call
 * emits one `Result`; a failed request is an `Err` with a `SwapProviderError`.
 */
export const createSteelSwapProvider = (
  config: SteelSwapProviderConfig,
): SwapProvider => {
  const partner: SteelSwapPartner = config.partner ?? {
    name: STEELSWAP_PARTNER,
    address: STEELSWAP_PARTNER_ADDRESS,
  };
  return {
    getQuote: request =>
      from(
        jsonPost<SteelSwapEstimateResponse>(
          `${config.steelswapApiBaseUrl}/swap/estimate/`,
          toEstimateRequest(request, partner),
        )
          .then(response => Ok(fromEstimateResponse(response, request)))
          .catch(error => {
            return Err(toSwapProviderError(error));
          }),
      ),

    buildSwapTx: request =>
      from(
        jsonPost<SteelSwapBuildResponse>(
          `${config.steelswapApiBaseUrl}/swap/build/`,
          toBuildRequest(request, partner),
        )
          .then(response => Ok(fromBuildResponse(response)))
          .catch(error => {
            return Err(toSwapProviderError(error));
          }),
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
  };
};
