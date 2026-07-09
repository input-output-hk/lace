import {
  CardanoInMemoryDataSigner,
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromMnemonic,
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
  AccountId,
  AnyAccount,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

/**
 * Resolves the BIP-39 mnemonic for a given account on demand.
 *
 * Called once per sign request. The returned words are fed into a fresh
 * in-memory key agent that the SDK discards immediately after signing,
 * keeping the seed out of any persistent Lace store.
 */
export type GetMnemonicWords = (accountId: AccountId) => Promise<string[]>;

export type CardanoLazyInMemorySignerFactoryProps = {
  getMnemonicWords: GetMnemonicWords;
};

/**
 * Signer factory for {@link WalletType.LazyInMemory} Cardano accounts.
 *
 * The mnemonic is never persisted by Lace; instead, `getMnemonicWords` is
 * invoked on every signing request and the derived key agent lives only for
 * the duration of one sign call.
 */
export class CardanoLazyInMemorySignerFactory implements CardanoSignerFactory {
  readonly #getMnemonicWords: GetMnemonicWords;

  public constructor(props: CardanoLazyInMemorySignerFactoryProps) {
    this.#getMnemonicWords = props.getMnemonicWords;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'LazyInMemory' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    this.#assertSupported(context);
    const { knownAddresses, utxo, auth, accountId } = context;
    const accountProps = this.#extractAccountProps(context);

    return new CardanoInMemoryTransactionSigner({
      withKeyAgent$: this.#buildWithKeyAgent$({ accountId, accountProps }),
      knownAddresses,
      utxo,
      auth,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);
    const { knownAddresses, auth, accountId } = context;
    const accountProps = this.#extractAccountProps(context);

    return new CardanoInMemoryDataSigner({
      withKeyAgent$: this.#buildWithKeyAgent$({ accountId, accountProps }),
      dRepKeyHash$: defer(() => from(deriveDRepKeyHash(accountProps))),
      knownAddresses,
      auth,
    });
  }

  #buildWithKeyAgent$({
    accountId,
    accountProps,
  }: {
    accountId: AccountId;
    accountProps: { accountIndex: number; chainId: Cardano.ChainId };
  }): WithCardanoKeyAgent$ {
    return use =>
      defer(() => from(this.#getMnemonicWords(accountId))).pipe(
        switchMap(mnemonicWords =>
          from(
            createCardanoKeyAgentFromMnemonic({
              accountIndex: accountProps.accountIndex,
              chainId: accountProps.chainId,
              mnemonicWords,
            }),
          ),
        ),
        switchMap(use),
      );
  }

  #assertSupported(context: CardanoSignerContext): void {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `CardanoLazyInMemorySignerFactory does not support account type: ${
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
      account as LazyInMemoryWalletAccount<CardanoBip32AccountProps>
    ).blockchainSpecific;

    return { accountIndex, chainId, extendedAccountPublicKey };
  }
}
