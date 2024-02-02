/* eslint-disable consistent-return */
/* eslint-disable unicorn/no-null */
import { useCallback } from 'react';
import dayjs from 'dayjs';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@stores';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { AddressBookSchema, addressBookSchema, NftFoldersSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import { logger, observableWallet, signingCoordinator, walletManager, walletRepository } from '@src/lib/wallet-api-ui';
import {
  deleteFromLocalStorage,
  clearLocalStorage,
  getValueFromLocalStorage,
  saveValueInLocalStorage
} from '@src/utils/local-storage';
import { config } from '@src/config';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/matomo/config';
import { ILocalStorage } from '@src/types';
import { firstValueFrom } from 'rxjs';
import { AddWalletProps, AnyWallet, WalletType } from '@cardano-sdk/web-extension';
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
const getChainName = (chainId: Wallet.Cardano.ChainId): Wallet.ChainName => {
  switch (chainId.networkMagic) {
    case Wallet.Cardano.ChainIds.Mainnet.networkMagic:
      return 'Mainnet';
    case Wallet.Cardano.ChainIds.Preprod.networkMagic:
      return 'Preprod';
    case Wallet.Cardano.ChainIds.Preview.networkMagic:
      return 'Preview';
  }

  throw new Error('Chain name is not in known ChainIds');
};

const defaultAccountName = (accountIndex: number) => `Account #${accountIndex}`;

