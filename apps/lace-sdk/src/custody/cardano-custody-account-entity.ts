import { Cardano } from '@cardano-sdk/core';
import {
  CardanoAccountId,
  CardanoCustodyDeviceKeyMismatchError,
  CardanoCustodyWalletId,
  CardanoNetworkId,
} from '@lace-contract/cardano-context';
import { WalletType } from '@lace-contract/wallet-repo';
import { firstValueFrom } from 'rxjs';

import { deriveCardanoCustodyDevice } from './cardano-custody-device';
import { parseRecord } from './cardano-custody-records';
import { readCardanoChainId } from './cardano-custody-wallet';

import type { CardanoCustodyAccountRecord } from './cardano-custody-records';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type {
  CardanoCustodyAccount,
  CardanoCustodyDeviceBinding,
  CardanoCustodyWalletEntity,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

export type CreateCardanoCustodyAccountEntityProps = {
  /** The account's public record; it is validated again here. */
  record: CardanoCustodyAccountRecord;
  /**
   * The device this app signs owner operations with. Omit it to open the
   * account as an observer, such as an agent: it syncs and builds grant
   * spends, but runs no owner operation.
   */
  device?: CardanoCustodyDeviceBinding;
  name: string;
  order?: number;
};

const assertBindingDerives = async ({
  extendedAccountPublicKey,
  index,
  keyHash,
}: CardanoCustodyDeviceBinding): Promise<void> => {
  const derived = await deriveCardanoCustodyDevice(
    extendedAccountPublicKey,
    index,
  );
  if (derived.keyHash !== keyHash.toLowerCase()) {
    throw new CardanoCustodyDeviceKeyMismatchError(keyHash, derived.keyHash);
  }
};

/**
 * Builds the wallet entity of one custody account on the wallet's network,
 * for `wallets.addWallet`. The wallet id derives from the account's stake
 * script hash and the network, so every device and every observer of the
 * account opens the same entity. The account exists on that network only.
 *
 * To reopen an account the wallet already holds, or to switch its device,
 * use `openCardanoCustodyAccount`: `addWallet` ignores a wallet id the
 * wallet already holds.
 *
 * It is safe to call right after `createLaceWallet`: it waits up to 30
 * seconds for the wallet to select its network.
 *
 * @throws {@link CardanoCustodyNetworkNotReadyError} When the wallet selects no
 *   Cardano network within 30 seconds.
 * @throws {@link CardanoCustodyRecordInvalidError} When the record is invalid or
 *   for another network.
 * @throws {@link CardanoCustodyUnsupportedVersionError}
 * @throws {@link CardanoCustodyDeviceKeyMismatchError} When the device binding's
 *   key hash is not the key its public key derives at its index.
 */
export const createCardanoCustodyAccountEntity = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { record, device, name, order = 0 }: CreateCardanoCustodyAccountEntityProps,
): Promise<{ entity: CardanoCustodyWalletEntity }> => {
  const { networkMagic } = await readCardanoChainId(wallet);
  const { identity } = parseRecord(record, networkMagic);
  if (device) await assertBindingDerives(device);

  const blockchainNetworkId = CardanoNetworkId(networkMagic);
  const walletId = CardanoCustodyWalletId.derive(
    networkMagic,
    identity.stakeScriptHash,
  );
  const account: CardanoCustodyAccount = {
    accountId: CardanoAccountId(walletId, 0, networkMagic),
    walletId,
    accountType: 'CardanoCustody',
    blockchainName: 'Cardano',
    blockchainNetworkId,
    networkType:
      identity.chainId.networkId === Cardano.NetworkId.Mainnet
        ? 'mainnet'
        : 'testnet',
    metadata: { name },
    blockchainSpecific: {
      chainId: identity.chainId,
      networkId: blockchainNetworkId,
      accountValidatorHash: identity.contractVersion.accountValidatorHash,
      creatorKeyHash: identity.creatorKeyHash,
      stakeScriptHash: identity.stakeScriptHash,
      address: identity.address,
      rewardAccount: identity.rewardAccount,
      ...(device && { device }),
    },
  };
  return {
    entity: {
      type: WalletType.CardanoCustody,
      walletId,
      metadata: { name, order },
      blockchainSpecific: {},
      accounts: [account],
    },
  };
};

/**
 * Puts a custody account entity in the wallet. A wallet the repository
 * already holds keeps its names and is updated in place with the account's
 * identity and device binding; `addWallet` would ignore it.
 */
export const putCardanoCustodyAccount = async (
  wallet: Pick<WalletWithCardanoCustody, 'dispatch' | 'stateObservables'>,
  entity: CardanoCustodyWalletEntity,
): Promise<void> => {
  const wallets = await firstValueFrom(
    wallet.stateObservables.wallets.selectAll$,
  );
  const existing = wallets.find(
    candidate => candidate.walletId === entity.walletId,
  );
  const [account] = entity.accounts;
  if (!existing) {
    wallet.dispatch('wallets.addWallet', entity);
  } else if (
    existing.accounts.some(
      candidate => candidate.accountId === account.accountId,
    )
  ) {
    wallet.dispatch(
      'wallets.updateAccount',
      entity.walletId,
      account.accountId,
      { blockchainSpecific: account.blockchainSpecific },
    );
  } else {
    wallet.dispatch('wallets.updateWallet', {
      id: entity.walletId,
      changes: { accounts: entity.accounts },
    });
  }
};

/**
 * Opens a custody account in the wallet from its record: adds it, or, when
 * the wallet already holds it, replaces its device binding in place. Omit
 * `device` to open or turn the account into an observer.
 *
 * @throws Like {@link createCardanoCustodyAccountEntity}.
 */
export const openCardanoCustodyAccount = async (
  wallet: Pick<WalletWithCardanoCustody, 'dispatch' | 'stateObservables'>,
  props: CreateCardanoCustodyAccountEntityProps,
): Promise<{ accountId: AccountId; entity: CardanoCustodyWalletEntity }> => {
  const { entity } = await createCardanoCustodyAccountEntity(wallet, props);
  await putCardanoCustodyAccount(wallet, entity);
  return { accountId: entity.accounts[0].accountId, entity };
};
