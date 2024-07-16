export interface IAssetDetails {
  id: string;
  logo: string;
  name: string;
  ticker: string;
  price: string;
  variation: string;
  balance: string;
  fiatBalance: string;
}

export interface OutsideHandlesContextValue {
  transformedCardano: IAssetDetails;
  walletAddress: string;
  fullWalletName: string;
}
