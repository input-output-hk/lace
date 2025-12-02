export interface PublicPgpKeyData {
  pgpPublicKey: string;
  pgpKeyReference?: string;
}

export interface ShieldedPgpKeyData {
  pgpPrivateKey: string;
  pgpKeyPassphrase?: string;
  shieldedMessage: Uint8Array;
  privateKeyIsDecrypted: boolean;
}
