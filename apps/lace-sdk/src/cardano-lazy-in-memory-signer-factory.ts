import {
  CardanoInMemoryDataSigner,
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromMnemonic,
  deriveDRepKeyHash,
  withCollateralOwnershipGuard,
} from '@lace-contract/cardano-context';
import {
  defer,
  from,
  lastValueFrom,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';

import { LazyWalletMismatchError } from './lazy-wallet-mismatch-error';

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
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

/**
 * Supplies recovery words for one signature, keeping them inside a callback:
 * pass the words to `use` and await it, and the signer uses them only until
 * the promise settles.
 */
export type WithMnemonicWords = <T>(
  use: (words: readonly string[]) => Promise<T>,
) => Promise<T>;

export type CardanoLazyInMemorySignerFactoryProps = {
  withMnemonicWords: WithMnemonicWords;
};

/**
 * Signer factory for {@link WalletType.LazyInMemory} Cardano accounts.
 *
 * The mnemonic is never persisted by Lace. Its derived account key must match
 * the selected account before signing, regardless of the mnemonic source.
 */
export class CardanoLazyInMemorySignerFactory implements CardanoSignerFactory {
  readonly #withMnemonicWords: WithMnemonicWords;

  public constructor(props: CardanoLazyInMemorySignerFactoryProps) {
    this.#withMnemonicWords = props.withMnemonicWords;
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
    const { knownAddresses, utxo, auth } = context;
    const accountProps = this.#extractAccountProps(context);

    return withCollateralOwnershipGuard(
      new CardanoInMemoryTransactionSigner({
        withKeyAgent$: this.#buildWithKeyAgent$(accountProps),
        knownAddresses,
        utxo,
        auth,
      }),
      context,
    );
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);
    const { knownAddresses, auth } = context;
    const accountProps = this.#extractAccountProps(context);

    return new CardanoInMemoryDataSigner({
      withKeyAgent$: this.#buildWithKeyAgent$(accountProps),
      dRepKeyHash$: defer(() => from(deriveDRepKeyHash(accountProps))),
      knownAddresses,
      auth,
    });
  }

  #buildWithKeyAgent$(accountProps: {
    accountIndex: number;
    chainId: Cardano.ChainId;
    extendedAccountPublicKey: Bip32PublicKeyHex;
  }): WithCardanoKeyAgent$ {
    return use =>
      new Observable(subscriber => {
        const cancelled$ = new Subject<void>();
        const assertActive = () => {
          if (subscriber.closed) throw new Error('Signing request cancelled.');
        };
        void this.#withMnemonicWords(async words => {
          assertActive();
          const mnemonicWords = [...words];
          const keyAgent = await createCardanoKeyAgentFromMnemonic({
            accountIndex: accountProps.accountIndex,
            chainId: accountProps.chainId,
            mnemonicWords,
          });
          try {
            assertActive();
            if (
              keyAgent.extendedAccountPublicKey !==
              accountProps.extendedAccountPublicKey
            ) {
              throw new LazyWalletMismatchError();
            }
            return await lastValueFrom(
              use(keyAgent).pipe(takeUntil(cancelled$)),
            );
          } finally {
            keyAgent.dispose?.();
          }
        }).then(
          result => {
            if (!subscriber.closed) {
              subscriber.next(result);
              subscriber.complete();
            }
          },
          error => {
            if (!subscriber.closed) subscriber.error(error);
          },
        );
        return () => {
          cancelled$.next();
          cancelled$.complete();
        };
      });
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
