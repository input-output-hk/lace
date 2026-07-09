import { Cardano } from '@cardano-sdk/core';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  isCardanoAddress,
  type CardanoSignRequest,
  type CardanoSignResult,
  type CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import { CompositeSignerFactory } from '@lace-contract/signer';
import {
  WalletType,
  type InMemoryWallet,
  type LazyInMemoryWallet,
} from '@lace-contract/wallet-repo';
import { ByteArray, Err, HexBytes, Ok } from '@lace-sdk/util';
import { firstValueFrom, of, throwError } from 'rxjs';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { Address, addressesSelectors } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  cardanoContextSelectors,
} from '@lace-contract/cardano-context';
import type {
  createModuleLoader,
  StateObservables,
} from '@lace-contract/module';
import type { networkSelectors } from '@lace-contract/network';
import type { SignerAuth, SignerFactory } from '@lace-contract/signer';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { walletsSelectors } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-sdk/util';

type RequiredObservables = StateObservables<
  typeof addressesSelectors &
    typeof cardanoContextSelectors &
    typeof networkSelectors &
    typeof walletsSelectors
>;

/**
 * Structural requirement: the wallet must have been created with
 * Cardano + addresses + network + wallet-repo modules loaded.
 */
export type WalletWithCardanoSigning = {
  stateObservables: Pick<
    RequiredObservables,
    'addresses' | 'cardanoContext' | 'network' | 'wallets'
  >;
  _loadModules: ReturnType<typeof createModuleLoader>;
};

export interface SignCardanoTxProps extends CardanoSignRequest {
  /**
   * Password for {@link WalletType.InMemory} wallets. Required when the
   * resolved account is `InMemory`; ignored for `LazyInMemory` accounts
   * (the mnemonic is fetched on demand by the signer factory).
   */
  password?: Uint8Array;
  /**
   * Cardano account to sign with. Required when more than one signable
   * Cardano account is present on the active network.
   */
  accountId?: AccountId;
}

type SignableCardanoWallet = InMemoryWallet | LazyInMemoryWallet;

const isSignableCardanoWallet = (wallet: {
  type: WalletType;
}): wallet is SignableCardanoWallet =>
  wallet.type === WalletType.InMemory ||
  wallet.type === WalletType.LazyInMemory;

export const signCardanoTx = async (
  wallet: WalletWithCardanoSigning,
  props: SignCardanoTxProps,
): Promise<Result<CardanoSignResult, Error>> => {
  const { serializedTx, password, accountId: requestedAccountId } = props;

  try {
    const { stateObservables: obs } = wallet;

    const allWallets = await firstValueFrom(obs.wallets.selectAll$);
    const activeNetworkIds = await firstValueFrom(
      obs.network.selectAllActiveNetworkIds$,
    );
    const allAddresses = await firstValueFrom(
      obs.addresses.selectAllAddresses$,
    );
    const accountUtxos = await firstValueFrom(
      obs.cardanoContext.selectAccountUtxos$,
    );

    const signableWallets = allWallets.filter(isSignableCardanoWallet);

    const cardanoAccounts = signableWallets.flatMap(w =>
      w.accounts.filter(
        a =>
          a.blockchainName === 'Cardano' &&
          activeNetworkIds.includes(a.blockchainNetworkId),
      ),
    );

    let accountId: AccountId;
    let walletEntity: SignableCardanoWallet;

    if (requestedAccountId) {
      const found = cardanoAccounts.find(
        a => a.accountId === requestedAccountId,
      );
      if (!found) {
        return Err(
          new Error(
            `Cardano account "${requestedAccountId}" not found on the active network`,
          ),
        );
      }
      accountId = found.accountId;
      walletEntity = signableWallets.find(w => w.walletId === found.walletId)!;
    } else {
      if (cardanoAccounts.length === 0) {
        return Err(
          new Error('No Cardano accounts found on the active network'),
        );
      }
      if (cardanoAccounts.length > 1) {
        return Err(
          new Error(
            `Multiple Cardano accounts found (${cardanoAccounts.length}) — specify accountId to disambiguate`,
          ),
        );
      }
      const account = cardanoAccounts[0];
      accountId = account.accountId;
      walletEntity = signableWallets.find(
        w => w.walletId === account.walletId,
      )!;
    }

    if (walletEntity.type === WalletType.InMemory && !password) {
      return Err(
        new Error(
          'password is required for InMemory wallets — supply props.password or use a LazyInMemory wallet',
        ),
      );
    }

    const knownAddresses = allAddresses
      .filter(
        addr =>
          addr.accountId === accountId && addr.blockchainName === 'Cardano',
      )
      .filter(isCardanoAddress)
      .map(addr => ({ data: addr.data, address: addr.address }))
      .filter(
        (addr): addr is { data: CardanoAddressData; address: Address } =>
          !!addr.data,
      )
      .map(
        (addr): GroupedAddress => ({
          type: addr.data.type,
          index: addr.data.index,
          networkId: addr.data.networkId,
          accountIndex: addr.data.accountIndex,
          address: Cardano.PaymentAddress(addr.address),
          rewardAccount: Cardano.RewardAccount(addr.data.rewardAccount),
          stakeKeyDerivationPath: addr.data.stakeKeyDerivationPath,
        }),
      );

    const utxo = accountUtxos[accountId] ?? [];

    const auth: SignerAuth = {
      authenticate: () => of(true),
      accessAuthSecret: callback =>
        password
          ? callback(AuthSecret(ByteArray(password)))
          : throwError(
              () =>
                new Error(
                  'accessAuthSecret called on a wallet that has no password — this is a LazyInMemory wallet; signer factories must not access the auth secret',
                ),
            ),
    };

    const signerFactories = (await wallet._loadModules(
      'addons.loadSignerFactory',
    )) as SignerFactory[];
    const signerFactory = new CompositeSignerFactory(signerFactories);

    const context: CardanoTransactionSignerContext = {
      wallet: walletEntity,
      accountId,
      knownAddresses,
      utxo,
      auth,
    };

    const signer = signerFactory.createTransactionSigner(context);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes(serializedTx) }),
    );
    return Ok(result as CardanoSignResult);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
