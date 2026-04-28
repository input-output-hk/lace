import { CardanoTrezorDataSigner } from './cardano-trezor-data-signer';
import { CardanoTrezorTransactionSigner } from './cardano-trezor-transaction-signer';

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
import type { DerivationType } from '@lace-contract/onboarding-v2';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  HardwareWalletAccount,
  HardwareWalletTrezor,
} from '@lace-contract/wallet-repo';

export class CardanoTrezorSignerFactory implements CardanoSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareTrezor' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    this.#assertSupported(context);
    const { accountIndex, chainId, extendedAccountPublicKey, derivationType } =
      this.#extractAccountProps(context);

    return new CardanoTrezorTransactionSigner({
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      derivationType,
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    this.#assertSupported(context);

    return new CardanoTrezorDataSigner();
  }

  #assertSupported(context: CardanoSignerContext): void {
    this.#assertAccountSupported(context.wallet, context.accountId);
  }

  #assertAccountSupported(wallet: AnyWallet, accountId: AccountId): void {
    const account = wallet.accounts.find(a => a.accountId === accountId);
    if (!account || !this.canSign(account)) {
      throw new Error(
        `CardanoTrezorSignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }
  }

  #extractAccountProps(context: CardanoSignerContext): {
    accountIndex: number;
    chainId: Cardano.ChainId;
    extendedAccountPublicKey: Bip32PublicKeyHex;
    derivationType?: DerivationType;
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

    const derivationType = (wallet as HardwareWalletTrezor).metadata
      ?.derivationType as DerivationType | undefined;

    return { accountIndex, chainId, extendedAccountPublicKey, derivationType };
  }
}
