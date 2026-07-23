export type WalletProperties = { icon: string; walletName: string };
export type AnyApi = object;

export interface Shutdown {
  shutdown(): void;
}
