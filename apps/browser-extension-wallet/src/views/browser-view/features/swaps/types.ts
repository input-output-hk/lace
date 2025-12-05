import { Cardano } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { DropdownList } from './components/drawers';

export interface TokenListFetchResponse {
  ticker: string;
  name: string;
  policyId: Cardano.PolicyId;
  policyName: Cardano.AssetName;
  decimals: number;
  priceNumerator: number;
  priceDenominator: number;
  sources: string[];
}

export interface BaseEstimate {
  tokenA: string;
  tokenB: string;
  quantity: number;
  ignoreDexes: string[];
  partner: string;
  hop: boolean;
  da: readonly [];
}

export interface PoolLeg {
  dex: string;
  poolId: string;
  quantityA: number;
  quantityB: number;
  batcherFee: number;
  deposit: number;
  volumeFee: number;
}

export interface SplitLeg {
  tokenA: string;
  quantityA: number;
  tokenB: string;
  quantityB: number;
  totalFee: number;
  totalDeposit: number;
  steelswapFee: number;
  bonusOut: number;
  price: number;
  pools?: PoolLeg[];
}

export type SplitGroup = SplitLeg[];

export interface SwapEstimateResponse {
  tokenA: string;
  quantityA: number;
  tokenB: string;
  quantityB: number;
  totalFee: number;
  totalDeposit: number;
  steelswapFee: number;
  bonusOut: number;
  price: number;
  splitGroup: SplitGroup[];
}

export interface BuildSwapProps extends BaseEstimate {
  address: Wallet.Cardano.Address;
  slippage: number;
  forwardAddress: Wallet.Cardano.Address | string; // string must be empty unless it's
  // Note: feeAdust is intentionally misspelled as required by the SteelSwap API
  feeAdust: true;
  collateral: string[];
  pAddress: string;
  utxos: string[];
  ttl: number;
}
export interface BuildSwapResponse {
  tx: string; // A hex encoded, unsigned transaction.
  p: boolean; // whether to use partial signing.
}

export type CreateSwapRequestBodySwaps = {
  tokenA: string;
  tokenB: string | undefined;
  quantity: string;
  ignoredDexs: string[];
  address?: Wallet.Cardano.PaymentAddress;
  targetSlippage?: number;
  collateral?: Wallet.Cardano.Utxo[];
  utxos?: Wallet.Cardano.Utxo[];
  decimals?: number;
};

export enum SwapStage {
  Initial = 'initial',
  SelectTokenOut = 'selectTokenOut',
  SelectTokenIn = 'selectTokenIn',
  SelectLiquiditySources = 'selectLiquiditySources',
  SwapReview = 'swapReview',
  AdjustSlippage = 'adjustSlippage',
  SignTx = 'signTx',
  Success = 'signSuccess',
  Failure = 'signFailure'
}

export interface SwapProvider {
  tokenA: DropdownList;
  setTokenA: React.Dispatch<React.SetStateAction<DropdownList>>;
  tokenB: TokenListFetchResponse;
  setTokenB: React.Dispatch<React.SetStateAction<TokenListFetchResponse>>;
  quantity: string;
  setQuantity: React.Dispatch<React.SetStateAction<string>>;
  dexList: string[];
  estimate?: SwapEstimateResponse;
  dexTokenList: TokenListFetchResponse[];
  fetchDexList: () => void;
  fetchSwappableTokensList: () => void;
  buildSwap: (cb?: () => void) => void;
  signAndSubmitSwapRequest: () => Promise<void>;
  targetSlippage: number;
  setTargetSlippage: React.Dispatch<React.SetStateAction<number>>;
  unsignedTx?: BuildSwapResponse;
  setUnsignedTx: React.Dispatch<React.SetStateAction<BuildSwapResponse | null>>;
  excludedDexs: string[];
  setExcludedDexs: React.Dispatch<React.SetStateAction<string[]>>;
  stage: SwapStage;
  setStage: React.Dispatch<React.SetStateAction<SwapStage>>;
  collateral: Wallet.Cardano.Utxo[];
  slippagePercentages: number[];
  maxSlippagePercentage: number;
  transactionHash: string | null;
  disclaimerAcknowledged: boolean;
  handleAcknowledgeDisclaimer: () => void;
  fetchingQuote: boolean;
}
