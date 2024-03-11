/* eslint-disable consistent-return */
/* eslint-disable unicorn/no-null */
import { useCallback } from 'react';
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
  saveValueInLocalStorage,
  bufferReviver
} from '@src/utils/local-storage';
import { config } from '@src/config';
import { getWalletFromStorage } from '@src/utils/get-wallet-from-storage';
import { getUserIdService } from '@providers/AnalyticsProvider/getUserIdService';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';
import { ILocalStorage } from '@src/types';
import { combineLatest, firstValueFrom } from 'rxjs';
import {
  AddWalletProps,
  AnyBip32Wallet,
  AnyWallet,
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType
} from '@cardano-sdk/web-extension';
import { deepEquals, HexBlob } from '@cardano-sdk/util';
import { BackgroundService } from '@lib/scripts/types';
import { getChainName } from '@src/utils/get-chain-name';

const { AVAILABLE_CHAINS, CHAIN } = config();
const DEFAULT_CHAIN_ID = Wallet.Cardano.ChainIds[CHAIN];
export const LOCK_VALUE = Buffer.from(JSON.stringify({ lock: 'lock' }), 'utf8');

export interface CreateWallet {
  name: string;
  mnemonic: string[];
  password: string;
  chainId?: Wallet.Cardano.ChainId;
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
  connectedDevice: Wallet.HardwareWallets;
}

type WalletManagerAddAccountProps = {
  wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  metadata: Wallet.AccountMetadata;
  accountIndex: number;
};

type ActivateWalletProps = Omit<WalletManagerActivateProps, 'chainId'>;

export interface UseWalletManager {
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  lockWallet: () => void;
  unlockWallet: (password: string) => Promise<boolean>;
  loadWallet: (
    wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[],
    activeWalletProps: WalletManagerActivateProps | null
  ) => Promise<Wallet.CardanoWallet | null>;
  createWallet: (args: CreateWallet) => Promise<Wallet.CardanoWallet>;
  activateWallet: (args: Omit<WalletManagerActivateProps, 'chainId'>) => Promise<void>;
  createHardwareWallet: (args: CreateHardwareWallet) => Promise<Wallet.CardanoWallet>;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  saveHardwareWallet: (wallet: Wallet.CardanoWallet, chainName?: Wallet.ChainName) => Promise<void>;
  /**
   * @returns active wallet id after deleting the wallet; undefined if deleted the last wallet
   */
  deleteWallet: (isForgotPasswordFlow?: boolean) => Promise<WalletManagerActivateProps | undefined>;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;
  addAccount: (props: WalletManagerAddAccountProps) => Promise<void>;
  getMnemonic: (passphrase: Uint8Array) => Promise<string[]>;
}

const clearBytes = (bytes: Uint8Array) => {
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = 0;
  }
};

const getHwExtendedAccountPublicKey = async (
  walletType: Wallet.HardwareWallets,
  accountIndex: number,
  deviceConnection?: Wallet.DeviceConnection
) => {
  switch (walletType) {
    case WalletType.Ledger:
      return Wallet.Ledger.LedgerKeyAgent.getXpub({
        communicationType: Wallet.KeyManagement.CommunicationType.Web,
        deviceConnection: typeof deviceConnection !== 'boolean' ? deviceConnection : undefined,
        accountIndex
      });
    case WalletType.Trezor:
      await Wallet.Trezor.TrezorKeyAgent.initializeTrezorTransport({
        manifest: Wallet.manifest,
        communicationType: Wallet.KeyManagement.CommunicationType.Web
      });
      return Wallet.Trezor.TrezorKeyAgent.getXpub({
        communicationType: Wallet.KeyManagement.CommunicationType.Web,
        accountIndex
      });
  }
};

