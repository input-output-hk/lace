/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import { Wallet } from '@lace/cardano';
import isEqual from 'lodash/isEqual';
import isNil from 'lodash/isNil';
import { clearBackgroundStorage, getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/util';
import { BackgroundStorage, BackgroundStorageKeys } from '@lib/scripts/types';
import { bufferReviver } from '@src/utils/local-storage';
import { Migration } from '../migrations';
import { removeItemFromLocalStorage, getItemFromLocalStorage, setItemInLocalStorage } from '../util';
import { InvalidMigrationData } from '../errors';

const MIGRATION_VERSION = '0.6.0';
const throwInvalidDataError = (reason?: string) => {
  throw new InvalidMigrationData(MIGRATION_VERSION, reason);
};

export const v0_6_0: Migration = {
  version: MIGRATION_VERSION,
  requiresPassword: (): boolean => !!getItemFromLocalStorage<Uint8Array>('lock', undefined, bufferReviver),
  upgrade: async (password?: string) => {
    // Get all information needed for the migration from storage
    let oldWalletInfo = getItemFromLocalStorage<any>('wallet');
    const oldAppSettings = getItemFromLocalStorage<any>('appSettings');
    const oldLock: Uint8Array = getItemFromLocalStorage<Uint8Array>('lock', undefined, bufferReviver);
    // This is needed because of a previous workaround, without this we lose the wallet name if locked
    const backgroundStorage = (await getBackgroundStorage()) as unknown as { walletName: string };

    // Declare new migrated objects
    let newAppSettings: {
      mnemonicVerificationFrequency?: string;
      lastMnemonicVerification?: string;
      chainName?: Wallet.ChainName;
    };
    let newWalletInfo: { name: string };
    let newLock: Uint8Array;
    let newKeyAgentData: Wallet.KeyManagement.SerializableKeyAgentData;
    let newKeyAgentsByChain: Wallet.KeyAgentsByChain;
    // Migrate `appSettings`
    // If available, change chainId property to chainName but keep the same value
    if (oldAppSettings?.chainId) {
      const chainName = oldAppSettings.chainId as Wallet.ChainName;
      newAppSettings = {
        mnemonicVerificationFrequency: oldAppSettings.mnemonicVerificationFrequency,
        lastMnemonicVerification: oldAppSettings.lastMnemonicVerification,
        chainName
      };
    }

    // If `wallet` and `lock` are not available, it means that the wallet was never created
    const walletNotCreated = isNil(oldWalletInfo) && isNil(oldLock);
    if (!walletNotCreated) {
      // Migrate `wallet`
      // If `wallet` is not available and `lock` is, it means that the wallet was locked
      const walletWasLocked = isNil(oldWalletInfo) && !isNil(oldLock);
      if (walletWasLocked) {
        const decryptedLock = await Wallet.KeyManagement.emip3decrypt(oldLock, Buffer.from(password));
        if (isNil(decryptedLock)) throw new Error('Invalid data after recovering wallet with password');
        oldWalletInfo = JSON.parse(decryptedLock.toString());
      }

      // Wallet was not locked or was just unlocked above. Remove walletId and keyAgentData from wallet info
      if (oldWalletInfo.keyAgentData) {
        // Only name is needed in new wallet info
        newWalletInfo = { name: backgroundStorage?.walletName ?? oldWalletInfo.name };
        newKeyAgentData = oldWalletInfo.keyAgentData;

        // Find chain name for stored key agent
        const [keyAgentStoredChainName] =
          Object.entries(Wallet.Cardano.ChainIds).find(
            ([, id]) =>
              id.networkId === newKeyAgentData.chainId.networkId &&
              id.networkMagic === newKeyAgentData.chainId.networkMagic
          ) ?? [];

        // Generate keyAgentsDataByChain and save it in background storage
        newKeyAgentsByChain = {
          Preprod:
            keyAgentStoredChainName === 'Preprod'
              ? { keyAgentData: newKeyAgentData }
              : {
                  keyAgentData: { ...newKeyAgentData, chainId: Wallet.Cardano.ChainIds.Preprod, knownAddresses: [] }
                },
          Preview:
            keyAgentStoredChainName === 'Preview'
              ? { keyAgentData: newKeyAgentData }
              : {
                  keyAgentData: { ...newKeyAgentData, chainId: Wallet.Cardano.ChainIds.Preview, knownAddresses: [] }
                },
          Sanchonet:
            keyAgentStoredChainName === 'Sanchonet'
              ? { keyAgentData: newKeyAgentData }
              : {
                  keyAgentData: { ...newKeyAgentData, chainId: Wallet.Cardano.ChainIds.Sanchonet, knownAddresses: [] }
                },
          Mainnet:
            keyAgentStoredChainName === 'Mainnet'
              ? { keyAgentData: newKeyAgentData }
              : {
                  keyAgentData: { ...newKeyAgentData, chainId: Wallet.Cardano.ChainIds.Mainnet, knownAddresses: [] }
                }
        };

        if (newKeyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory) {
          newLock = await Wallet.KeyManagement.emip3encrypt(
            Buffer.from(JSON.stringify(newKeyAgentsByChain)),
            Buffer.from(password)
          );
        }
      }
    }

    return {
      prepare: async () => {
        // Save temporary storage. Revert and throw if something fails
        try {
          console.info('Saving temporary migration for', MIGRATION_VERSION);
          if (newAppSettings) setItemInLocalStorage('appSettings_tmp', newAppSettings);
          if (newWalletInfo) setItemInLocalStorage('wallet_tmp', newWalletInfo);
          if (newKeyAgentData) setItemInLocalStorage('keyAgentData_tmp', newKeyAgentData);
          if (newLock) setItemInLocalStorage('lock_tmp', newLock);
          if (newKeyAgentsByChain)
            await setBackgroundStorage({ keyAgentsByChain_tmp: newKeyAgentsByChain } as unknown as BackgroundStorage);
        } catch (error) {
          console.info(`Error saving temporary migrations for ${MIGRATION_VERSION}, deleting...`, error);
          removeItemFromLocalStorage('appSettings_tmp');
          removeItemFromLocalStorage('wallet_tmp');
          removeItemFromLocalStorage('keyAgentData_tmp');
          removeItemFromLocalStorage('lock_tmp');
          await clearBackgroundStorage(['keyAgentsByChain_tmp' as BackgroundStorageKeys]);
          throw error;
        }
      },
      assert: async (): Promise<boolean> => {
        console.info('Checking migrated data for version', MIGRATION_VERSION);
        // Temporary storage
        const tmpWalletInfo = getItemFromLocalStorage<any>('wallet_tmp');
        const tmpAppSettings = getItemFromLocalStorage<any>('appSettings_tmp');
        const tmpKeyAgentData = getItemFromLocalStorage<any>('keyAgentData_tmp');
        const tmpLock: Uint8Array = getItemFromLocalStorage<any>('lock_tmp', undefined, bufferReviver);
        const tmpBackgroundStorage = (await getBackgroundStorage()) as unknown as {
          keyAgentsByChain_tmp: Wallet.KeyAgentsByChain;
        };

        if (tmpAppSettings && !('chainName' in tmpAppSettings)) {
          throwInvalidDataError('Missing chain name in app settings');
        }

        // If there is no wallet, there shouldn't be any info stored related to the wallet
        if (
          walletNotCreated &&
          (tmpWalletInfo || tmpKeyAgentData || tmpLock || tmpBackgroundStorage?.keyAgentsByChain_tmp)
        ) {
          throwInvalidDataError('Wallet data should not exist');
        } else if (walletNotCreated) {
          return true;
        }

        // If there was a wallet, check mandatory things
        if (!walletNotCreated && !(tmpWalletInfo && tmpKeyAgentData && tmpBackgroundStorage?.keyAgentsByChain_tmp)) {
          throwInvalidDataError('Wallet data missing');
        }

        if (Object.keys(tmpWalletInfo).length !== 1 || !('name' in tmpWalletInfo)) {
          throwInvalidDataError('Missing name in wallet info');
        }

        if (
          !(
            '__typename' in tmpKeyAgentData &&
            'chainId' in tmpKeyAgentData &&
            'accountIndex' in tmpKeyAgentData &&
            'knownAddresses' in tmpKeyAgentData &&
            'extendedAccountPublicKey' in tmpKeyAgentData
          )
        ) {
          throwInvalidDataError('Missing field in key agent data');
        }

        if (
          !(
            'Preprod' in tmpBackgroundStorage.keyAgentsByChain_tmp &&
            'Preview' in tmpBackgroundStorage.keyAgentsByChain_tmp &&
            'Mainnet' in tmpBackgroundStorage.keyAgentsByChain_tmp
          )
        ) {
          throwInvalidDataError('Missing key agent for one or more chains');
        }
        if (tmpLock) {
          const decryptedLock = await Wallet.KeyManagement.emip3decrypt(tmpLock, Buffer.from(password));
          if (!decryptedLock?.toString()) throwInvalidDataError('Decrypted lock is empty');
          if (!isEqual(JSON.parse(decryptedLock.toString()), tmpBackgroundStorage.keyAgentsByChain_tmp)) {
            throwInvalidDataError('Decrypted lock is not valid');
          }
        }

        return true;
      },
      persist: async () => {
        console.info(`Persisting migrated data for ${MIGRATION_VERSION} upgrade`);
        // Get temporary storage
        const tmpAppSettings = getItemFromLocalStorage('appSettings_tmp');
        const tmpWalletInfo = getItemFromLocalStorage('wallet_tmp');
        const tmpKeyAgentData = getItemFromLocalStorage('keyAgentData_tmp');
        const tmpLock = getItemFromLocalStorage('lock_tmp');
        const tmpBackgroundStorage = (await getBackgroundStorage()) as unknown as { keyAgentsByChain_tmp: any };
        // Replace actual storage
        if (tmpAppSettings) setItemInLocalStorage('appSettings', tmpAppSettings);
        if (tmpWalletInfo) setItemInLocalStorage('wallet', tmpWalletInfo);
        if (tmpKeyAgentData) setItemInLocalStorage('keyAgentData', tmpKeyAgentData);
        if (tmpLock) setItemInLocalStorage('lock', tmpLock);
        if (tmpBackgroundStorage?.keyAgentsByChain_tmp) {
          await setBackgroundStorage({ keyAgentsByChain: tmpBackgroundStorage.keyAgentsByChain_tmp });
        }
        await clearBackgroundStorage(['walletName' as BackgroundStorageKeys]);
        // Delete temporary storage
        removeItemFromLocalStorage('appSettings_tmp');
        removeItemFromLocalStorage('wallet_tmp');
        removeItemFromLocalStorage('keyAgentData_tmp');
        removeItemFromLocalStorage('lock_tmp');
        await clearBackgroundStorage(['keyAgentsByChain_tmp' as BackgroundStorageKeys]);
      },
      rollback: async () => {
        console.info(`Rollback migrated data for ${MIGRATION_VERSION} upgrade`);
        // Restore actual storage to their original values
        if (oldAppSettings) setItemInLocalStorage('appSettings', oldAppSettings);
        if (oldWalletInfo) setItemInLocalStorage('wallet', oldWalletInfo);
        if (oldLock) setItemInLocalStorage('lock', oldLock);
        removeItemFromLocalStorage('keyAgentData');
        await clearBackgroundStorage(['keyAgentsByChain']);
        if (backgroundStorage?.walletName)
          await setBackgroundStorage({ walletName: backgroundStorage.walletName } as BackgroundStorage);
        // Delete any temporary storage that may have been created
        removeItemFromLocalStorage('appSettings_tmp');
        removeItemFromLocalStorage('wallet_tmp');
        removeItemFromLocalStorage('keyAgentData_tmp');
        removeItemFromLocalStorage('lock_tmp');
        await clearBackgroundStorage(['keyAgentsByChain_tmp' as BackgroundStorageKeys]);
      }
    };
  }
};
