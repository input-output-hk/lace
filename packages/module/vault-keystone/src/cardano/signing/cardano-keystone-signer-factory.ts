import { resolveSignerAccount } from '../../shared/resolve-signer-account';

import { CardanoKeystoneDataSigner } from './cardano-keystone-data-signer';
import { CardanoKeystoneTransactionSigner } from './cardano-keystone-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoBip32AccountProps,
  CardanoDataSigner,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
  MasterFingerprint,
} from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  HardwareWalletAccount,
} from '@lace-contract/wallet-repo';

/** Account props the Keystone needs to address signing at the device seed. */
interface KeystoneAccountProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
}

/**
 * Routes Cardano signing for air-gapped Keystone accounts. Construction is
 * side-effect free (no camera/UI): the QR exchange only fires inside the
 * signers' sign()/signData(), so the factory is safe to instantiate in the
 * service worker.
 */
export class CardanoKeystoneSignerFactory implements CardanoSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareKeystone' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    const props = this.#extractAccountProps(context);
    return new CardanoKeystoneTransactionSigner({
      ...props,
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    const props = this.#extractAccountProps(context);
    return new CardanoKeystoneDataSigner({
      ...props,
      knownAddresses: context.knownAddresses,
    });
  }

  #extractAccountProps(context: CardanoSignerContext): KeystoneAccountProps {
    const account = resolveSignerAccount({
      wallet: context.wallet,
      accountId: context.accountId,
      canSign: (candidate: AnyAccount) => this.canSign(candidate),
      factoryName: 'CardanoKeystoneSignerFactory',
    });
    const {
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      masterFingerprint,
    } = (account as HardwareWalletAccount<CardanoBip32AccountProps>)
      .blockchainSpecific;
    return {
      accountIndex,
      chainId,
      extendedAccountPublicKey,
      masterFingerprint,
    };
  }
}