const getExtendedAccountPublicKey = async (
  wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  accountIndex: number
) => {
  // eslint-disable-next-line sonarjs/no-small-switch
  switch (wallet.type) {
    case WalletType.InMemory: {
      // eslint-disable-next-line no-alert
      const passphrase = Buffer.from(prompt('Please enter your passphrase'));
      const rootPrivateKeyBytes = await Wallet.KeyManagement.emip3decrypt(
        Buffer.from(wallet.encryptedSecrets.rootPrivateKeyBytes, 'hex'),
        passphrase
      );
      const rootPrivateKeyBuffer = Buffer.from(rootPrivateKeyBytes);
      const accountPrivateKey = await Wallet.KeyManagement.util.deriveAccountPrivateKey({
        bip32Ed25519: Wallet.bip32Ed25519,
        accountIndex,
        rootPrivateKey: Wallet.Crypto.Bip32PrivateKeyHex(rootPrivateKeyBuffer.toString('hex'))
      });
      const accountPublicKey = await Wallet.bip32Ed25519.getBip32PublicKey(accountPrivateKey);
      clearBytes(passphrase);
      clearBytes(rootPrivateKeyBytes);
      clearBytes(rootPrivateKeyBuffer);
      return accountPublicKey;
    }
    case WalletType.Ledger:
    case WalletType.Trezor:
      return getHwExtendedAccountPublicKey(wallet.type, accountIndex);
  }
};

const chainIdFromName = (chainName: Wallet.ChainName) => {
  const chainId = Wallet.Cardano.ChainIds[chainName];
  if (!chainId || !AVAILABLE_CHAINS.includes(chainName)) throw new Error('Chain not supported');
  return chainId;
};

const defaultAccountName = (accountIndex: number) => `Account #${accountIndex}`;

