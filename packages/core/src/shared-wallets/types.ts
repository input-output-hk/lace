import { Wallet } from '@lace/cardano';

export type SharedWalletScriptKind =
  | Wallet.Cardano.RequireAllOfScript
  | Wallet.Cardano.RequireAnyOfScript
  | Wallet.Cardano.RequireAtLeastScript;

export type MultisigTxData = {
  metadata: {
    chainId: `cip34:${number}-${number}`;
    createdAt: Date;
    createdBy: string;
    note?: string;
  };
  transaction: {
    cborHex: string;
  };
  version: string;
};
