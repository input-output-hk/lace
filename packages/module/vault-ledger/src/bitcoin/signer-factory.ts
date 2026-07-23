import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';

import { resolveSignerAccount } from '../shared/resolve-signer-account';

import { BitcoinLedgerTransactionSigner } from './signing/bitcoin-ledger-transaction-signer';

import type { LedgerBitcoinTransport } from '../ledger-bitcoin-transport';
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
import type { DeviceDescriptor } from '@lace-lib/util-hw';

export interface BitcoinLedgerSignerFactoryDependencies {
  transport: LedgerBitcoinTransport;
  resolveLegacyDevice?: () => Promise<DeviceDescriptor>;
}

/**
 * Routes Bitcoin signing for Ledger accounts. Construction is side-effect
 * free (no device I/O): the transport is only contacted inside the signer's
 * sign(). bitcoinjs-lib and ledger-bitcoin are imported statically so they
 * ship in the preloaded signer-factory addon chunk and load on a cold
 * service-worker wake (ADR-25).
 */
export class BitcoinLedgerSignerFactory implements BitcoinSignerFactory {
  readonly #dependencies: BitcoinLedgerSignerFactoryDependencies;

  public constructor(dependencies: BitcoinLedgerSignerFactoryDependencies) {
    this.#dependencies = dependencies;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareLedger' &&
      account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    const {
      masterFingerprint,
      accountIndex,
      extendedAccountPublicKeys,
      networkId,
    } = this.#extractAccountProps(context);

    if (!masterFingerprint) {
      throw new Error(
        'Bitcoin Ledger account is missing the device master fingerprint',
      );
    }

    return new BitcoinLedgerTransactionSigner(
      {
        masterFingerprint,
        accountIndex,
        extendedPublicKey: extendedAccountPublicKeys.nativeSegWit,
        network: this.#resolveNetwork(networkId),
        walletId: context.wallet.walletId,
      },
      this.#dependencies,
    );
  }

  public createDataSigner(_context: BitcoinSignerContext): BitcoinDataSigner {
    throw new Error(
      'BIP-322 message signing is not supported by the Bitcoin Ledger',
    );
  }

  #extractAccountProps(
    context: BitcoinSignerContext,
  ): BitcoinBip32AccountProps {
    const account = resolveSignerAccount({
      wallet: context.wallet,
      accountId: context.accountId,
      canSign: (candidate: AnyAccount) => this.canSign(candidate),
      factoryName: 'BitcoinLedgerSignerFactory',
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
      throw new Error('Bitcoin Ledger account is missing its network id');
    }
    return network;
  }
}
