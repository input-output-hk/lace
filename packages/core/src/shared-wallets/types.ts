import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { z } from 'zod';
import { nativeScriptSchema, pubkeyScriptSchema, schema } from './docs/schema/shared-wallet.schema';

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

export enum FileErrorMessage {
  GENERIC = 'Error parsing file',
  INVALID_KEY = 'Invalid key',
  UNRECOGNIZED = 'File is unrecognized',
}

export interface FileValidationError extends Error {
  message: FileErrorMessage;
}

export type PubkeyScript = z.infer<typeof pubkeyScriptSchema>;
export type NativeScript = z.infer<typeof nativeScriptSchema>;
export type SharedWalletData = z.infer<typeof schema>;
export type LinkedWalletType = Exclude<`${WalletType}`, `${WalletType.Script}`>;
