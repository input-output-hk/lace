import type {
  DataSigner,
  SignerContext,
  SignerFactory,
  TransactionSigner,
} from './types';
import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Composes multiple SignerFactory instances into one.
 * Routes to the first factory that supports the given wallet/account.
 */
export class CompositeSignerFactory implements SignerFactory {
  readonly #factories: SignerFactory[];

  public constructor(factories: SignerFactory[]) {
    this.#factories = factories;
  }

  public canSign(account: AnyAccount): boolean {
    return this.#factories.some(f => f.canSign(account));
  }

  public createTransactionSigner(context: SignerContext): TransactionSigner {
    return this.#resolve(context).createTransactionSigner(context);
  }

  public createDataSigner(
    context: SignerContext,
  ): DataSigner<unknown, unknown> {
    return this.#resolve(context).createDataSigner(context);
  }

  #resolve(context: SignerContext): SignerFactory {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account) {
      throw new Error(`Account ${context.accountId} not found in wallet`);
    }
    const factory = this.#factories.find(f => f.canSign(account));
    if (!factory) {
      throw new Error(
        `No signer factory registered for account type "${account.accountType}"`,
      );
    }
    return factory;
  }
}
