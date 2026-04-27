import { Cardano } from '@cardano-sdk/core';

import type {
  SteelSwapBuildRequest,
  SteelSwapBuildResponse,
  SteelSwapEstimateRequest,
  SteelSwapEstimateResponse,
  SteelSwapPoolOutput,
  SteelSwapTokenSummary,
} from './steelswap-types';
import type {
  SwapBuildRequest,
  SwapDex,
  SwapFee,
  SwapProviderError,
  SwapQuote,
  SwapQuoteRequest,
  SwapRouteLeg,
  SwapToken,
  SwapTransaction,
} from '@lace-contract/swap-provider';

const STEELSWAP_PROVIDER_ID = 'steelswap';
const STEELSWAP_PARTNER = 'lace-aggregator';
const STEELSWAP_PARTNER_ADDRESS = '$lace@steelswap';
const LOVELACE_DECIMALS = 6;
const QUOTE_EXPIRY_MS = 15_000;

const lovelaceToAda = (lovelace: number): string =>
  (lovelace / 10 ** LOVELACE_DECIMALS).toFixed(2);

const makeLovelaceFee = (label: string, amount: number): SwapFee => ({
  label,
  amount: String(amount),
  tokenId: 'lovelace',
  displayAmount: lovelaceToAda(amount),
  displayCurrency: 'ADA',
});

const toSmallestUnit = (displayAmount: string, decimals: number): number => {
  const number_ = Number(displayAmount);
  if (Number.isNaN(number_) || number_ === 0) return 0;
  return Math.round(number_ * 10 ** decimals);
};

export const toEstimateRequest = (
  request: SwapQuoteRequest,
): SteelSwapEstimateRequest => ({
  tokenA: request.sellTokenId,
  tokenB: request.buyTokenId,
  quantity: toSmallestUnit(request.sellAmount, request.sellTokenDecimals),
  ignoreDexes: request.excludedDexes,
  partner: STEELSWAP_PARTNER,
  hop: true,
  da: [],
});

export const fromEstimateResponse = (
  response: SteelSwapEstimateResponse,
  request: SwapQuoteRequest,
): SwapQuote => {
  const pools = response.pools ?? response.splitGroup?.flat() ?? [];
  const route: SwapRouteLeg[] = pools.map(pool => ({
    dexName: pool.dex,
    sellTokenId: response.tokenA,
    buyTokenId: response.tokenB,
    percentage:
      response.quantityA > 0 ? pool.quantityA / response.quantityA : 0,
  }));

  const fees: SwapFee[] = [
    makeLovelaceFee('Network fee', response.totalFee),
    makeLovelaceFee('Service fee', response.steelswapFee),
  ];

  if (response.totalDeposit > 0) {
    fees.push(makeLovelaceFee('Deposit', response.totalDeposit));
  }

  const totalFeeLovelace =
    response.totalFee + response.steelswapFee + response.totalDeposit;

  return {
    routeId: `steelswap-${request.sellTokenId}-${
      request.buyTokenId
    }-${Date.now()}`,
    providerId: STEELSWAP_PROVIDER_ID,
    sellTokenId: response.tokenA,
    buyTokenId: response.tokenB,
    sellAmount: String(response.quantityA),
    expectedBuyAmount: String(response.quantityB),
    price: response.price,
    priceDisplay: `${response.price.toFixed(6)}`,
    fees,
    totalFeeDisplay: `${lovelaceToAda(totalFeeLovelace)} ADA`,
    route,
    quoteExpiresAt: Date.now() + QUOTE_EXPIRY_MS,
  };
};

export const toBuildRequest = (
  request: SwapBuildRequest,
): SteelSwapBuildRequest => ({
  tokenA: request.quote.sellTokenId,
  tokenB: request.quote.buyTokenId,
  quantity: Number(request.quote.sellAmount),
  ignoreDexes: [],
  partner: STEELSWAP_PARTNER,
  hop: true,
  da: [],
  address: request.userAddress,
  forwardAddress: '',
  utxos: request.utxos,
  collateral: request.collateralUtxos,
  slippage: Math.round(request.slippage * 100),
  pAddress: STEELSWAP_PARTNER_ADDRESS,
  // Intentional typo required by SteelSwap API
  feeAdust: true,
  ttl: request.ttl,
});

export const fromBuildResponse = (
  response: SteelSwapBuildResponse,
): SwapTransaction => ({
  unsignedTxCbor: response.tx,
  providerId: STEELSWAP_PROVIDER_ID,
});

const getCardanoTokenIconUrl = (
  nftCdnUrl: string,
  policyId: string,
  assetName: string,
): string | undefined => {
  try {
    const fingerprint = Cardano.AssetFingerprint.fromParts(
      Cardano.PolicyId(policyId),
      Cardano.AssetName(assetName),
    );
    return `${nftCdnUrl}/lace/image/${fingerprint}?size=64`;
  } catch {
    return undefined;
  }
};

export const fromTokenSummary = (
  token: SteelSwapTokenSummary,
  nftCdnUrl: string,
): SwapToken => {
  const tokenKey =
    token.policyId && token.policyName
      ? `${token.policyId}${token.policyName}`
      : 'lovelace';
  const iconUrl =
    token.policyId && token.policyName
      ? getCardanoTokenIconUrl(nftCdnUrl, token.policyId, token.policyName)
      : undefined;
  return {
    id: tokenKey,
    ticker: token.ticker,
    name: token.name,
    decimals: token.decimals,
    policyId: token.policyId || undefined,
    icon: iconUrl,
  };
};

export const fromDexList = (dexNames: string[]): SwapDex[] =>
  dexNames.map(name => ({ id: name, name }));

const extractDetailFromErrorMessage = (message: string): string => {
  // SteelSwap returns errors like: 'SteelSwap API error (406): {"detail":"..."}'
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return message;
  try {
    const parsed = JSON.parse(message.slice(jsonStart)) as {
      detail?: string;
    };
    return parsed.detail ?? message;
  } catch {
    return message;
  }
};

export const toSwapProviderError = (error: unknown): SwapProviderError => {
  if (error instanceof Error) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      message: extractDetailFromErrorMessage(error.message),
    };
  }
  return {
    code: 'UNKNOWN',
    message: String(error),
  };
};

/* eslint-disable max-params */
export const extractRouteLegs = (
  pools: SteelSwapPoolOutput[],
  tokenA: string,
  tokenB: string,
  totalQuantityA: number,
): SwapRouteLeg[] =>
  /* eslint-enable max-params */
  pools.map(pool => ({
    dexName: pool.dex,
    sellTokenId: tokenA,
    buyTokenId: tokenB,
    percentage: totalQuantityA > 0 ? pool.quantityA / totalQuantityA : 0,
  }));
