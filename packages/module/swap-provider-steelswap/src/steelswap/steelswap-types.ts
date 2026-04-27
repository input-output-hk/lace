// --- SteelSwap API request/response types ---

// POST /swap/estimate/
export type SteelSwapEstimateRequest = {
  tokenA: string;
  tokenB: string;
  quantity: number;
  predictFromOutputAmount?: boolean;
  ignoreDexes?: string[];
  partner?: string;
  hop?: boolean;
  da?: string[];
};

export type SteelSwapPoolOutput = {
  dex: string;
  poolId: string;
  quantityA: number;
  quantityB: number;
  batcherFee: number;
  deposit: number;
  volumeFee: number;
};

export type SteelSwapEstimateResponse = {
  tokenA: string;
  quantityA: number;
  tokenB: string;
  quantityB: number;
  totalFee: number;
  totalDeposit: number;
  steelswapFee: number;
  bonusOut: number;
  price: number;
  pools?: SteelSwapPoolOutput[];
  splitGroup?: SteelSwapPoolOutput[][];
};

// POST /swap/build/
export type SteelSwapBuildRequest = SteelSwapEstimateRequest & {
  address: string;
  forwardAddress?: string;
  utxos: string[];
  collateral?: string[];
  slippage: number;
  changeAddress?: string;
  pAddress?: string;
  feeAdust?: boolean;
  ttl?: number;
};

export type SteelSwapBuildResponse = {
  tx: string;
  p: boolean;
};

// GET /tokens/list/
export type SteelSwapTokenSummary = {
  ticker: string;
  name: string;
  policyId: string;
  policyName: string;
  decimals: number;
  priceNumerator?: number;
  priceDenominator?: number;
  sources?: string[];
};

// POST /tokens/find-pairs/
export type SteelSwapFindPairsRequest = {
  token: string;
};
