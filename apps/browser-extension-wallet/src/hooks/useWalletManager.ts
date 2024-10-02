/* eslint-disable consistent-return */
/* eslint-disable unicorn/no-null */
import { useCallback, useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { EnvironmentTypes, useWalletStore } from '@stores';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { AddressBookSchema, addressBookSchema, NftFoldersSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import { logger, observableWallet, signingCoordinator, walletManager, walletRepository } from '@src/lib/wallet-api-ui';
import {
  bufferReviver,
  clearLocalStorage,
  deleteFromLocalStorage,
  getValueFromLocalStorage,
  saveValueInLocalStorage
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
  WalletId,
  WalletManagerActivateProps,
  WalletManagerApi,
  WalletRepositoryApi,
  WalletType
} from '@cardano-sdk/web-extension';
import { deepEquals, HexBlob } from '@cardano-sdk/util';
import { BackgroundService } from '@lib/scripts/types';
import { getChainName } from '@src/utils/get-chain-name';
import { useCustomSubmitApi } from '@hooks/useCustomSubmitApi';
import { setBackgroundStorage } from '@lib/scripts/background/storage';
import * as KeyManagement from '@cardano-sdk/key-management';
import { Buffer } from 'buffer';
import {
  buildSharedWalletScript,
  CoSigner,
  paymentScriptKeyPath,
  QuorumOptionValue,
  QuorumRadioOption,
  ScriptKind,
  stakingScriptKeyPath,
  GenerateSharedWalletKeyFn,
  makeGenerateSharedWalletKey,
  useSecrets
} from '@lace/core';

const { AVAILABLE_CHAINS, CHAIN } = config();
const DEFAULT_CHAIN_ID = Wallet.Cardano.ChainIds[CHAIN];
export const LOCK_VALUE = Buffer.from(JSON.stringify({ lock: 'lock' }), 'utf8');

export interface CreateWalletParams {
  name: string;
  mnemonic: string[];
  chainId?: Wallet.Cardano.ChainId;
}

interface CreateSharedWalletParams {
  name: string;
  accountIndex?: number;
  chainId?: Wallet.Cardano.ChainId;
  coSigners: CoSigner[];
  ownSignerWalletId: WalletId;
  quorumRules: QuorumOptionValue;
  sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex;
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
  passphrase?: Uint8Array;
};

type ActivateWalletProps = Omit<WalletManagerActivateProps, 'chainId'>;

type CreateHardwareWalletRevampedParams = {
  accountIndex: number;
  name: string;
  connection: Wallet.HardwareWalletConnection;
};

type CreateHardwareWalletRevamped = (params: CreateHardwareWalletRevampedParams) => Promise<Wallet.CardanoWallet>;

export interface UseWalletManager {
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  lockWallet: () => void;
  unlockWallet: () => Promise<boolean>;
  loadWallet: (
    wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[],
    activeWalletProps: WalletManagerActivateProps | null
  ) => Promise<Wallet.CardanoWallet | null>;
  createWallet: (args: CreateWalletParams) => Promise<Wallet.CardanoWallet>;
  createInMemorySharedWallet: (args: CreateSharedWalletParams) => Promise<Wallet.CardanoWallet>;
  activateWallet: (args: Omit<WalletManagerActivateProps, 'chainId'>) => Promise<void>;
  createHardwareWallet: (args: CreateHardwareWallet) => Promise<Wallet.CardanoWallet>;
  createHardwareWalletRevamped: CreateHardwareWalletRevamped;
  connectHardwareWallet: (model: Wallet.HardwareWallets) => Promise<Wallet.DeviceConnection>;
  connectHardwareWalletRevamped: typeof connectHardwareWalletRevamped;
  saveHardwareWallet: (wallet: Wallet.CardanoWallet, chainName?: Wallet.ChainName) => Promise<void>;
  /**
   * @returns active wallet id after deleting the wallet; undefined if deleted the last wallet
   */
  deleteWallet: (isForgotPasswordFlow?: boolean) => Promise<WalletManagerActivateProps | undefined>;
  switchNetwork: (chainName: Wallet.ChainName) => Promise<void>;

  /**
   * Force the wallet to recreate all providers and reload. This is useful for changing
   * provider properties or configurations without switching the wallet.
   */
  reloadWallet: () => Promise<void>;
  addAccount: (props: WalletManagerAddAccountProps) => Promise<void>;
  getMnemonic: (passphrase: Uint8Array) => Promise<string[]>;
  enableCustomNode: (network: EnvironmentTypes, value: string) => Promise<void>;
  generateSharedWalletKey: GenerateSharedWalletKeyFn;
  saveSharedWalletKey: (sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex) => Promise<void>;
}

const clearBytes = (bytes: Uint8Array) => {
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = 0;
  }
};

const getExtendedAccountPublicKey = async (
  wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  accountIndex: number,
  passphrase?: Uint8Array
) => {
  // eslint-disable-next-line sonarjs/no-small-switch
  switch (wallet.type) {
    case WalletType.InMemory: {
      // eslint-disable-next-line no-alert
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
      return Wallet.getHwExtendedAccountPublicKey(wallet.type, accountIndex);
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

const connectHardwareWalletRevamped = async (usbDevice: USBDevice): Promise<Wallet.HardwareWalletConnection> =>
  Wallet.connectDeviceRevamped(usbDevice);

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
  const { getCustomSubmitApiForNetwork, updateCustomSubmitApi } = useCustomSubmitApi();
  const { password, clearSecrets } = useSecrets();

  const getCurrentChainId = useCallback(() => {
    if (currentChain) return currentChain;
    // reading stored chain name to preserve network for forgot password flow, or when migrating a locked wallet
    const storedChain = getValueFromLocalStorage('appSettings');
    return (storedChain?.chainName && chainIdFromName(storedChain.chainName)) || DEFAULT_CHAIN_ID;
  }, [currentChain]);

  const createHardwareWalletRevamped = useCallback<CreateHardwareWalletRevamped>(
    async ({ accountIndex, connection, name }) => {
      let extendedAccountPublicKey;
      try {
        extendedAccountPublicKey = await Wallet.getHwExtendedAccountPublicKey(
          connection.type,
          accountIndex,
          connection.type === WalletType.Ledger ? connection.value : undefined
        );
      } catch (error: unknown) {
        throw error;
      }
      const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata: { name, lastActiveAccountIndex: accountIndex },
        type: connection.type,
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
    }: CreateHardwareWallet): Promise<Wallet.CardanoWallet> =>
      createHardwareWalletRevamped({
        accountIndex,
        connection: {
          type: connectedDevice,
          value: typeof deviceConnection !== 'boolean' ? deviceConnection : undefined
        },
        name
      }),
    [createHardwareWalletRevamped]
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
    async ({ mnemonic, name, chainId = getCurrentChainId() }: CreateWalletParams): Promise<Wallet.CardanoWallet> => {
      const accountIndex = 0;
      const passphrase = Buffer.from(password.value, 'utf8');
      const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          chainId,
          getPassphrase: async () => passphrase,
          mnemonicWords: mnemonic,
          accountIndex,
          purpose: KeyManagement.KeyPurpose.STANDARD
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
      passphrase.fill(0);
      clearSecrets();

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
    [getCurrentChainId, password, clearSecrets]
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
    // eslint-disable-next-line max-statements
    async (isForgotPasswordFlow = false): Promise<WalletManagerActivateProps | undefined> => {
      let walletToDelete: Pick<WalletManagerActivateProps, 'walletId'> = await firstValueFrom(
        walletManager.activeWalletId$
      );
      if (walletToDelete) {
        await walletManager.deactivate();
      } else {
        const wallets = await firstValueFrom(walletRepository.wallets$);
        if (wallets.length > 0) {
          walletToDelete = wallets[0];
        } else {
          if (isForgotPasswordFlow) {
            // Forgot Password flow deletes the wallet.
            // If wallet was never created in the repository due to migrating a locked wallet,
            // then we have to delete the 'lock' instead of wallet in the repository
            resetWalletLock();
          }
          logger.warn('No wallet to delete');
          return;
        }
      }
      await walletRepository.removeWallet(walletToDelete.walletId);

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
      deleteFromLocalStorage('lastStaking');
      deleteFromLocalStorage('userInfo');
      deleteFromLocalStorage('keyAgentData');
      await backgroundService.clearBackgroundStorage({
        except: ['fiatPrices', 'userId', 'usePersistentUserId', 'featureFlags', 'customSubmitTxUrl', 'namiMigration']
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
        'isMultiDelegationDAppCompatibilityModalVisible',
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
        await walletManager.destroyData(walletToDelete.walletId, chainIdFromName(chainName));
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

  const reloadWallet = useCallback(async (): Promise<void> => {
    const activeWallet = await firstValueFrom(walletManager.activeWalletId$);

    await walletManager.activate(activeWallet, true);
  }, []);

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
      const customSubmitApi = getCustomSubmitApiForNetwork(chainName);
      await setBackgroundStorage({ customSubmitTxUrl: customSubmitApi.url });
      await reloadWallet();

      setCurrentChain(chainName);
      setCardanoCoin(chainId);
    },
    [
      setAddressesDiscoveryCompleted,
      updateAppSettings,
      settings,
      getCustomSubmitApiForNetwork,
      reloadWallet,
      setCurrentChain,
      setCardanoCoin
    ]
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
  const unlockWallet = useCallback(async (): Promise<boolean> => {
    if (!walletLock) return true;
    const passphrase = Buffer.from(password.value);
    try {
      const decrypted = await Wallet.KeyManagement.emip3decrypt(walletLock, passphrase);
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
    } finally {
      passphrase.fill(0);
      clearSecrets();
    }
  }, [walletLock, loadWallet, password, clearSecrets]);

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

  const generateSharedWalletKey = useMemo(
    () =>
      makeGenerateSharedWalletKey({
        chainId: getCurrentChainId(),
        getMnemonic
      }),
    [getCurrentChainId, getMnemonic]
  );

  const saveSharedWalletKey = useCallback<UseWalletManager['saveSharedWalletKey']>(
    async (sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex): Promise<void> => {
      if (!cardanoWallet) {
        throw new Error('Active wallet data not available');
      }
      const { walletId } = cardanoWallet.source.wallet;
      const [wallets] = await firstValueFrom(combineLatest([walletRepository.wallets$, walletManager.activeWalletId$]));
      const activeWallet = wallets.find(({ walletId: id }) => id === walletId);
      if (!activeWallet) {
        throw new Error('Failed to identify an active wallet data');
      }

      await walletRepository.updateWalletMetadata({
        walletId,
        metadata: {
          ...activeWallet.metadata,
          multiSigExtendedPublicKey: sharedWalletKey
        }
      });
    },
    [cardanoWallet]
  );

  const createInMemorySharedWallet = useCallback(
    async ({
      accountIndex = 0,
      name,
      chainId = getCurrentChainId(),
      ownSignerWalletId,
      quorumRules,
      coSigners,
      sharedWalletKey
    }: CreateSharedWalletParams): Promise<Wallet.CardanoWallet> => {
      const publicKeys = coSigners.map((c: CoSigner) => Wallet.Crypto.Bip32PublicKeyHex(c.sharedWalletKey));

      let scriptKind: ScriptKind;
      if (quorumRules.option === QuorumRadioOption.AllAddresses) {
        scriptKind = { kind: Wallet.Cardano.NativeScriptKind.RequireAllOf };
      } else if (quorumRules.option === QuorumRadioOption.NOfK) {
        scriptKind = { kind: Wallet.Cardano.NativeScriptKind.RequireNOf, required: quorumRules.numberOfCosigner };
      } else {
        scriptKind = { kind: Wallet.Cardano.NativeScriptKind.RequireAnyOf };
      }

      const paymentScript = await buildSharedWalletScript({
        expectedSigners: publicKeys,
        derivationPath: paymentScriptKeyPath,
        kindInfo: scriptKind
      });

      const stakingScript = await buildSharedWalletScript({
        expectedSigners: publicKeys,
        derivationPath: stakingScriptKeyPath,
        kindInfo: scriptKind
      });

      const createScriptWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata: {
          name,
          coSigners: coSigners.map((signer) => ({
            name: signer.name,
            sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex(signer.sharedWalletKey)
          })),
          // TODO: LW-11069 multiSigExtendedPublicKey can be removed from wallet metadata and this key fetched from accounts since addAccount is called
          multiSigExtendedPublicKey: sharedWalletKey
        },
        ownSigners: [
          {
            accountIndex,
            paymentScriptKeyPath,
            purpose: KeyManagement.KeyPurpose.MULTI_SIG,
            stakingScriptKeyPath,
            walletId: ownSignerWalletId
          }
        ],
        paymentScript,
        stakingScript,
        type: WalletType.Script
      };

      const scriptWalletId = await walletRepository.addWallet(createScriptWalletProps);

      await walletRepository.addAccount({
        accountIndex,
        extendedAccountPublicKey: sharedWalletKey,
        metadata: { name: defaultAccountName(accountIndex) },
        purpose: KeyManagement.KeyPurpose.MULTI_SIG,
        walletId: ownSignerWalletId
      });

      await walletManager.activate({
        walletId: scriptWalletId,
        chainId,
        accountIndex
      });

      return {
        name,
        signingCoordinator,
        wallet: observableWallet,
        source: {
          wallet: {
            ...createScriptWalletProps,
            walletId: scriptWalletId
          }
        }
      };
    },
    [getCurrentChainId]
  );

  const addAccount = useCallback(
    async ({ wallet, accountIndex, metadata, passphrase }: WalletManagerAddAccountProps): Promise<void> => {
      const extendedAccountPublicKey = await getExtendedAccountPublicKey(wallet, accountIndex, passphrase);
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

  const enableCustomNode = useCallback(
    async (network: EnvironmentTypes, value: string) => {
      const customApiData = {
        status: !!value,
        url: value
      };
      updateCustomSubmitApi(network, customApiData);
      await backgroundService.setBackgroundStorage({ customSubmitTxUrl: value });
      await reloadWallet();
    },
    [backgroundService, reloadWallet, updateCustomSubmitApi]
  );

  return {
    activateWallet,
    addAccount,
    lockWallet,
    unlockWallet,
    loadWallet,
    createWallet,
    createInMemorySharedWallet,
    createHardwareWallet,
    createHardwareWalletRevamped,
    connectHardwareWallet,
    connectHardwareWalletRevamped,
    saveHardwareWallet,
    deleteWallet,
    reloadWallet,
    switchNetwork,
    walletManager,
    walletRepository,
    getMnemonic,
    enableCustomNode,
    generateSharedWalletKey,
    saveSharedWalletKey
  };
};