const keyAgentDataToAddWalletProps = async (
  data: Wallet.KeyManagement.SerializableKeyAgentData,
  backgroundService: BackgroundService,
  metadata: Wallet.WalletMetadata
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
        metadata,
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
        metadata,
        accounts
      };
    case Wallet.KeyManagement.KeyAgentType.Trezor:
      return {
        type: WalletType.Trezor,
        metadata,
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
    currentChain,
    setCurrentChain,
    setCardanoCoin,
    setAddressesDiscoveryCompleted,
    manageAccountsWallet,
    setManageAccountsWallet
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

  const getCurrentChainId = useCallback(() => {
    if (currentChain) return currentChain;
    // reading stored chain name to preserve network for forgot password flow, or when migrating a locked wallet
    const storedChain = getValueFromLocalStorage('appSettings');
    return (storedChain?.chainName && chainIdFromName(storedChain.chainName)) || DEFAULT_CHAIN_ID;
  }, [currentChain]);

  /**
   * Creates a Ledger or Trezor hardware wallet
   * and saves it in browser storage with the data to lock/unlock it
   */
  const createHardwareWallet = useCallback(
    async ({
      accountIndex = 0,
      deviceConnection,
      name,
      connectedDevice
    }: CreateHardwareWallet): Promise<Wallet.CardanoWallet> => {
      const extendedAccountPublicKey = await getHwExtendedAccountPublicKey(
        connectedDevice,
        accountIndex,
        deviceConnection
      );
      const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata: { name, lastActiveAccountIndex: accountIndex },
        type: connectedDevice,
        accounts: [
          {
            extendedAccountPublicKey,
            accountIndex,
            metadata: { name: defaultAccountName(accountIndex) }
          }
        ]
      };
      const walletId = await walletRepository.addWallet(addWalletProps);
      await walletManager.activate({
        walletId,
        chainId: getCurrentChainId(),
        accountIndex
      });

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
    },
    [getCurrentChainId]
  );

  const tryMigrateToWalletRepository = useCallback(async (): Promise<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] | undefined
  > => {
    const walletName = getWalletFromStorage()?.name;
    const keyAgentData = getValueFromLocalStorage('keyAgentData');
    const lock = getValueFromLocalStorage('lock', undefined, bufferReviver);

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
      await keyAgentDataToAddWalletProps(keyAgentData, backgroundService, {
        name: walletName,
        lockValue,
        lastActiveAccountIndex: keyAgentData.accountIndex
      })
    );

    await walletManager.activate({
      // when wallet is locked before migration, keyAgentData.chainId is the default one instead of last active one
      chainId: getCurrentChainId(),
      walletId,
      accountIndex: keyAgentData.accountIndex
    });

    return firstValueFrom(walletRepository.wallets$);
  }, [resetWalletLock, backgroundService, setCardanoWallet, setWalletLock, getCurrentChainId]);

  /**
   * Loads wallet from storage.
   * @returns resolves with wallet information or null when no wallet is found
   */
  const loadWallet = useCallback(
    // eslint-disable-next-line complexity
    async (
      wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[],
      activeWalletProps: WalletManagerActivateProps | null
    ): Promise<Wallet.CardanoWallet | undefined> => {
      // If there are no wallets, attempt to migrate local storage data to wallet repository
      if (wallets.length === 0) {
        if (!(await tryMigrateToWalletRepository())) {
          setCardanoWallet(null);
        }
        return;
      }

      // If there is no active wallet, activate the 1st one
      if (!activeWalletProps) {
        // deleting a wallet calls deactivateWallet(): do nothing, wallet will also be deleted from repository
        return;
      }

      // Synchronize active chain UI state with service worker
      if (activeWalletProps.chainId.networkMagic !== currentChain?.networkMagic) {
        setCurrentChain(getChainName(activeWalletProps.chainId));
        setCardanoCoin(activeWalletProps.chainId);
      }

      // Synchronize active wallet UI state with service worker
      const activeWallet = wallets.find((w) => w.walletId === activeWalletProps.walletId);
      if (!activeWallet) {
        console.error('Active wallet not found', activeWallet, wallets);
        return;
      }
      const activeAccount =
        activeWallet.type !== WalletType.Script
          ? activeWallet.accounts.find((a) => a.accountIndex === activeWalletProps.accountIndex)
          : undefined;
      const newCardanoWallet = {
        name: activeWallet.metadata.name,
        signingCoordinator,
        source: {
          wallet: activeWallet,
          account: activeAccount
        },
        wallet: observableWallet
      };
      if (
        !cardanoWallet ||
        cardanoWallet.name !== activeWallet.metadata.name ||
        !deepEquals(cardanoWallet.source.wallet, activeWallet) ||
        !deepEquals(cardanoWallet.source.account, activeAccount)
      ) {
        setCardanoWallet(newCardanoWallet);
      }

      // Synchronize the currently managed wallet UI state with service worker
      if (manageAccountsWallet) {
        const managedWallet = wallets.find(
          (w): w is AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata> =>
            w.walletId === manageAccountsWallet.walletId && w.type !== WalletType.Script
        );
        if (!deepEquals(managedWallet, manageAccountsWallet)) {
          setManageAccountsWallet(managedWallet);
        }
      }

      return newCardanoWallet;
    },
    [
      setCardanoWallet,
      setCurrentChain,
      tryMigrateToWalletRepository,
      cardanoWallet,
      currentChain,
      manageAccountsWallet,
      setCardanoCoin,
      setManageAccountsWallet
    ]
  );

  /**
   * Saves hardware wallet in storage and updates wallet store
   */
  const saveHardwareWallet = useCallback(
    async (wallet: Wallet.CardanoWallet, chainName = CHAIN): Promise<void> => {
      updateAppSettings({ chainName });

      setCardanoWallet(wallet);
      setCurrentChain(chainName);
    },
    [updateAppSettings, setCardanoWallet, setCurrentChain]
  );

  /**
   * Creates or restores a new in-memory wallet with the cardano-js-sdk and saves it in wallet repository
   */
  const createWallet = useCallback(
    async ({
      mnemonic,
      name,
      password,
      chainId = getCurrentChainId()
    }: CreateWallet): Promise<Wallet.CardanoWallet> => {
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
        metadata: { name, lockValue, lastActiveAccountIndex: accountIndex },
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
      await walletManager.activate({
        walletId,
        chainId,
        accountIndex
      });

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
    },
    [getCurrentChainId]
  );

  const activateWallet = useCallback(
    async (props: ActivateWalletProps): Promise<void> => {
      const [wallets, activeWallet] = await firstValueFrom(
        combineLatest([walletRepository.wallets$, walletManager.activeWalletId$])
      );
      if (activeWallet?.walletId === props.walletId && activeWallet?.accountIndex === props.accountIndex) {
        logger.debug('Wallet is already active');
        return;
      }
      await walletManager.deactivate();
      await walletRepository.updateWalletMetadata({
        walletId: props.walletId,
        metadata: {
          ...wallets.find(({ walletId }) => walletId === props.walletId).metadata,
          lastActiveAccountIndex: props.accountIndex
        }
      });
      await walletManager.activate({
        ...props,
        chainId: getCurrentChainId()
      });
    },
    [getCurrentChainId]
  );

  /**
   * Deletes Wallet from memory, all info from browser storage and destroys all stores
   *
   * @returns active wallet id after deleting the wallet
   */
  const deleteWallet = useCallback(
    async (isForgotPasswordFlow = false): Promise<WalletManagerActivateProps | undefined> => {
      const activeWallet = await firstValueFrom(walletManager.activeWalletId$);
      await walletManager.deactivate();
      await walletRepository.removeWallet(activeWallet.walletId);

      const wallets = await firstValueFrom(walletRepository.wallets$);
      if (wallets.length > 0) {
        const activateProps = {
          walletId: wallets[0].walletId,
          chainId: getCurrentChainId(),
          accountIndex: wallets[0].type === WalletType.Script ? undefined : wallets[0].accounts[0].accountIndex
        };
        await walletManager.activate(activateProps);
        return activateProps;
      }

      // deleting last wallet clears all data
      if (!isForgotPasswordFlow) {
        deleteFromLocalStorage('appSettings');
      }
      deleteFromLocalStorage('showDappBetaModal');
      deleteFromLocalStorage('lastStaking');
      deleteFromLocalStorage('userInfo');
      deleteFromLocalStorage('keyAgentData');
      await backgroundService.clearBackgroundStorage({
        except: ['fiatPrices', 'userId', 'usePersistentUserId', 'experimentsConfiguration']
      });
      resetWalletLock();
      setCardanoWallet();

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
        const additionalKeysToKeep: (keyof ILocalStorage)[] = [
          'wallet',
          'appSettings',
          ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY
        ];
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
      userIdService,
      clearAddressBook,
      clearNftsFolders,
      getCurrentChainId
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
            const wallets = await firstValueFrom(walletRepository.wallets$);
            const activeWalletProps = await firstValueFrom(walletManager.activeWalletId$);
            await loadWallet(wallets, activeWalletProps);
          }
        }
        return true;
      } catch {
        return false;
      }
    },
    [walletLock, loadWallet]
  );

  const getMnemonic = useCallback(
    async (passphrase: Uint8Array) => {
      const { wallet } = cardanoWallet.source;
      switch (wallet.type) {
        case WalletType.InMemory: {
          const keyMaterialBytes = await Wallet.KeyManagement.emip3decrypt(
            Buffer.from(wallet.encryptedSecrets.keyMaterial, 'hex'),
            passphrase
          );

          const keyMaterialBuffer = Buffer.from(keyMaterialBytes);

          const mnemonic = keyMaterialBuffer.toString('utf8').split(' ');
          clearBytes(passphrase);
          clearBytes(keyMaterialBytes);
          clearBytes(keyMaterialBuffer);
          return mnemonic;
        }
        case WalletType.Ledger:
        case WalletType.Trezor:
          throw new Error('Mnemonic is not available for hardware wallets');
      }
    },
    [cardanoWallet]
  );

  const addAccount = useCallback(
    async ({ wallet, accountIndex, metadata }: WalletManagerAddAccountProps): Promise<void> => {
      const extendedAccountPublicKey = await getExtendedAccountPublicKey(wallet, accountIndex);
      await walletRepository.addAccount({
        accountIndex,
        extendedAccountPublicKey,
        metadata,
        walletId: wallet.walletId
      });
      await walletManager.activate({ chainId: getCurrentChainId(), walletId: wallet.walletId, accountIndex });
    },
    [getCurrentChainId]
  );

  return {
    activateWallet,
    addAccount,
    lockWallet,
    unlockWallet,
    loadWallet,
    createWallet,
    createHardwareWallet,
    connectHardwareWallet,
    saveHardwareWallet,
    deleteWallet,
    switchNetwork,
    walletManager,
    walletRepository,
    getMnemonic
  };
};
