import {
  CardanoInMemoryDataSigner,
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromEncryptedRoot,
  deriveDRepKeyHash,
} from '@lace-contract/cardano-context';
import { defer, from, switchMap } from 'rxjs';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoBip32AccountProps,
  CardanoDataSigner,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
  WithCardanoKeyAgent$,
} from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';

/**
 * Signer factory for {@link WalletType.InMemory} Cardano accounts.
 *
 * Reuses {@link CardanoInMemoryTransactionSigner}/{@link CardanoInMemoryDataSigner}
 * from `@lace-contract/in-memory`, supplying a key-agent factory bound to the
 * wallet's encrypted root private key. The agent is unlocked per call with the
 * {@link AuthSecret} provided by `auth.accessAuthSecret`.
 */
export class CardanoInMemorySignerFactory implements CardanoSignerFactory {
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
    const accountProps = this.#extractAccountProps(context);
    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    return new CardanoInMemoryTransactionSigner({
      withKeyAgent$: this.#buildWithKeyAgent$({
        auth,
        accountProps,
        encryptedRootPrivateKey,
      }),
      knownAddresses,
      utxo,
      auth,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);
    const { knownAddresses, auth } = context;
    const accountProps = this.#extractAccountProps(context);
    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    return new CardanoInMemoryDataSigner({
      withKeyAgent$: this.#buildWithKeyAgent$({
        auth,
        accountProps,
        encryptedRootPrivateKey,
      }),
      dRepKeyHash$: defer(() => from(deriveDRepKeyHash(accountProps))),
      knownAddresses,
      auth,
    });
  }

  #buildWithKeyAgent$({
    auth,
    accountProps,
    encryptedRootPrivateKey,
  }: {
    auth: CardanoSignerContext['auth'];
    accountProps: {
      accountIndex: number;
      chainId: Cardano.ChainId;
      extendedAccountPublicKey: Bip32PublicKeyHex;
    };
    encryptedRootPrivateKey: HexBytes;
  }): WithCardanoKeyAgent$ {
    return use =>
      auth.accessAuthSecret(authSecret =>
        from(
          createCardanoKeyAgentFromEncryptedRoot({
            ...accountProps,
            encryptedRootPrivateKey,
            authSecret,
          }),
        ).pipe(switchMap(use)),
      );
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

  #extractEncryptedRootPrivateKey(context: CardanoSignerContext): HexBytes {
    const { wallet } = context;
    const encryptedRootPrivateKey = (wallet as InMemoryWallet)
      .blockchainSpecific.Cardano?.encryptedRootPrivateKey;
    if (!encryptedRootPrivateKey) {
      throw new Error('Wallet is missing Cardano encrypted root private key');
    }
    return encryptedRootPrivateKey;
  }
}
