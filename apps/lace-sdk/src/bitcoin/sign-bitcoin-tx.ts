import { AuthSecret } from '@lace-contract/authentication-prompt';
import { CompositeSignerFactory } from '@lace-contract/signer';
import {
  WalletType,
  type InMemoryWallet,
  type LazyInMemoryWallet,
} from '@lace-contract/wallet-repo';
import { ByteArray, Err, HexBytes, Ok } from '@lace-lib/util';
import { firstValueFrom, of, throwError } from 'rxjs';

import { resolveBitcoinAccount } from './resolve-bitcoin-account';

import type {
  BitcoinSignerContext,
  BitcoinSignerFactory,
  BitcoinSignRequest,
  BitcoinSignResult,
} from '@lace-contract/bitcoin-context';
import type {
  createModuleLoader,
  StateObservables,
} from '@lace-contract/module';
import type { networkSelectors } from '@lace-contract/network';
import type { SignerAuth } from '@lace-contract/signer';
import type { AccountId, walletsSelectors } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

type RequiredObservables = StateObservables<
  typeof networkSelectors & typeof walletsSelectors
>;

/**
 * Structural requirement: the wallet must have been created with
 * Bitcoin + network + wallet-repo modules loaded.
 */
export type WalletWithBitcoinSigning = {
  stateObservables: Pick<RequiredObservables, 'network' | 'wallets'>;
  _loadModules: ReturnType<typeof createModuleLoader>;
};

/** The options of `signBitcoinTx`: the transaction, and what signs it. */
export interface SignBitcoinTxProps extends BitcoinSignRequest {
  /**
   * The wallet's password. Required when the signing account belongs to a
   * {@link WalletType.InMemory} wallet, one created with a password; ignored
   * for a `LazyInMemory` wallet, whose vault module supplies the keys.
   */
  password?: Uint8Array;
  /**
   * Bitcoin account to sign with. Required when more than one signable
   * Bitcoin account is present on the active network.
   */
  accountId?: AccountId;
}

type SignableBitcoinWallet = InMemoryWallet | LazyInMemoryWallet;

const isSignableBitcoinWallet = (wallet: {
  type: WalletType;
}): wallet is SignableBitcoinWallet =>
  wallet.type === WalletType.InMemory ||
  wallet.type === WalletType.LazyInMemory;

/**
 * Signs a Bitcoin transaction with the wallet's keys, through the signer of
 * its wallet kind, with no confirmation prompt of the SDK's own: confirm with
 * the user before calling it. The account is `props.accountId`, or the only
 * signable Bitcoin account on the active network. A `LazyInMemory` account
 * signs through the vault module of `createBitcoinLazyInMemoryVaultModule`.
 *
 * @param wallet - A wallet holding the signing account (see
 *   {@link WalletWithBitcoinSigning}).
 * @param props - The unsigned transaction from `buildBitcoinTx`, and the
 *   password and account when needed.
 * @returns `Ok` with the signed transaction, ready for `submitBitcoinTx`, or
 *   `Err` when no account matches, the password is missing or signing fails.
 *   It never rejects.
 */
export const signBitcoinTx = async (
  wallet: WalletWithBitcoinSigning,
  props: SignBitcoinTxProps,
): Promise<Result<BitcoinSignResult, Error>> => {
  const { serializedTx, password, accountId: requestedAccountId } = props;

  try {
    const { stateObservables: obs } = wallet;

    const allWallets = await firstValueFrom(obs.wallets.selectAll$);
    const activeNetworkIds = await firstValueFrom(
      obs.network.selectAllActiveNetworkIds$,
    );

    const resolved = resolveBitcoinAccount(
      allWallets.filter(isSignableBitcoinWallet),
      activeNetworkIds,
      requestedAccountId,
    );
    if (resolved.isErr()) return Err(resolved.error);
    const { account, walletEntity } = resolved.value;

    if (walletEntity.type === WalletType.InMemory && !password) {
      return Err(
        new Error(
          'password is required for InMemory wallets: supply props.password or use a LazyInMemory wallet',
        ),
      );
    }

    const auth: SignerAuth = {
      authenticate: () => of(true),
      accessAuthSecret: callback =>
        password
          ? callback(AuthSecret(ByteArray(password)))
          : throwError(
              () =>
                new Error(
                  'accessAuthSecret called on a wallet that has no password: this is a LazyInMemory wallet; signer factories must not access the auth secret',
                ),
            ),
    };

    const signerFactories = (await wallet._loadModules(
      'addons.loadSignerFactory',
    )) as BitcoinSignerFactory[];
    const signerFactory = new CompositeSignerFactory(signerFactories);

    const context: BitcoinSignerContext = {
      wallet: walletEntity,
      accountId: account.accountId,
      auth,
    };

    const signer = signerFactory.createTransactionSigner(context);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes(serializedTx) }),
    );
    return Ok(result as BitcoinSignResult);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
