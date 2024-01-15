/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Migration } from '../migrations';
import { getItemFromLocalStorage, removeItemFromLocalStorage, setItemInLocalStorage } from '../util';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { walletManager, walletRepository } from '@src/lib/wallet-api-ui';
import { Wallet } from '@lace/cardano';
import { AddWalletProps, WalletType, getWalletId } from '@cardano-sdk/web-extension';
import { HexBlob } from '@cardano-sdk/util';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { firstValueFrom } from 'rxjs';

const MIGRATION_VERSION = '1.8.2';
const LOCK_STORAGE = 'lock';
const KEY_AGENT_DATA_STORAGE = 'keyAgentData';
const LOCK_TEMP_STORAGE = 'lock_tmp';
const KEY_AGENT_DATA_TEMP_STORAGE = 'keyAgentData_tmp';

const provider = { type: Wallet.WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER, options: {} };

const isWalletLoacked = (lock: string, keyAgentData: string) => lock && !keyAgentData;

const decryptLock = async (lock: number[], password: string) => {
  const walletDecrypted = await Wallet.KeyManagement.emip3decrypt(Buffer.from(lock), Buffer.from(password));
  const walletParsed: Wallet.KeyAgentsByChain = JSON.parse(walletDecrypted.toString());

  return walletParsed.Mainnet;
};

const keyAgentDataToAddWalletProps = async (
  data: Wallet.KeyManagement.SerializableKeyAgentData
): Promise<AddWalletProps<Wallet.Metadata>> => {
  switch (data.__typename) {
    case Wallet.KeyManagement.KeyAgentType.InMemory: {
      const { mnemonic } = await getBackgroundStorage();
      if (!mnemonic) throw new Error('Inconsistent state: mnemonic not found for in-memory wallet');
      return {
        type: WalletType.InMemory,
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
        extendedAccountPublicKey: data.extendedAccountPublicKey
      };
    case Wallet.KeyManagement.KeyAgentType.Trezor:
      return {
        type: WalletType.Trezor,
        extendedAccountPublicKey: data.extendedAccountPublicKey
      };
    default:
      throw new Error('Unknown key agent type');
  }
};

export const v_1_8_2: Migration = {
  version: MIGRATION_VERSION,
  requiresPassword: () => {
    const lock = getItemFromLocalStorage<any>(LOCK_STORAGE);
    const keyAgentData = getItemFromLocalStorage<any>(KEY_AGENT_DATA_STORAGE);

    if (isWalletLoacked(lock, keyAgentData)) {
      return true;
    }

    return false;
  },
  upgrade: async (password) => {
    const lock = getItemFromLocalStorage<any>(LOCK_STORAGE);
    const keyAgentData =
      getItemFromLocalStorage<any>(KEY_AGENT_DATA_STORAGE) || (await decryptLock(lock.data, password)).keyAgentData;

    return {
      prepare: () => {
        // Save temporary storage. Revert if something fails
        try {
          console.info('Saving temporary migration for', MIGRATION_VERSION);

          if (keyAgentData) {
            setItemInLocalStorage(KEY_AGENT_DATA_TEMP_STORAGE, keyAgentData);
          }
          if (lock) {
            setItemInLocalStorage(LOCK_TEMP_STORAGE, lock);
          }
        } catch (error) {
          console.info(`Error saving temporary migrations for ${MIGRATION_VERSION}, deleting...`, error);
          removeItemFromLocalStorage(KEY_AGENT_DATA_TEMP_STORAGE);
          removeItemFromLocalStorage(LOCK_TEMP_STORAGE);
          throw error;
        }
      },
      assert: () => void 0,
      persist: async () => {
        console.info(`Persisting migrated data for ${MIGRATION_VERSION} upgrade`);

        const walletName = getWalletFromStorage()?.name;
        const wallets = await firstValueFrom(walletRepository.wallets$);
        const walletProps = await keyAgentDataToAddWalletProps(keyAgentData);
        const walletId = await getWalletId(
          walletProps.type === WalletType.Script ? walletProps.script : walletProps.extendedAccountPublicKey
        );
        const lockValue =
          keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory ? HexBlob.fromBytes(lock) : undefined;

        if (!wallets.some((wallet) => wallet.walletId === walletId)) {
          await walletRepository.addWallet(await keyAgentDataToAddWalletProps(keyAgentData));

          await walletRepository.addAccount({
            accountIndex: keyAgentData.accountIndex,
            metadata: { name: walletName, lockValue },
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
          setItemInLocalStorage(LOCK_STORAGE, '');
        }

        removeItemFromLocalStorage(KEY_AGENT_DATA_STORAGE);
        removeItemFromLocalStorage(KEY_AGENT_DATA_TEMP_STORAGE);
        removeItemFromLocalStorage(LOCK_TEMP_STORAGE);
      },
      rollback: () => {
        console.info(`Rollback migrated data for ${MIGRATION_VERSION} upgrade`);
        if (keyAgentData) {
          setItemInLocalStorage(KEY_AGENT_DATA_STORAGE, keyAgentData);
        }
        if (lock) {
          setItemInLocalStorage(LOCK_STORAGE, lock);
        }
        removeItemFromLocalStorage(KEY_AGENT_DATA_TEMP_STORAGE);
        removeItemFromLocalStorage(LOCK_TEMP_STORAGE);
      }
    };
  }
};
