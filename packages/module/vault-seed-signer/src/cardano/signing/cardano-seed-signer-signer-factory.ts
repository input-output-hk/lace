import { resolveSignerAccount } from '../../shared/resolve-signer-account';

import { CardanoSeedSignerDataSigner } from './cardano-seed-signer-data-signer';
import { CardanoSeedSignerTransactionSigner } from './cardano-seed-signer-transaction-signer';

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

/** Account props the seed signer needs to address signing at the device seed. */
interface SeedSignerAccountProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
}

/**
 * Routes Cardano signing for air-gapped Seed Signer accounts. Construction is
 * side-effect free (no camera/UI): the QR exchange only fires inside the
 * signers' sign()/signData(), so the factory is safe to instantiate in the
 * service worker.
 */
export class CardanoSeedSignerSignerFactory implements CardanoSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareSeedSigner' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    const props = this.#extractAccountProps(context);
    return new CardanoSeedSignerTransactionSigner({
      ...props,
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
    });
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    const props = this.#extractAccountProps(context);
    return new CardanoSeedSignerDataSigner({
      ...props,
      knownAddresses: context.knownAddresses,
    });
  }

  #extractAccountProps(context: CardanoSignerContext): SeedSignerAccountProps {
    const account = resolveSignerAccount({
      wallet: context.wallet,
      accountId: context.accountId,
      canSign: (candidate: AnyAccount) => this.canSign(candidate),
      factoryName: 'CardanoSeedSignerSignerFactory',
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
