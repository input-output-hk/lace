import { Wallet } from '@lace/cardano';

export type SharedWalletScriptKind =
  | Wallet.Cardano.RequireAllOfScript
  | Wallet.Cardano.RequireAnyOfScript
  | Wallet.Cardano.RequireAtLeastScript;
