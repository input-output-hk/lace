import { resolveSignerAccount } from '../shared/resolve-signer-account';

import { BitcoinSeedSignerTransactionSigner } from './signing/bitcoin-seed-signer-transaction-signer';

import type {
  BitcoinBip32AccountProps,
  BitcoinDataSigner,
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type {
  AnyAccount,
  HardwareWalletAccount,
} from '@lace-contract/wallet-repo';

/**
 * Routes Bitcoin signing for air-gapped Seed Signer accounts. Construction is
 * side-effect free (no camera/UI): the QR exchange only fires inside the
 * signer's sign(). bitcoinjs-lib is imported statically so it ships in the
 * preloaded signer-factory addon chunk and loads on a cold service-worker
 * wake (ADR-25).
 */
export class BitcoinSeedSignerSignerFactory implements BitcoinSignerFactory {
  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'HardwareSeedSigner' &&
      account.blockchainName === 'Bitcoin'
    );
  }

  public createTransactionSigner(
    context: BitcoinSignerContext,
  ): BitcoinTransactionSigner {
    const { masterFingerprint } = this.#extractAccountProps(context);
    return new BitcoinSeedSignerTransactionSigner({ masterFingerprint });
  }

  public createDataSigner(_context: BitcoinSignerContext): BitcoinDataSigner {
    throw new Error(
      'BIP-322 message signing is not supported by the Bitcoin Seed Signer',
    );
  }

  #extractAccountProps(
    context: BitcoinSignerContext,
  ): BitcoinBip32AccountProps {
    const account = resolveSignerAccount({
      wallet: context.wallet,
      accountId: context.accountId,
      canSign: (candidate: AnyAccount) => this.canSign(candidate),
      factoryName: 'BitcoinSeedSignerSignerFactory',
    });
    return (account as HardwareWalletAccount<BitcoinBip32AccountProps>)
      .blockchainSpecific;
  }
}
