export type WalletBalance = {
  coinBalance: string;
  fiatBalance: string | undefined;
};

export type WalletBalanceApi = {
  address: string;
  lovelaces: string;
};
