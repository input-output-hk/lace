import type { HexBlob } from '@cardano-sdk/util';
import type { Wallet } from '@lace/cardano';

export interface CreateWalletParams {
  name: string;
  chainId?: Wallet.Cardano.ChainId;
  rootPrivateKeyBytes?: HexBlob;
  extendedAccountPublicKey?: Wallet.Crypto.Bip32PublicKeyHex;
}
