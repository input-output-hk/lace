import { CardanoLedgerDataSigner } from './cardano-ledger-data-signer';
import { CardanoLedgerTransactionSigner } from './cardano-ledger-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoBip32AccountProps,
  CardanoDataSigner,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  HardwareWalletAccount,
} from '@lace-contract/wallet-repo';

export class CardanoLedgerSignerFactory implements CardanoSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareLedger' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    this.#assertSupported(context);
    const { accountIndex, chainId, extendedAccountPublicKey } =
      this.#extractAccountProps(context);

    return new CardanoLedgerTransactionSigner({
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);
    const { accountIndex, chainId, extendedAccountPublicKey } =
      this.#extractAccountProps(context);

    return new CardanoLedgerDataSigner({
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      knownAddresses: context.knownAddresses,
    });
  }

  #assertSupported(context: CardanoSignerContext): void {
    this.#assertAccountSupported(context.wallet, context.accountId);
  }

  #assertAccountSupported(wallet: AnyWallet, accountId: AccountId): void {
    const account = wallet.accounts.find(a => a.accountId === accountId);
    if (!account || !this.canSign(account)) {
      throw new Error(
        `CardanoLedgerSignerFactory does not support account type: ${
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
      account as HardwareWalletAccount<CardanoBip32AccountProps>
    ).blockchainSpecific;

    return { accountIndex, chainId, extendedAccountPublicKey };
  }
}
