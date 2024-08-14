import { Message } from 'openpgp';

export interface PublicPgpKeyData {
  pgpPublicKey: string;
  pgpKeyReference?: string;
}

export interface ShieldedPgpKeyData {
  pgpPrivateKey: string;
  pgpKeyPassphrase?: string;
  shieldedMessage: Message<Uint8Array>;
  privateKeyIsDecrypted: boolean;
}
