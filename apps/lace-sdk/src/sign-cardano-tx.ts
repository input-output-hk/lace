import { Cardano } from '@cardano-sdk/core';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  isCardanoAddress,
  type CardanoSignRequest,
  type CardanoSignResult,
  type CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import { CompositeSignerFactory } from '@lace-contract/signer';
import { WalletType, type InMemoryWallet } from '@lace-contract/wallet-repo';
import { ByteArray, Err, HexBytes, Ok } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';

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
  /** Password for in-memory wallets. Required for now (only wallet type supported). */
  password?: Uint8Array;
  /** Cardano in-memory account to sign with. Required when >1 exists. */
  accountId?: AccountId;
}

export const signCardanoTx = async (
  wallet: WalletWithCardanoSigning,
  props: SignCardanoTxProps,
): Promise<Result<CardanoSignResult, Error>> => {
  const { serializedTx, password, accountId: requestedAccountId } = props;

  if (!password) {
    return Err(
      new Error(
        'password is required — only in-memory wallet signing is currently supported',
      ),
    );
  }

  try {
    const { stateObservables: obs } = wallet;

    // --- Read state from observables (type-safe, no cast needed) ---
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

    // --- Resolve account + wallet ---
    const inMemoryWallets = allWallets.filter(
      (w): w is InMemoryWallet => w.type === WalletType.InMemory,
    );

    const cardanoInMemoryAccounts = inMemoryWallets.flatMap(w =>
      w.accounts.filter(
        a =>
          a.blockchainName === 'Cardano' &&
          activeNetworkIds.includes(a.blockchainNetworkId),
      ),
    );

    let accountId: AccountId;
    let walletEntity: InMemoryWallet;

    if (requestedAccountId) {
      const found = cardanoInMemoryAccounts.find(
        a => a.accountId === requestedAccountId,
      );
      if (!found) {
        return Err(
          new Error(
            `Cardano in-memory account "${requestedAccountId}" not found on the active network`,
          ),
        );
      }
      accountId = found.accountId;
      walletEntity = inMemoryWallets.find(w => w.walletId === found.walletId)!;
    } else {
      if (cardanoInMemoryAccounts.length === 0) {
        return Err(
          new Error(
            'No Cardano in-memory accounts found on the active network',
          ),
        );
      }
      if (cardanoInMemoryAccounts.length > 1) {
        return Err(
          new Error(
            `Multiple Cardano in-memory accounts found (${cardanoInMemoryAccounts.length}) — specify accountId to disambiguate`,
          ),
        );
      }
      const account = cardanoInMemoryAccounts[0];
      accountId = account.accountId;
      walletEntity = inMemoryWallets.find(
        w => w.walletId === account.walletId,
      )!;
    }

    // --- Build known addresses (same mapping as confirm-tx.ts) ---
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

    // --- Get UTXOs ---
    const utxo = accountUtxos[accountId] ?? [];

    // --- Create headless SignerAuth ---
    const auth: SignerAuth = {
      authenticate: () => of(true),
      accessAuthSecret: callback => callback(AuthSecret(ByteArray(password))),
    };

    // --- Load signer factory ---
    const signerFactories = (await wallet._loadModules(
      'addons.loadSignerFactory',
    )) as SignerFactory[];
    const signerFactory = new CompositeSignerFactory(signerFactories);

    // --- Sign ---
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
