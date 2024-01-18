/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Migration } from '../migrations';
import { getItemFromLocalStorage, removeItemFromLocalStorage, setItemInLocalStorage } from '../util';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { walletManager, walletRepository } from '@src/lib/wallet-api-ui';
import { Wallet } from '@lace/cardano';
import { AddWalletProps, AnyWallet, WalletType, getWalletId } from '@cardano-sdk/web-extension';
import { HexBlob } from '@cardano-sdk/util';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { firstValueFrom } from 'rxjs';
import { bufferReviver, getValueFromLocalStorage } from '@src/utils/local-storage';

const MIGRATION_VERSION = '1.8.2';
const LOCK_STORAGE = 'lock';
const KEY_AGENT_DATA_STORAGE = 'keyAgentData';
const WALLET_METADATA_STORAGE = 'wallet';

const provider = { type: Wallet.WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER, options: {} };

const isWalletLoacked = (lock: Uint8Array, keyAgentData: Wallet.KeyManagement.SerializableKeyAgentData) =>
  lock && !keyAgentData;

const decryptLock = async (lock: Uint8Array, password: string) => {
  const walletDecrypted = await Wallet.KeyManagement.emip3decrypt(Buffer.from(lock), Buffer.from(password));
  const walletParsed: Wallet.KeyAgentsByChain = JSON.parse(walletDecrypted.toString());

  return walletParsed.Mainnet;
};

const removeWallet = async (wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[], walletId: string) => {
  const wallet = wallets.find((currentWallet) => currentWallet.walletId === walletId);

  if (wallet) {
    await walletRepository.removeWallet(wallet.walletId);
  }
};

const keyAgentDataToAddWalletProps = async (
  data: Wallet.KeyManagement.SerializableKeyAgentData,
  lockValue: Wallet.HexBlob,
  name: string
): Promise<AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata>> => {
  switch (data.__typename) {
    case Wallet.KeyManagement.KeyAgentType.InMemory: {
      const { mnemonic } = await getBackgroundStorage();
      if (!mnemonic) throw new Error('Inconsistent state: mnemonic not found for in-memory wallet');
      return {
        type: WalletType.InMemory,
        metadata: { name, lockValue },
        extendedAccountPublicKey: data.extendedAccountPublicKey,
        encryptedSecrets: {
          rootPrivateKeyBytes: HexBlob.fromBytes(Buffer.from(data.encryptedRootPrivateKeyBytes)),
          keyMaterial: HexBlob.fromBytes(Buffer.from(JSON.parse(mnemonic).data))
        }
      };
    }
    case Wallet.KeyManagement.KeyAgentType.Ledger:
      return {
        type: WalletType.Ledger,
        metadata: { name },
        extendedAccountPublicKey: data.extendedAccountPublicKey
      };
    case Wallet.KeyManagement.KeyAgentType.Trezor:
      return {
        type: WalletType.Trezor,
        metadata: { name },
        extendedAccountPublicKey: data.extendedAccountPublicKey
      };
    default:
      throw new Error('Unknown key agent type');
  }
};

export const v_1_8_2: Migration = {
  version: MIGRATION_VERSION,
  requiresPassword: () => {
    const lock = getValueFromLocalStorage(LOCK_STORAGE, undefined, bufferReviver);
    const keyAgentData = getItemFromLocalStorage<Wallet.KeyManagement.SerializableKeyAgentData>(KEY_AGENT_DATA_STORAGE);

    if (isWalletLoacked(lock, keyAgentData)) {
      return true;
    }

    return false;
  },
  upgrade: async (password) => {
    const walletMetadata = getWalletFromStorage();
    const lock = getItemFromLocalStorage<any>(LOCK_STORAGE);
    const keyAgentData =
      getItemFromLocalStorage<Wallet.KeyManagement.SerializableKeyAgentData>(KEY_AGENT_DATA_STORAGE) ||
      (await decryptLock(lock, password)).keyAgentData;
    const lockValue =
      keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory ? HexBlob.fromBytes(lock) : undefined;
    const walletProps = await keyAgentDataToAddWalletProps(keyAgentData, lockValue, walletMetadata?.name);
    const walletId = await getWalletId(
      walletProps.type === WalletType.Script ? walletProps.script : walletProps.extendedAccountPublicKey
    );
    const wallets = await firstValueFrom(walletRepository.wallets$);

    return {
      prepare: () => void 0,
      assert: () => void 0,
      persist: async () => {
        console.info(`Persisting migrated data for ${MIGRATION_VERSION} upgrade`);

        if (!wallets.some((wallet) => wallet.walletId === walletId)) {
          await walletRepository.addWallet(walletProps);

          await walletRepository.addAccount({
            accountIndex: keyAgentData.accountIndex,
            metadata: { name: `Account #${keyAgentData.accountIndex}` },
            walletId
          });

          await walletManager.activate({
            chainId: keyAgentData.chainId,
            walletId,
            accountIndex: keyAgentData.accountIndex,
            provider
          });
        }

        if (isWalletLoacked(lock, keyAgentData)) {
          setItemInLocalStorage(LOCK_STORAGE, lockValue);
        } else {
          removeItemFromLocalStorage(LOCK_STORAGE);
        }

        removeItemFromLocalStorage(KEY_AGENT_DATA_STORAGE);
        removeItemFromLocalStorage(WALLET_METADATA_STORAGE);
      },
      rollback: async () => {
        console.info(`Rollback migrated data for ${MIGRATION_VERSION} upgrade`);
        if (keyAgentData) {
          setItemInLocalStorage(KEY_AGENT_DATA_STORAGE, keyAgentData);
        }
        if (lock) {
          setItemInLocalStorage(LOCK_STORAGE, lock);
        }
        if (walletMetadata) {
          setItemInLocalStorage(WALLET_METADATA_STORAGE, walletMetadata);
        }

        await removeWallet(wallets, walletId);
      }
    };
  }
};
