import { Wallet } from '@lace/cardano';

export type ValidateAddress = (
  address: string
) => Promise<{ isValid: boolean; handleResolution?: Wallet.Cardano.PaymentAddress }>;

export type CoSigner = { address: string; isValid: boolean; id: string };
