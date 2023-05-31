export type WalletBalance = {
  coinBalance: string;
  fiatBalance: string;
};

export type WalletBalanceApi = {
  address: string;
  lovelaces: string;
};
