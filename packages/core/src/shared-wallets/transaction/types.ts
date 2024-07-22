import { Wallet } from '@lace/cardano';

export interface SignPolicy {
  requiredCosigners: number;
  signers: CoSignersListItem[];
}

export interface CoSignersListItem {
  keyHash: Wallet.Crypto.Ed25519KeyHashHex;
  name?: string;
  signed?: boolean;
}
