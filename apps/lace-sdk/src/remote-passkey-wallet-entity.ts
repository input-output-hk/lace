import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { createLazyAccountsFromAccountPublicKey } from '@lace-module/blockchain-cardano/sdk';

import { PasskeyWalletMismatchError } from './passkey-wallet-mismatch-error';

import type { RemotePasskeySigner } from './remote-passkey-signer';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { LazyInMemoryWallet } from '@lace-contract/wallet-repo';

/** The options of `createRemotePasskeyWalletEntity`. */
export type CreateRemotePasskeyWalletEntityProps = {
  /** A connected signer, from `createRemotePasskeySigner`. */
  signer: Pick<RemotePasskeySigner, 'accountPublicKey'>;
  /** The wallet's display name. */
  walletName: string;
  /** Cardano account to open; defaults to 0. */
  accountIndex?: number;
  /**
   * Public key the dApp persisted when it first opened the wallet. When the
   * signer serves a different key the wallet is not this one and the call
   * fails closed with a {@link PasskeyWalletMismatchError}.
   */
  expectedPublicKey?: string;
  /** The wallet's position among the user's wallets; `0` by default. */
  order?: number;
};

/** What `createRemotePasskeyWalletEntity` resolves with. */
export type RemotePasskeyWalletEntity = {
  /** The wallet entity, for `wallets.addWallet`. */
  entity: LazyInMemoryWallet<CardanoBip32AccountProps>;
  /** Persist this to reopen the same wallet; it is public and never a secret. */
  publicKey: Bip32PublicKeyHex;
};

/**
 * Builds a Cardano wallet entity from the public account key the user agrees
 * to share through the hosted self-custodial passkey wallet. It fails
 * closed with {@link PasskeyWalletMismatchError} when that key differs from
 * `expectedPublicKey`.
 *
 * The entity is a {@link WalletType.LazyInMemory} wallet built from the
 * public account key alone:
 * no mnemonic, PRF output or encrypted root ever reaches the dApp, so there
 * is nothing secret to persist. Wallet keys stay in the signer's window in
 * the user's browser. The wallet id is derived from the public key.
 *
 * Mainnet and testnet accounts are returned; consumers choose which to expose.
 *
 * @param props - The signer, the name, the account and the saved key.
 * @returns The entity and the public key to persist.
 */
export const createRemotePasskeyWalletEntity = async ({
  signer,
  walletName,
  accountIndex = 0,
  expectedPublicKey,
  order = 0,
}: CreateRemotePasskeyWalletEntityProps): Promise<RemotePasskeyWalletEntity> => {
  const publicKey = await signer.accountPublicKey(accountIndex);
  if (expectedPublicKey !== undefined && publicKey !== expectedPublicKey) {
    throw new PasskeyWalletMismatchError();
  }

  const walletId = WalletId.deriveFromBip32PublicKey(publicKey);
  const accounts = createLazyAccountsFromAccountPublicKey({
    walletId,
    accountIndex,
    extendedAccountPublicKey: publicKey,
  });

  return {
    entity: {
      accounts,
      blockchainSpecific: {},
      metadata: { name: walletName, order },
      type: WalletType.LazyInMemory,
      walletId,
    },
    publicKey,
  };
};
