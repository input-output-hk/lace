/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Migration } from '../migrations';
import { getItemFromLocalStorage, removeItemFromLocalStorage, setItemInLocalStorage } from '../util';
import { getBackgroundStorage } from '@lib/scripts/background/storage';
import { walletRepository } from '@src/lib/wallet-api-ui';
import { Wallet } from '@lace/cardano';
import { AddWalletProps, WalletType } from '@cardano-sdk/web-extension';
import { HexBlob } from '@cardano-sdk/util';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';

const MIGRATION_VERSION = '1.8.2';
const LOCK_STORAGE = 'lock';
const KEY_AGENT_DATA_STORAGE = 'keyAgentData';
const LOCK_TEMP_STORAGE = 'lock_tmp';
const KEY_AGENT_DATA_TEMP_STORAGE = 'keyAgentData_tmp';

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
  upgrade: async () => {
    const lock = getItemFromLocalStorage<any>(LOCK_STORAGE);
    const keyAgentData = getItemFromLocalStorage<any>(KEY_AGENT_DATA_STORAGE);

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
        const walletId = await walletRepository.addWallet(await keyAgentDataToAddWalletProps(keyAgentData));

        const lockValue =
          keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory ? HexBlob.fromBytes(lock) : undefined;

        await walletRepository.addAccount({
          accountIndex: keyAgentData.accountIndex,
          metadata: { name: walletName, lockValue },
          walletId
        });

        if (lock && !keyAgentData) {
          setItemInLocalStorage(LOCK_STORAGE, lockValue);
        }

        if (lock && keyAgentData) {
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
