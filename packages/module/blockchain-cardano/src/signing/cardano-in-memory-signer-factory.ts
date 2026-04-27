import { CardanoInMemoryDataSigner } from './cardano-in-memory-data-signer';
import { CardanoInMemoryTransactionSigner } from './cardano-in-memory-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoBip32AccountProps,
  CardanoDataSigner,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
  CreateCardanoKeyAgent,
} from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

export class CardanoInMemorySignerFactory implements CardanoSignerFactory {
  readonly #createKeyAgent: CreateCardanoKeyAgent;

  public constructor(params: { createKeyAgent: CreateCardanoKeyAgent }) {
    this.#createKeyAgent = params.createKeyAgent;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'InMemory' && account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    this.#assertSupported(context);
    const { knownAddresses, utxo, auth } = context;

    const { accountIndex, chainId, extendedAccountPublicKey } =
      this.#extractAccountProps(context);
    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    return new CardanoInMemoryTransactionSigner({
      createKeyAgent: this.#createKeyAgent,
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      encryptedRootPrivateKey,
      knownAddresses,
      utxo,
      auth,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);
    const { knownAddresses, auth } = context;

    const { accountIndex, chainId, extendedAccountPublicKey } =
      this.#extractAccountProps(context);
    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    return new CardanoInMemoryDataSigner({
      createKeyAgent: this.#createKeyAgent,
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      encryptedRootPrivateKey,
      knownAddresses,
      auth,
    });
  }

  #assertSupported(context: CardanoSignerContext): void {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `CardanoInMemorySignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }
  }

  #extractAccountProps(context: CardanoSignerContext): {
    accountIndex: number;
    chainId: Cardano.ChainId;
    extendedAccountPublicKey: Bip32PublicKeyHex;
  } {
    const { wallet, accountId } = context;
    const account = wallet.accounts.find(a => a.accountId === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found in wallet`);
    }

    if (account.blockchainName !== 'Cardano') {
      throw new Error(`Account ${accountId} is not a Cardano account`);
    }

    const { accountIndex, chainId, extendedAccountPublicKey } = (
      account as InMemoryWalletAccount<CardanoBip32AccountProps>
    ).blockchainSpecific;

    return { accountIndex, chainId, extendedAccountPublicKey };
  }

  #extractEncryptedRootPrivateKey(context: CardanoSignerContext) {
    const { wallet } = context;
    const encryptedRootPrivateKey = (wallet as InMemoryWallet)
      .blockchainSpecific.Cardano?.encryptedRootPrivateKey;
    if (!encryptedRootPrivateKey) {
      throw new Error('Wallet is missing Cardano encrypted root private key');
    }
    return encryptedRootPrivateKey;
  }
}
