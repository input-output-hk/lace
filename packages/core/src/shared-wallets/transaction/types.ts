import { Wallet } from '@lace/cardano';

export interface SharedWalletTransactionDetailsProps {
  cosigners: CoSignersListItem[];
  expiresBy: { utcDate: string; utcTime: string } | undefined;
  ownSharedKey: Wallet.Crypto.Bip32PublicKeyHex;
  signPolicy: SignPolicy;
  txInitiator?: Wallet.Crypto.Bip32PublicKeyHex;
}

export interface CoSignersListItem {
  name?: string;
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex;
  signed?: boolean;
}

export type SignerWithKeyHash = Omit<CoSignersListItem, 'sharedWalletKey'> & {
  keyHash: Wallet.Crypto.Ed25519KeyHashHex;
};

export interface SignPolicy {
  requiredCosigners: number;
  signers: SignerWithKeyHash[];
}
