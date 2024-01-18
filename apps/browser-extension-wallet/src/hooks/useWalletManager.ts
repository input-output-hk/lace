import { useCallback } from 'react';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { AddressBookSchema, addressBookSchema, NftFoldersSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import { logger, observableWallet, signingCoordinator, walletManager, walletRepository } from '@src/lib/wallet-api-ui';
import { deleteFromLocalStorage, clearLocalStorage, getValueFromLocalStorage } from '@src/utils/local-storage';
import { config } from '@src/config';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/matomo/config';
import { ILocalStorage } from '@src/types';
import { firstValueFrom } from 'rxjs';
import { AddWalletProps, WalletType } from '@cardano-sdk/web-extension';
import { HexBlob } from '@cardano-sdk/util';
import { BackgroundService } from '@lib/scripts/types';

const { AVAILABLE_CHAINS, CHAIN } = config();
export const LOCK_VALUE = Buffer.from(JSON.stringify({ lock: 'lock' }), 'utf8');

export interface CreateWallet {
  name: string;
  mnemonic: string[];
  password: string;
  chainId: Wallet.Cardano.ChainId;
}

export interface SetWallet {
  walletInstance: Wallet.CardanoWallet;
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
  unlockWallet: (password: string) => Promise<boolean>;
  loadWallet: () => Promise<Wallet.CardanoWallet | null>;
  createWallet: (args: CreateWallet) => Promise<Wallet.CardanoWallet>;
  activateWallet: (args: SetWallet) => Promise<void>;
  getPassword: () => Promise<Uint8Array>;
  createHardwareWallet: (args: CreateHardwareWallet) => Promise<Wallet.CardanoWallet>;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  saveHardwareWallet: (wallet: Wallet.CardanoWallet, chainName?: Wallet.ChainName) => Promise<void>;
  deleteWallet: (isForgotPasswordFlow?: boolean) => Promise<void>;
  clearPassword: () => void;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;
}

const provider = { type: Wallet.WalletManagerProviderTypes.CARDANO_SERVICES_PROVIDER, options: {} };
const chainIdFromName = (chainName: Wallet.ChainName) => {
  const chainId = Wallet.Cardano.ChainIds[chainName];
  if (!chainId || !AVAILABLE_CHAINS.includes(chainName)) throw new Error('Chain not supported');
  return chainId;
};

const defaultAccountName = (accountIndex: number) => `Account #${accountIndex}`;

const keyAgentDataToAddWalletProps = async (
  data: Wallet.KeyManagement.SerializableKeyAgentData,
  backgroundService: BackgroundService,
  name: string,
  lockValue: Wallet.HexBlob
): Promise<AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata>> => {
  switch (data.__typename) {
    case Wallet.KeyManagement.KeyAgentType.InMemory: {
      const { mnemonic } = await backgroundService.getBackgroundStorage();
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

const encryptMnemonic = async (mnemonic: string[], passphrase: Uint8Array) => {
  const walletEncrypted = await Wallet.KeyManagement.emip3encrypt(
    Buffer.from(Wallet.KeyManagement.util.joinMnemonicWords(mnemonic)),
    passphrase
  );
  return HexBlob.fromBytes(walletEncrypted);
};

/**
 * Creates or restores a new in-memory wallet with the cardano-js-sdk and saves it in wallet repository
 */
const createWallet = async ({ mnemonic, name, password, chainId }: CreateWallet): Promise<Wallet.CardanoWallet> => {
  const accountIndex = 0;
  const passphrase = Buffer.from(password, 'utf8');
  const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      chainId,
      getPassphrase: async () => passphrase,
      mnemonicWords: mnemonic,
      accountIndex
    },
    {
      bip32Ed25519: Wallet.bip32Ed25519,
      logger
    }
  );

  const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
    metadata: { name },
    encryptedSecrets: {
      keyMaterial: await encryptMnemonic(mnemonic, passphrase),
      rootPrivateKeyBytes: HexBlob.fromBytes(
        Buffer.from(
          (keyAgent.serializableData as Wallet.KeyManagement.SerializableInMemoryKeyAgentData)
            .encryptedRootPrivateKeyBytes
        )
      )
    },
    extendedAccountPublicKey: keyAgent.extendedAccountPublicKey,
    type: WalletType.InMemory
  };

  const lockValue = HexBlob.fromBytes(await Wallet.KeyManagement.emip3encrypt(LOCK_VALUE, passphrase));
  const walletId = await walletRepository.addWallet(addWalletProps);
  const addAccountProps = {
    accountIndex,
    metadata: { name: defaultAccountName(accountIndex), lockValue },
    walletId
  };
  await walletRepository.addAccount(addAccountProps);

  // Save in storage

  // Clear passphrase
  for (let i = 0; i < passphrase.length; i++) {
    passphrase[i] = 0;
  }

  return {
    name,
    signingCoordinator,
    wallet: observableWallet,
    source: {
      wallet: {
        ...addWalletProps,
        accounts: [addAccountProps],
        walletId
      },
      account: addAccountProps
    }
  };
};

/**
 * Creates a Ledger or Trezor hardware wallet
 * and saves it in browser storage with the data to lock/unlock it
 */
const createHardwareWallet = async ({
  accountIndex = 0,
  deviceConnection,
  name,
  chainId,
  connectedDevice
}: CreateHardwareWallet): Promise<Wallet.CardanoWallet> => {
  const keyAgent =
    connectedDevice === Wallet.KeyManagement.KeyAgentType.Ledger
      ? await Wallet.Ledger.LedgerKeyAgent.createWithDevice(
          {
            chainId,
            communicationType: Wallet.KeyManagement.CommunicationType.Web,
            accountIndex,
            deviceConnection: typeof deviceConnection === 'object' ? deviceConnection : undefined
          },
          { bip32Ed25519: Wallet.bip32Ed25519, logger }
        )
      : await Wallet.Trezor.TrezorKeyAgent.createWithDevice(
          {
            chainId,
            trezorConfig: {
              communicationType: Wallet.KeyManagement.CommunicationType.Web,
              manifest: Wallet.manifest
            },
            accountIndex
          },
          { bip32Ed25519: Wallet.bip32Ed25519, logger }
        );

  const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
    metadata: { name },
    type: WalletType.Ledger,
    extendedAccountPublicKey: keyAgent.extendedAccountPublicKey
  };
  const walletId = await walletRepository.addWallet(addWalletProps);
  const addAccountProps = {
    walletId,
    accountIndex,
    metadata: { name: defaultAccountName(accountIndex) }
  };
  await walletRepository.addAccount(addAccountProps);

  return {
    name,
    signingCoordinator,
    wallet: observableWallet,
    source: {
      wallet: {
        ...addWalletProps,
        accounts: [addAccountProps],
        walletId
      },
      account: addAccountProps
    }
  };
};

