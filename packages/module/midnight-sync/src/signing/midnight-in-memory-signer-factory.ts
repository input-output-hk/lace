import { MidnightInMemoryDataSigner } from './midnight-in-memory-data-signer';
import { MidnightInMemoryTransactionSigner } from './midnight-in-memory-transaction-signer';

import type {
  MidnightWalletsByAccountId,
  MidnightDataSigner,
  MidnightSignerContext,
  MidnightSignerFactory,
  MidnightTransactionSigner,
} from '@lace-contract/midnight-context';
import type { SignerContext } from '@lace-contract/signer';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

export class MidnightInMemorySignerFactory implements MidnightSignerFactory {
  public constructor(
    private readonly wallets$: Observable<MidnightWalletsByAccountId>,
  ) {}

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'InMemory' &&
      account.blockchainName === 'Midnight'
    );
  }

  public createTransactionSigner(
    context: MidnightSignerContext,
  ): MidnightTransactionSigner {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `MidnightInMemorySignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }

    return new MidnightInMemoryTransactionSigner({
      accountId: context.accountId,
      auth: context.auth,
      wallets$: this.wallets$,
    });
  }

  public createDataSigner(context: SignerContext): MidnightDataSigner {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `MidnightInMemorySignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }

    return new MidnightInMemoryDataSigner(context.accountId, this.wallets$);
  }
}
