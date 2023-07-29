import { useCallback } from 'react';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useCardanoWalletManagerContext } from '@providers/CardanoWalletManager';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { AddressBookSchema, NftFoldersSchema, addressBookSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import { deleteFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { config } from '@src/config';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';

const { AVAILABLE_CHAINS, CHAIN } = config();

export interface CreateWallet {
  name: string;
  mnemonic: string[];
  password: string;
  chainId: Wallet.Cardano.ChainId;
}

export interface CreateWalletData {
  wallet: Wallet.CardanoWallet;
  encryptedKeyAgents: Uint8Array;
  name: string;
}

export interface SetWallet {
  walletInstance: CreateWalletData;
  chainName?: Wallet.ChainName;
  mnemonicVerificationFrequency?: string;
}

export interface CreateHardwareWallet {
  accountIndex?: number;
  name: string;
  deviceConnection: Wallet.DeviceConnection;
  chainId: Wallet.Cardano.ChainId;
  connectedDevice: Wallet.HardwareWallets;
}

export interface UseWalletManager {
  lockWallet: () => void;
  unlockWallet: (password: string) => Promise<Wallet.KeyAgentsByChain | void>;
  loadWallet: (callback?: (result: boolean) => void) => Promise<void>;
  createWallet: (args: CreateWallet) => Promise<CreateWalletData>;
  setWallet: (args: SetWallet) => Promise<void>;
  getPassword: () => Promise<Uint8Array>;
  createHardwareWallet: (args: CreateHardwareWallet) => Promise<Wallet.CardanoWalletByChain>;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  saveHardwareWallet: (wallet: Wallet.CardanoWalletByChain, chainName?: Wallet.ChainName) => Promise<void>;
  deleteWallet: (isForgotPasswordFlow?: boolean) => Promise<void>;
  executeWithPassword: <T>(password: string, promiseFn: () => Promise<T>, cleanPassword?: boolean) => Promise<T>;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;
}

/** Connects a hardware wallet device */
export const connectHardwareWallet = async (model: Wallet.HardwareWallets): Promise<Wallet.DeviceConnection> =>
  await Wallet.connectDevice(model);

export const useWalletManager = (): UseWalletManager => {
  const cardanoWalletManager = useCardanoWalletManagerContext();
  const {
    walletLock,
    setWalletLock,
    keyAgentData,
    setKeyAgentData,
    setCardanoWallet,
    resetWalletLock,
    setCurrentChain,
    setCardanoCoin,
    environmentName,
    walletManagerUi
  } = useWalletStore();
  const [settings, updateAppSettings] = useAppSettingsContext();
  const {
    utils: { clearTable: clearAddressBook }
  } = useDbState<AddressBookSchema, AddressBookSchema>([], addressBookSchema);
  const {
    utils: { clearTable: clearNftsFolders }
  } = useDbState<NftFoldersSchema, NftFoldersSchema>([], nftFoldersSchema);
  const backgroundService = useBackgroundServiceAPIContext();

  const storeMnemonicInBackgroundScript = useCallback(
    async (mnemonic: string[], password: string) => {
      const walletEncrypted = await Wallet.KeyManagement.emip3encrypt(
        Buffer.from(Wallet.KeyManagement.util.joinMnemonicWords(mnemonic)),
        Buffer.from(password)
      );
      await backgroundService.setBackgroundStorage({ mnemonic: JSON.stringify(walletEncrypted) });
    },
    [backgroundService]
  );

  /**
   * Called by the wallet when needed to decrypt private key.
   *
   * Input password must be set before a function that needs it is executed (e.g. finalizeTx()),
   * and should be cleared afterwards
   */
  const getPassword: () => Promise<Uint8Array> = useCallback(
    async () => backgroundService.getWalletPassword(),
    [backgroundService]
  );

  /**
   * Sets the wallet password and clears it right after running the promise unless `cleanPassword` is `true`
   */
  const executeWithPassword = useCallback(
    async <T>(password: string, promiseFn: () => Promise<T>, cleanPassword = true): Promise<T> => {
      try {
        backgroundService.setWalletPassword(Buffer.from(password));
        return await promiseFn();
      } finally {
        // Delete the password so we don't keep it in state. `cleanPassword` flag is needed for cip30 use
        if (cleanPassword) backgroundService.setWalletPassword();
      }
    },
    [backgroundService]
  );

  /**
   * Deletes wallet info in storage, which should be stored encrypted with the wallet password as lock
   */
  const lockWallet = useCallback(async (): Promise<void> => {
    if (!walletLock) return;
    // Deletes key agent data from storage and clears states
    await backgroundService.clearBackgroundStorage(['keyAgentsByChain']);
    deleteFromLocalStorage('keyAgentData');

    setKeyAgentData();
    setCardanoWallet();
  }, [backgroundService, setKeyAgentData, setCardanoWallet, walletLock]);

  /**
   * Recovers wallet info from encrypted lock using the wallet password
   */
  const unlockWallet = useCallback(
    async (password: string): Promise<Wallet.KeyAgentsByChain | void> => {
      if (!walletLock) return;
      const walletDecrypted = await Wallet.KeyManagement.emip3decrypt(walletLock, Buffer.from(password));

      // eslint-disable-next-line consistent-return
      return JSON.parse(walletDecrypted.toString());
    },
    [walletLock]
  );

  /**
   * Loads wallet from key agent serialized data in storage
   */
  const loadWallet = useCallback(
    async (callback?: (result: boolean) => void) => {
      // Wallet info for current network
      if (!keyAgentData) return;
      const walletName = getWalletFromStorage()?.name;
      if (!walletName) return;

      const wallet = await cardanoWalletManager.restoreWallet(
        walletManagerUi,
        walletName,
        keyAgentData,
        getPassword,
        environmentName,
        undefined,
        callback
      );
      setCardanoWallet(wallet);
    },
    [keyAgentData, cardanoWalletManager, walletManagerUi, getPassword, environmentName, setCardanoWallet]
  );

  /**
   * Creates or restores a new wallet with the cardano-js-sdk
   * and saves it in browser storage with the data to lock/unlock it
   */
  const createWallet = useCallback(
    async ({ mnemonic, name, password, chainId }: CreateWallet): Promise<CreateWalletData> => {
      const { keyAgentsByChain, ...wallet } = await executeWithPassword(password, () =>
        cardanoWalletManager.createCardanoWallet(walletManagerUi, name, mnemonic, getPassword, chainId)
      );

      // Encrypt key agents with password for lock/unlock feature
      const encryptedKeyAgents = await Wallet.KeyManagement.emip3encrypt(
        Buffer.from(JSON.stringify(keyAgentsByChain)),
        Buffer.from(password)
      );

      // Save in storage
      await storeMnemonicInBackgroundScript(mnemonic, password);
      await backgroundService.setBackgroundStorage({ keyAgentsByChain });
      saveValueInLocalStorage({ key: 'lock', value: encryptedKeyAgents });
      saveValueInLocalStorage({ key: 'wallet', value: { name } });
      saveValueInLocalStorage({ key: 'keyAgentData', value: wallet.keyAgent.serializableData });

      return { wallet, encryptedKeyAgents, name };
    },
    [
      backgroundService,
      walletManagerUi,
      executeWithPassword,
      storeMnemonicInBackgroundScript,
      getPassword,
      cardanoWalletManager
    ]
  );

  const setWallet = useCallback(
    async ({ walletInstance, mnemonicVerificationFrequency = '', chainName = CHAIN }: SetWallet): Promise<void> => {
      updateAppSettings({
        chainName,
        mnemonicVerificationFrequency,
        lastMnemonicVerification: dayjs().valueOf().toString()
      });

      // Set wallet states
      setWalletLock(walletInstance.encryptedKeyAgents);
      setCardanoWallet(walletInstance.wallet);
      setKeyAgentData(walletInstance.wallet.keyAgent.serializableData);
      setCurrentChain(chainName);
    },
    [updateAppSettings, setWalletLock, setCardanoWallet, setKeyAgentData, setCurrentChain]
  );

  /**
   * Creates a Ledger hardware wallet
   * and saves it in browser storage with the data to lock/unlock it
   */
  const createHardwareWallet = useCallback(
    async ({
      accountIndex = 0,
      deviceConnection,
      name,
      chainId,
      connectedDevice
    }: CreateHardwareWallet): Promise<Wallet.CardanoWalletByChain> =>
      cardanoWalletManager.createHardwareWallet(walletManagerUi, {
        accountIndex,
        deviceConnection,
        name,
        activeChainId: chainId,
        connectedDevice
      }),
    [walletManagerUi, cardanoWalletManager]
  );

  /**
   * Saves hardware wallet in storage and updates wallet store
   */
  const saveHardwareWallet = useCallback(
    async (wallet: Wallet.CardanoWalletByChain, chainName = CHAIN): Promise<void> => {
      const { keyAgentsByChain, ...cardanoWallet } = wallet;

      // Save in storage
      await backgroundService.setBackgroundStorage({ keyAgentsByChain });
      saveValueInLocalStorage({ key: 'wallet', value: { name: cardanoWallet.name } });
      saveValueInLocalStorage({ key: 'keyAgentData', value: cardanoWallet.keyAgent.serializableData });

      updateAppSettings({
        chainName,
        // Doesn't make sense for hardware wallets
        mnemonicVerificationFrequency: ''
      });

      // Set wallet states
      // eslint-disable-next-line unicorn/no-null
      setWalletLock(null); // Lock is not available for hardware wallets
      setCardanoWallet(cardanoWallet);
      setKeyAgentData(cardanoWallet.keyAgent.serializableData);
      setCurrentChain(chainName);
    },
    [backgroundService, updateAppSettings, setWalletLock, setCardanoWallet, setKeyAgentData, setCurrentChain]
  );

  /**
   * Deletes Wallet from memory, all info from browser storage and destroys all stores
   */
  const deleteWallet = useCallback(
    async (isForgotPasswordFlow = false): Promise<void> => {
      await Wallet.shutdownWallet(walletManagerUi);
      deleteFromLocalStorage('appSettings');
      deleteFromLocalStorage('showDappBetaModal');
      deleteFromLocalStorage('lastStaking');
      deleteFromLocalStorage('userInfo');
      deleteFromLocalStorage('keyAgentData');
      await backgroundService.clearBackgroundStorage(['message', 'mnemonic', 'keyAgentsByChain']);
      setKeyAgentData();
      resetWalletLock();
      setCardanoWallet();
      setCurrentChain(CHAIN);

      if (!isForgotPasswordFlow) {
        deleteFromLocalStorage('wallet');
        deleteFromLocalStorage('analyticsAccepted');
        clearAddressBook();
        clearNftsFolders();
      }
    },
    [
      walletManagerUi,
      backgroundService,
      clearAddressBook,
      clearNftsFolders,
      setKeyAgentData,
      resetWalletLock,
      setCardanoWallet,
      setCurrentChain
    ]
  );

  /**
   * Deactivates current wallet and activates it again with the new network
   */
  const switchNetwork = useCallback(
    async (chainName: Wallet.ChainName): Promise<void> => {
      const chainId = Wallet.Cardano.ChainIds[chainName];
      console.log('Switching chain to', chainName, AVAILABLE_CHAINS);
      if (!chainId || !AVAILABLE_CHAINS.includes(chainName)) throw new Error('Chain not supported');

      const backgroundStorage = await backgroundService.getBackgroundStorage();
      const keyAgentsByChain: Wallet.KeyAgentsByChain = backgroundStorage.keyAgentsByChain;
      const walletName = getWalletFromStorage()?.name;

      if (!keyAgentsByChain[chainName] || !walletName) throw new Error('Wallet data for chosen chain not found');
      const { keyAgentData: newKeyAgent } = keyAgentsByChain[chainName];
      if (!newKeyAgent) throw new Error('Wallet data for chosen chain is empty');

      const { asyncKeyAgent } = await Wallet.restoreWalletFromKeyAgent(
        walletManagerUi,
        walletName,
        newKeyAgent,
        getPassword,
        chainName,
        false
      );

      await Wallet.switchKeyAgents(walletManagerUi, walletName, asyncKeyAgent, chainName);

      updateAppSettings({ ...settings, chainName });
      saveValueInLocalStorage({ key: 'wallet', value: { name: walletName } });
      saveValueInLocalStorage({ key: 'keyAgentData', value: newKeyAgent });

      setCurrentChain(chainName);
      setCardanoCoin(chainId);
      setKeyAgentData(newKeyAgent);
    },
    [
      backgroundService,
      getPassword,
      setCardanoCoin,
      setCurrentChain,
      settings,
      updateAppSettings,
      walletManagerUi,
      setKeyAgentData
    ]
  );

  return {
    lockWallet,
    unlockWallet,
    loadWallet,
    createWallet,
    setWallet,
    getPassword,
    createHardwareWallet,
    connectHardwareWallet,
    saveHardwareWallet,
    deleteWallet,
    executeWithPassword,
    switchNetwork
  };
};
