export interface Asset {
  id: string;
  ticker: string;
  balance: string;
  amount: string;
  fiat: {
    value: string;
    ticker: string;
  };
}

export type AssetState =
  | {
      type: 'valid';
      asset: Asset;
    }
  | { type: 'invalid'; asset: Asset; error: string };
