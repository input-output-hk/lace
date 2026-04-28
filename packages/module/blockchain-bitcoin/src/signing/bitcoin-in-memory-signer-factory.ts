import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';

import { BitcoinInMemoryDataSigner } from './bitcoin-in-memory-data-signer';
import { BitcoinInMemoryTransactionSigner } from './bitcoin-in-memory-transaction-signer';

import type {
  BitcoinDataSigner,
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyAccount, InMemoryWallet } from '@lace-contract/wallet-repo';

export class BitcoinInMemorySignerFactory implements BitcoinSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'InMemory' && account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    this.#assertSupported(context);

    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    return new BitcoinInMemoryTransactionSigner({
      encryptedRootPrivateKey,
      auth: context.auth,
    });
  }

  public createDataSigner(context: BitcoinSignerContext): BitcoinDataSigner {
    const account = this.#assertSupported(context);

    const encryptedRootPrivateKey =
      this.#extractEncryptedRootPrivateKey(context);

    const networkId = account.blockchainSpecific.networkId as unknown as
      | BlockchainNetworkId
      | undefined;
    const network = networkId
      ? BitcoinNetworkId.getBitcoinNetwork(networkId)
      : undefined;
    if (!network) {
      throw new Error(
        `Cannot resolve Bitcoin network from networkId: ${String(networkId)}`,
      );
    }

    return new BitcoinInMemoryDataSigner({
      encryptedRootPrivateKey,
      auth: context.auth,
      network,
      accountIndex: account.blockchainSpecific.accountIndex,
    });
  }

  #assertSupported(context: BitcoinSignerContext) {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `BitcoinInMemorySignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }
    return account as typeof account & {
      blockchainSpecific: { accountIndex: number; networkId?: string };
    };
  }

  #extractEncryptedRootPrivateKey(context: BitcoinSignerContext) {
    const { wallet } = context;
    const encryptedRootPrivateKey = (wallet as InMemoryWallet)
      .blockchainSpecific.Bitcoin?.encryptedRootPrivateKey;
    if (!encryptedRootPrivateKey) {
      throw new Error('Wallet is missing Bitcoin encrypted root private key');
    }
    return encryptedRootPrivateKey;
  }
}