const keyAgentDataToAddWalletProps = async (
  data: Wallet.KeyManagement.SerializableKeyAgentData,
  backgroundService: BackgroundService,
  name: string,
  lockValue: Wallet.HexBlob | undefined
): Promise<AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata>> => {
  const accounts = [
    {
      accountIndex: data.accountIndex,
      metadata: { name: defaultAccountName(data.accountIndex) },
      extendedAccountPublicKey: data.extendedAccountPublicKey
    }
  ];
  switch (data.__typename) {
    case Wallet.KeyManagement.KeyAgentType.InMemory: {
      const { mnemonic } = await backgroundService.getBackgroundStorage();
      if (!mnemonic) throw new Error('Inconsistent state: mnemonic not found for in-memory wallet');
      return {
        type: WalletType.InMemory,
        metadata: { name, lockValue },
        encryptedSecrets: {
          rootPrivateKeyBytes: HexBlob.fromBytes(Buffer.from(data.encryptedRootPrivateKeyBytes)),
          keyMaterial: HexBlob.fromBytes(Buffer.from(JSON.parse(mnemonic).data))
        },
        accounts
      };
    }
    case Wallet.KeyManagement.KeyAgentType.Ledger:
      return {
        type: WalletType.Ledger,
        metadata: { name },
        accounts
      };
    case Wallet.KeyManagement.KeyAgentType.Trezor:
      return {
        type: WalletType.Trezor,
        metadata: { name },
        accounts
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

  const lockValue = HexBlob.fromBytes(await Wallet.KeyManagement.emip3encrypt(LOCK_VALUE, passphrase));
  const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
    metadata: { name, lockValue },
    encryptedSecrets: {
      keyMaterial: await encryptMnemonic(mnemonic, passphrase),
      rootPrivateKeyBytes: HexBlob.fromBytes(
        Buffer.from(
          (keyAgent.serializableData as Wallet.KeyManagement.SerializableInMemoryKeyAgentData)
            .encryptedRootPrivateKeyBytes
        )
      )
    },
    accounts: [
      {
        accountIndex,
        metadata: { name: defaultAccountName(accountIndex) },
        extendedAccountPublicKey: keyAgent.extendedAccountPublicKey
      }
    ],
    type: WalletType.InMemory
  };

  const walletId = await walletRepository.addWallet(addWalletProps);

  // Needed for reset password flow
  saveValueInLocalStorage({ key: 'wallet', value: { name } });

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
        walletId
      },
      account: addWalletProps.accounts[0]
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
    connectedDevice === WalletType.Ledger
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
    accounts: [
      {
        extendedAccountPublicKey: keyAgent.extendedAccountPublicKey,
        accountIndex,
        metadata: { name: defaultAccountName(accountIndex) }
      }
    ]
  };
  const walletId = await walletRepository.addWallet(addWalletProps);

  return {
    name,
    signingCoordinator,
    wallet: observableWallet,
    source: {
      wallet: {
        ...addWalletProps,
        walletId
      },
      account: addWalletProps.accounts[0]
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

  const tryMigrateToWalletRepository = useCallback(async (): Promise<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] | undefined
  > => {
    const walletName = getWalletFromStorage()?.name;
    const keyAgentData = getValueFromLocalStorage('keyAgentData');
    const lock = getValueFromLocalStorage('lock');

    // Wallet is locked: we don't have access to decrypted keyAgentData until it's unlocked
    if (!keyAgentData) {
      if (lock) {
        setWalletLock(lock);
      }
      setCardanoWallet(null);
      return;
    }

    // Wallet info for current network
    if (!walletName) {
      setCardanoWallet(null);
      return;
    }

    const lockValue =
      lock && keyAgentData.__typename === Wallet.KeyManagement.KeyAgentType.InMemory
        ? HexBlob.fromBytes(lock)
        : undefined;
    resetWalletLock();
    deleteFromLocalStorage('keyAgentData');
    // this is needed for reset password flow
    // deleteFromLocalStorage('wallet');

    const walletId = await walletRepository.addWallet(
      await keyAgentDataToAddWalletProps(keyAgentData, backgroundService, walletName, lockValue)
    );

    await walletManager.activate({
      chainId: keyAgentData.chainId,
      walletId,
      accountIndex: keyAgentData.accountIndex,
      provider
    });

    return firstValueFrom(walletRepository.wallets$);
  }, [resetWalletLock, backgroundService, setCardanoWallet, setWalletLock]);

  /**
   * Loads wallet from storage.
   * @returns resolves with wallet information or null when no wallet is found
   */
  const loadWallet = useCallback(async (): Promise<Wallet.CardanoWallet | undefined> => {
    let wallets = await firstValueFrom(walletRepository.wallets$);

    // LW-9499 to convert this to proper migration
    if (wallets.length === 0) {
      wallets = await tryMigrateToWalletRepository();
      if (!wallets) {
        // Either no wallet data found in local storage, or wallet is locked
        return;
      }
    }

    let activeWalletId = await firstValueFrom(walletManager.activeWalletId$);

    const activateFirstWallet = async () => {
      if (wallets.length > 0) {
        const chainId = chainIdFromName(process.env.DEFAULT_CHAIN as Wallet.ChainName);
        activeWalletId = {
          provider,
          chainId,
          walletId: wallets[0].walletId,
          accountIndex: wallets[0].type !== WalletType.Script ? wallets[0].accounts[0].accountIndex : undefined
        };

        await walletManager.activate(activeWalletId);
        return true;
      }
      return false;
    };

    if (!activeWalletId) {
      await activateFirstWallet();
    }

    setCurrentChain(getChainName(activeWalletId.chainId));

    const activeWallet = wallets.find((wallet) => wallet.walletId === activeWalletId.walletId);
    if (!activeWallet && !(await activateFirstWallet())) {
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
    return result;
  }, [setCardanoWallet, setCurrentChain, tryMigrateToWalletRepository]);

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
      await walletRepository.removeWallet(activeWallet.walletId);
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
        const decrypted = await Wallet.KeyManagement.emip3decrypt(walletLock, Buffer.from(password));
        // If JSON.parse succeeds, it means it was successfully decrypted
        const parsed = JSON.parse(decrypted.toString());

        if ((await firstValueFrom(walletRepository.wallets$)).length === 0) {
          // set value in local storage for data migration to wallet repository
          const keyAgentData = parsed.Mainnet?.keyAgentData;
          if (keyAgentData) {
            saveValueInLocalStorage({ key: 'keyAgentData', value: keyAgentData ?? null });
            await loadWallet();
          }
        }
        return true;
      } catch {
        return false;
      }
    },
    [walletLock, loadWallet]
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
