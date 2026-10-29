import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import {
  getExtendedPubKeys,
  signBitcoinTransactionWithSeed,
} from '@lace-module/blockchain-bitcoin/sdk';
import * as bip39 from 'bip39';
import isEqual from 'lodash/isEqual';
import { Observable, switchMap, throwError } from 'rxjs';

import { LazyWalletMismatchError } from '../lazy-wallet-mismatch-error';

import type { WithMnemonicWords } from '../cardano-lazy-in-memory-signer-factory';
import type {
  BitcoinBip32AccountProps,
  BitcoinDataSigner,
  BitcoinExtendedAccountPublicKeys,
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type {
  AnyAccount,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

/** The options of {@link BitcoinLazyInMemorySignerFactory}. */
export type BitcoinLazyInMemorySignerFactoryProps = {
  /** Supplies the recovery words for one signature. */
  withMnemonicWords: WithMnemonicWords;
};

/** The stored account data a lazy signature is checked against. */
type LazyBitcoinAccountProps = {
  accountIndex: number;
  network: BitcoinNetwork;
  extendedAccountPublicKeys: BitcoinExtendedAccountPublicKeys;
};

/**
 * Signer factory for {@link WalletType.LazyInMemory} Bitcoin accounts.
 *
 * The seed is never persisted by Lace: each signature asks for the recovery
 * words, derives the seed, and wipes it once signing settles. The words must
 * derive the account's stored extended public keys, regardless of their
 * source, or nothing is signed.
 *
 * Like the Cardano lazy signer, each signature first asks the user to confirm
 * through `auth.authenticate()`. The auth secret is never read, because there
 * is no encrypted seed to open.
 */
export class BitcoinLazyInMemorySignerFactory implements BitcoinSignerFactory {
  readonly #withMnemonicWords: WithMnemonicWords;

  public constructor(props: BitcoinLazyInMemorySignerFactoryProps) {
    this.#withMnemonicWords = props.withMnemonicWords;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'LazyInMemory' &&
      account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    const accountProps = this.#extractAccountProps(context);
    const { auth } = context;

    return {
      sign: request => this.#sign(request, accountProps, auth),
    };
  }

  /**
   * Message signing is not offered for lazy Bitcoin accounts.
   *
   * @throws Always.
   */
  public createDataSigner(_context: BitcoinSignerContext): BitcoinDataSigner {
    throw new Error('Data signing is not supported for lazy Bitcoin accounts.');
  }

  #sign(
    request: BitcoinSignRequest,
    accountProps: LazyBitcoinAccountProps,
    auth: SignerAuth,
  ): Observable<BitcoinSignResult> {
    return auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#signWithWords(request, accountProps);
      }),
    );
  }

  #signWithWords(
    request: BitcoinSignRequest,
    accountProps: LazyBitcoinAccountProps,
  ): Observable<BitcoinSignResult> {
    return new Observable(subscriber => {
      const assertActive = () => {
        if (subscriber.closed) throw new Error('Signing request cancelled.');
      };
      void this.#withMnemonicWords(async words => {
        assertActive();
        const seed = await bip39.mnemonicToSeed(words.join(' '));
        try {
          assertActive();
          const derivedKeys = getExtendedPubKeys(
            seed,
            accountProps.accountIndex,
          );
          const networkKeys =
            accountProps.network === BitcoinNetwork.Mainnet
              ? derivedKeys.mainnet
              : derivedKeys.testnet4;
          if (!isEqual(networkKeys, accountProps.extendedAccountPublicKeys)) {
            throw new LazyWalletMismatchError();
          }
          return signBitcoinTransactionWithSeed(request.serializedTx, seed);
        } finally {
          seed.fill(0);
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
    });
  }

  #extractAccountProps(context: BitcoinSignerContext): LazyBitcoinAccountProps {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `BitcoinLazyInMemorySignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }

    const { accountIndex, extendedAccountPublicKeys, networkId } = (
      account as LazyInMemoryWalletAccount<BitcoinBip32AccountProps>
    ).blockchainSpecific;
    const network = BitcoinNetworkId.getBitcoinNetwork(
      networkId ?? account.blockchainNetworkId,
    );
    if (!network) {
      throw new Error(
        `Cannot resolve Bitcoin network from networkId: ${String(
          networkId ?? account.blockchainNetworkId,
        )}`,
      );
    }

    return { accountIndex, network, extendedAccountPublicKeys };
  }
}