/** Connects a hardware wallet device */
export const connectHardwareWallet = async (model: Wallet.HardwareWallets): Promise<Wallet.DeviceConnection> =>
  await Wallet.connectDevice(model);

export const useWalletManager = (): UseWalletManager => {
  const {
    walletLock,
    setWalletLock,
    cardanoWallet,
    setCardanoWallet,
    resetWalletLock,
    setCurrentChain,
    setCardanoCoin,
    setAddressesDiscoveryCompleted
  } = useWalletStore();
  const [settings, updateAppSettings] = useAppSettingsContext();
  const {
    utils: { clearTable: clearAddressBook }
  } = useDbState<AddressBookSchema, AddressBookSchema>([], addressBookSchema);
  const {
    utils: { clearTable: clearNftsFolders }
  } = useDbState<NftFoldersSchema, NftFoldersSchema>([], nftFoldersSchema);
  const backgroundService = useBackgroundServiceAPIContext();
  const userIdService = getUserIdService();

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
   * Clears the wallet password
   */
  const clearPassword = useCallback(() => {
    backgroundService.setWalletPassword();
  }, [backgroundService]);

  /**
   * Deletes wallet lock in storage, which should be stored encrypted with the wallet password
   */
  const lockWallet = useCallback(async (): Promise<void> => {
    const lockValue = cardanoWallet.source.wallet.metadata.lockValue;
    if (!lockValue) return;
    setWalletLock(Buffer.from(lockValue, 'hex'));
    setCardanoWallet();
    setAddressesDiscoveryCompleted(false);
  }, [setCardanoWallet, cardanoWallet, setWalletLock, setAddressesDiscoveryCompleted]);

  /**
   * Recovers wallet info from encrypted lock using the wallet password
   */
  const unlockWallet = useCallback(
    async (password: string): Promise<boolean> => {
      if (!walletLock) return true;
      try {
        const walletDecrypted = await Wallet.KeyManagement.emip3decrypt(walletLock, Buffer.from(password));
        // If JSON.parse succeeds, it means it was successfully decrypted
        JSON.parse(walletDecrypted.toString());
        return true;
      } catch {
        return false;
      }
    },
    [walletLock]
  );

  /**
   * Loads wallet from storage.
   * @returns resolves with wallet information or null when no wallet is found
   */
  // eslint-disable-next-line max-statements
  const loadWallet = useCallback(async (): Promise<Wallet.CardanoWallet | undefined> => {
    let wallets = await firstValueFrom(walletRepository.wallets$);

    // Migration from stored serializable key agent data
    // REVIEW: should this be in /migrations or maybe useAppInit?
    // TODO: this is untested. Test plan:
    // - clone lace master, build extension, create wallet using same extension key
    // - build this branch, copy over dist/ to installed extension directory
    // - reload the extension and check if Lace still works and preserves the original wallet data
    //   - it should load fairly fast, because it is supposed to be using the same pouchdb stores
    // This should be tested with a ledger wallet and in-memory wallet
    if (wallets.length === 0) {
      const walletName = getWalletFromStorage()?.name;
      const keyAgentData = getValueFromLocalStorage('keyAgentData');
      const lock = getValueFromLocalStorage('lock');
      // Wallet info for current network
      if (!keyAgentData || !walletName) {
        // eslint-disable-next-line unicorn/no-null
        setCardanoWallet(null);
        return;
      }

      const lockValue =
        keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory ? HexBlob.fromBytes(lock) : undefined;

      const walletId = await walletRepository.addWallet(
        await keyAgentDataToAddWalletProps(keyAgentData, backgroundService, walletName, lockValue)
      );

      await walletRepository.addAccount({
        accountIndex: keyAgentData.accountIndex,
        metadata: { name: defaultAccountName(keyAgentData.accountIndex) },
        walletId
      });
      await walletManager.activate({
        chainId: keyAgentData.chainId,
        walletId,
        accountIndex: keyAgentData.accountIndex,
        provider
      });
      wallets = await firstValueFrom(walletRepository.wallets$);
    }

    let activeWalletId = await firstValueFrom(walletManager.activeWalletId$);

    if (!activeWalletId) {
      const chainId = chainIdFromName(process.env.DEFAULT_CHAIN as Wallet.ChainName);
      activeWalletId = {
        provider,
        chainId,
        walletId: wallets[0].walletId,
        accountIndex: wallets[0].type !== WalletType.Script ? wallets[0].accounts[0].accountIndex : undefined
      };

      await walletManager.activate(activeWalletId);
    }

    const activeWallet = wallets.find((wallet) => wallet.walletId === activeWalletId.walletId);
    if (!activeWallet) {
      // eslint-disable-next-line unicorn/no-null
      setCardanoWallet(null);
      return;
    }
    if (activeWallet.type === WalletType.Script) throw new Error('Script wallet support is not implemented');
    const activeAccount = activeWallet.accounts.find((account) => account.accountIndex === activeWalletId.accountIndex);
    if (!activeAccount) {
      // eslint-disable-next-line unicorn/no-null
      setCardanoWallet(null);
      return;
    }

    const result = {
      name: activeWallet.metadata.name,
      signingCoordinator,
      source: {
        wallet: activeWallet,
        account: activeAccount
      },
      wallet: observableWallet
    };
    setCardanoWallet(result);
    // REVIEW: why "Async arrow function expected no return value."?
    // eslint-disable-next-line consistent-return
    return result;
  }, [backgroundService, setCardanoWallet]);

  const activateWallet = useCallback(
    async ({ walletInstance, mnemonicVerificationFrequency = '', chainName = CHAIN }: SetWallet): Promise<void> => {
      await walletManager.activate({
        chainId: chainIdFromName(chainName),
        walletId: walletInstance.source.wallet.walletId,
        accountIndex: walletInstance.source.account?.accountIndex,
        provider
      });
      updateAppSettings({
        chainName,
        mnemonicVerificationFrequency,
        lastMnemonicVerification: dayjs().valueOf().toString()
      });

      // Set wallet states
      setCardanoWallet(walletInstance);
      setCurrentChain(chainName);
    },
    [updateAppSettings, setCardanoWallet, setCurrentChain]
  );

  /**
   * Saves hardware wallet in storage and updates wallet store
   */
  const saveHardwareWallet = useCallback(
    async (wallet: Wallet.CardanoWallet, chainName = CHAIN): Promise<void> => {
      updateAppSettings({
        chainName,
        // Doesn't make sense for hardware wallets
        mnemonicVerificationFrequency: ''
      });

      setCardanoWallet(wallet);
      setCurrentChain(chainName);
    },
    [updateAppSettings, setCardanoWallet, setCurrentChain]
  );

  /**
   * Deletes Wallet from memory, all info from browser storage and destroys all stores
   */
  const deleteWallet = useCallback(
    async (isForgotPasswordFlow = false): Promise<void> => {
      const activeWallet = await firstValueFrom(walletManager.activeWalletId$);
      await walletManager.deactivate();
      deleteFromLocalStorage('appSettings');
      deleteFromLocalStorage('showDappBetaModal');
      deleteFromLocalStorage('lastStaking');
      deleteFromLocalStorage('userInfo');
      deleteFromLocalStorage('keyAgentData');
      await backgroundService.clearBackgroundStorage({
        except: ['fiatPrices', 'userId', 'usePersistentUserId', 'experimentsConfiguration']
      });
      resetWalletLock();
      setCardanoWallet();
      setCurrentChain(CHAIN);

      const commonLocalStorageKeysToKeep: (keyof ILocalStorage)[] = [
        'currency',
        'lock',
        'mode',
        'hideBalance',
        'isForgotPasswordFlow',
        'multidelegationFirstVisit',
        'multidelegationFirstVisitSincePortfolioPersistence'
      ];

      if (isForgotPasswordFlow) {
        const additionalKeysToKeep: (keyof ILocalStorage)[] = ['wallet', ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY];
        clearLocalStorage({
          except: [...commonLocalStorageKeysToKeep, ...additionalKeysToKeep]
        });
        return;
      }

      clearLocalStorage({ except: commonLocalStorageKeysToKeep });
      await userIdService.clearId();
      clearAddressBook();
      clearNftsFolders();

      for (const chainName of AVAILABLE_CHAINS) {
        await walletManager.destroyData(activeWallet.walletId, chainIdFromName(chainName));
      }
      await walletRepository.removeWallet(activeWallet.walletId);
    },
    [
      resetWalletLock,
      setCardanoWallet,
      backgroundService,
      setCurrentChain,
      userIdService,
      clearAddressBook,
      clearNftsFolders
    ]
  );

  /**
   * Deactivates current wallet and activates it again with the new network
   */
  const switchNetwork = useCallback(
    async (chainName: Wallet.ChainName): Promise<void> => {
      console.info('Switching chain to', chainName, AVAILABLE_CHAINS);

      const chainId = chainIdFromName(chainName);
      await walletManager.switchNetwork(chainId);

      setAddressesDiscoveryCompleted(false);
      updateAppSettings({ ...settings, chainName });

      setCurrentChain(chainName);
      setCardanoCoin(chainId);
    },
    [setAddressesDiscoveryCompleted, updateAppSettings, settings, setCurrentChain, setCardanoCoin]
  );

  return {
    lockWallet,
    unlockWallet,
    loadWallet,
    createWallet,
    activateWallet,
    getPassword,
    createHardwareWallet,
    connectHardwareWallet,
    saveHardwareWallet,
    deleteWallet,
    clearPassword,
    switchNetwork
  };
};
