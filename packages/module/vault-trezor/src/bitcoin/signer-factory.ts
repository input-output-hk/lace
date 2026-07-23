import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';

import { resolveSignerAccount } from '../shared/resolve-signer-account';

import { BitcoinTrezorTransactionSigner } from './signing/bitcoin-trezor-transaction-signer';

import type { TrezorBitcoinConnect } from '../trezor-bitcoin-connect';
import type {
  BitcoinBip32AccountProps,
  BitcoinDataSigner,
  BitcoinNetwork,
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type {
  AnyAccount,
  HardwareWalletAccount,
} from '@lace-contract/wallet-repo';

export interface BitcoinTrezorSignerFactoryDependencies {
  /** Resolves the platform's already-initialized Trezor Connect instance. */
  getConnect: () => Promise<TrezorBitcoinConnect>;
}

/**
 * Routes Bitcoin signing for Trezor accounts. Construction is side-effect
 * free (no device I/O): Trezor Connect is only contacted inside the signer's
 * sign(). bitcoinjs-lib and the connect packages are imported statically so
 * they ship in the preloaded signer-factory addon chunk and load on a cold
 * service-worker wake.
 */
export class BitcoinTrezorSignerFactory implements BitcoinSignerFactory {
  readonly #dependencies: BitcoinTrezorSignerFactoryDependencies;

  public constructor(dependencies: BitcoinTrezorSignerFactoryDependencies) {
    this.#dependencies = dependencies;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareTrezor' &&
      account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    const { masterFingerprint, networkId } = this.#extractAccountProps(context);

    if (!masterFingerprint) {
      throw new Error(
        'Bitcoin Trezor account is missing the device master fingerprint',
      );
    }

    return new BitcoinTrezorTransactionSigner(
      { masterFingerprint, network: this.#resolveNetwork(networkId) },
      this.#dependencies,
    );
  }

  public createDataSigner(_context: BitcoinSignerContext): BitcoinDataSigner {
    throw new Error(
      'BIP-322 message signing is not supported by the Bitcoin Trezor',
    );
  }

  #extractAccountProps(
    context: BitcoinSignerContext,
  ): BitcoinBip32AccountProps {
    const account = resolveSignerAccount({
      wallet: context.wallet,
      accountId: context.accountId,
      canSign: (candidate: AnyAccount) => this.canSign(candidate),
      factoryName: 'BitcoinTrezorSignerFactory',
    });
    return (account as HardwareWalletAccount<BitcoinBip32AccountProps>)
      .blockchainSpecific;
  }

  #resolveNetwork(
    networkId: BitcoinBip32AccountProps['networkId'],
  ): BitcoinNetwork {
    const network = networkId
      ? BitcoinNetworkId.getBitcoinNetwork(networkId)
      : undefined;
    if (!network) {
      throw new Error('Bitcoin Trezor account is missing its network id');
    }
    return network;
  }
}
