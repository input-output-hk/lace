/* eslint-disable consistent-return */
/* eslint-disable unicorn/no-null */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { EnvironmentTypes, useWalletStore } from '@stores';
import { useAppSettingsContext } from '@providers/AppSettings';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { AddressBookSchema, addressBookSchema, NftFoldersSchema, nftFoldersSchema, useDbState } from '@src/lib/storage';
import {
  bitcoinWallet,
  bitcoinWalletManager,
  observableWallet,
  signingCoordinator,
  walletManager,
  walletRepository
} from '@src/lib/wallet-api-ui';
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
  Bip32WalletAccount,
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
  GenerateSharedWalletKeyFn,
  makeGenerateSharedWalletKey,
  paymentScriptKeyPath,
  QuorumOptionValue,
  QuorumRadioOption,
  ScriptKind,
  stakingScriptKeyPath,
  useSecrets
} from '@lace/core';
import { logger } from '@lace/common';
import { Bitcoin as BtcWallet } from '@lace/bitcoin';
import { BitcoinWalletManagerApi } from '@lib/scripts/background/bitcoinWalletManager';
import * as bip39 from 'bip39';

const { AVAILABLE_CHAINS, CHAIN } = config();
const DEFAULT_CHAIN_ID = Wallet.Cardano.ChainIds[CHAIN];
export const LOCK_VALUE = Buffer.from(JSON.stringify({ lock: 'lock' }), 'utf8');

export interface BitcoinWallet {
  name: string;
  wallet: BtcWallet.BitcoinWallet;
  source: {
    wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
    account?: Bip32WalletAccount<Wallet.AccountMetadata>;
  };
}

export interface CreateWalletParams {
  name: string;
  mnemonic: string[];
  chainId?: Wallet.Cardano.ChainId;
}

export interface CreateWalletFromPrivateKeyParams {
  name: string;
  rootPrivateKeyBytes: HexBlob;
  extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex;
}

export type ExtendedAccountPublicKeyParams = {
  wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  accountIndex: number;
  passphrase?: Uint8Array;
  purpose?: KeyManagement.KeyPurpose;
};

export type CreateWalletParamsBase = {
  name: string;
  chainId?: Wallet.Cardano.ChainId;
  passphrase?: Buffer;
  metadata: Wallet.WalletMetadata;
  encryptedSecrets: { keyMaterial: HexBlob; rootPrivateKeyBytes: HexBlob };
  extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex;
};

export type CreateBitcoinWalletParams = {
  name: string;
  passphrase?: Buffer;
  metadata: Wallet.WalletMetadata;
  encryptedSecrets: { keyMaterial: HexBlob; rootPrivateKeyBytes: HexBlob };
  accountIndex: number;
  extendedAccountPublicKeys: {
    mainnet: {
      legacy: string;
      segWit: string;
      nativeSegWit: string;
      taproot: string;
      electrumNativeSegWit: string;
    };
    testnet: {
      legacy: string;
      segWit: string;
      nativeSegWit: string;
      taproot: string;
      electrumNativeSegWit: string;
    };
  };
};

interface CreateSharedWalletParams {
  name: string;
  accountIndex?: number;
  chainId?: Wallet.Cardano.ChainId;
  coSigners: CoSigner[];
  ownSignerWalletId: WalletId;
  quorumRules: QuorumOptionValue;
}

interface CreateMultiSigAccountParams {
  accountIndex?: number;
  ownSignerWalletId: WalletId;
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
  accountIndexes: number[];
  name: string;
  connection: Wallet.HardwareWalletConnection;
};

type CreateHardwareWalletRevamped = (params: CreateHardwareWalletRevampedParams) => Promise<Wallet.CardanoWallet>;

export interface UseWalletManager {
  bitcoinWallet: BtcWallet.BitcoinWallet;
  bitcoinWalletManager: BitcoinWalletManagerApi;
  walletManager: WalletManagerApi;
  walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  lockWallet: () => void;
  unlockWallet: () => Promise<boolean>;
  loadWallet: (
    wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[],
    activeWalletProps: WalletManagerActivateProps | null
  ) => Promise<Wallet.CardanoWallet | null>;
  createBitcoinWallet: (args: CreateWalletParams) => Promise<BitcoinWallet>;
  createWallet: (args: CreateWalletParams) => Promise<Wallet.CardanoWallet>;
  createWalletFromPrivateKey: (args: CreateWalletFromPrivateKeyParams) => Promise<Wallet.CardanoWallet>;
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
  getSharedWalletExtendedPublicKey: (passphrase: Uint8Array) => Promise<Wallet.Cardano.Cip1854ExtendedAccountPublicKey>;
  enableCustomNode: (network: EnvironmentTypes, value: string) => Promise<void>;
  generateSharedWalletKey: GenerateSharedWalletKeyFn;
  createMultiSigAccount: (props: CreateMultiSigAccountParams) => Promise<void>;
  // TODO: Unify 4 props in a single getter.
  getActiveWalletId: () => Promise<string>;
  getActiveWalletName: () => Promise<string>;
  getActiveWalletAccount: () => Promise<Bip32WalletAccount<Wallet.AccountMetadata> | undefined>;
  getActiveWalletType: () => Promise<WalletType>;
}

/**
 * Checks if the wallet is a bip32 wallet.
 *
 * @param wallet The wallet to check.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAnyBip32Wallet = (wallet: AnyWallet<any, any>): wallet is AnyBip32Wallet<any, any> =>
  wallet.type === WalletType.InMemory || wallet.type === WalletType.Ledger || wallet.type === WalletType.Trezor;

/**
 * The wallet repository uses the extended public key as ID, for bitcoin we dont have 1 but many extended keys
 * (we have one for each network and address format). So lets take the first 64 bytes of the key and use that as id.
 */
const first64AsciiBytesToHex = (input: string): string => {
  const desiredLength = 64;
  const inputBuffer = Buffer.from(input, 'ascii');

  let resultBuffer: Buffer;
  if (inputBuffer.length >= desiredLength) {
    resultBuffer = inputBuffer.slice(0, desiredLength);
  } else {
    const padding = Buffer.alloc(desiredLength - inputBuffer.length);
    resultBuffer = Buffer.concat([inputBuffer, padding]);
  }

  return resultBuffer.toString('hex');
};

const clearBytes = (bytes: Uint8Array) => {
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = 0;
  }
};

const getExtendedAccountPublicKey = async ({
  wallet,
  accountIndex,
  passphrase,
  purpose = KeyManagement.KeyPurpose.STANDARD
}: ExtendedAccountPublicKeyParams) => {
  // eslint-disable-next-line sonarjs/no-small-switch
  switch (wallet.type) {
    case WalletType.InMemory: {
      // eslint-disable-next-line no-alert
      const rootPrivateKeyBytes = await Wallet.KeyManagement.emip3decrypt(
        Buffer.from(wallet.encryptedSecrets.rootPrivateKeyBytes, 'hex'),
        passphrase
      );
      const rootPrivateKeyBuffer = Buffer.from(rootPrivateKeyBytes);
      const bip32Ed25519 = await Wallet.getBip32Ed25519();
      const accountPrivateKey = await Wallet.KeyManagement.util.deriveAccountPrivateKey({
        bip32Ed25519,
        accountIndex,
        rootPrivateKey: Wallet.Crypto.Bip32PrivateKeyHex(rootPrivateKeyBuffer.toString('hex')),
        purpose
      });
      const accountPublicKey = bip32Ed25519.getBip32PublicKey(accountPrivateKey);
      clearBytes(passphrase);
      clearBytes(rootPrivateKeyBytes);
      clearBytes(rootPrivateKeyBuffer);
      return accountPublicKey;
    }
    case WalletType.Ledger:
    case WalletType.Trezor:
      return await Wallet.getHwExtendedAccountPublicKey({
        walletType: wallet.type,
        accountIndex,
        purpose
      });
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

const encryptBitcoinSeed = async (seed: Buffer, passphrase: Uint8Array) => {
  const seedEncrypted = await Wallet.KeyManagement.emip3encrypt(seed, passphrase);
  return HexBlob.fromBytes(seedEncrypted);
};

/** Connects a hardware wallet device */
export const connectHardwareWallet = async (model: Wallet.HardwareWallets): Promise<Wallet.DeviceConnection> =>
  await Wallet.connectDevice(model);

const connectHardwareWalletRevamped = async (usbDevice: USBDevice): Promise<Wallet.HardwareWalletConnection> =>
  Wallet.connectDeviceRevamped(usbDevice);

// eslint-disable-next-line max-statements
export const useWalletManager = (): UseWalletManager => {
  const {
    deletingWallet,
    walletLock,
    setWalletLock,
    cardanoWallet,
    setCardanoWallet,
    setWalletDisplayInfo,
    setIsBitcoinWallet,
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

  const getWalletInfo = useCallback(async (): Promise<Wallet.WalletDisplayInfo | undefined> => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();

    const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
      combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
    );

    const walletId = activeBlockchain === 'bitcoin' ? bitcoinActiveWallet?.walletId : activeWallet?.walletId;
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const wallet = wallets.find((w) => w.walletId === walletId);

    let accountMetadata;
    if (wallet && isAnyBip32Wallet(wallet)) {
      const account = wallet.accounts.find((a) => a.accountIndex === wallet.metadata.lastActiveAccountIndex);
      accountMetadata = account.metadata;
    }

    return {
      walletId,
      walletName: wallet?.metadata?.name,
      walletAccount: accountMetadata,
      walletType: wallet?.type
    };
  }, [backgroundService]);

  const createHardwareWalletRevamped = useCallback<CreateHardwareWalletRevamped>(
    async ({ accountIndexes, connection, name }) => {
      const accounts: Bip32WalletAccount<Wallet.AccountMetadata>[] = [];
      for (const accountIndex of accountIndexes) {
        let extendedAccountPublicKey;
        try {
          extendedAccountPublicKey = await Wallet.getHwExtendedAccountPublicKey({
            walletType: connection.type,
            accountIndex,
            ledgerConnection: connection.type === WalletType.Ledger ? connection.value : undefined
          });
        } catch (error: unknown) {
          throw error;
        }
        accounts.push({
          extendedAccountPublicKey,
          accountIndex,
          metadata: { name: defaultAccountName(accountIndex) }
        });
      }

      const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata: { name, lastActiveAccountIndex: accountIndexes[0] },
        type: connection.type,
        accounts
      };

      const walletId = await walletRepository.addWallet(addWalletProps);
      await walletManager.activate({
        walletId,
        chainId: getCurrentChainId(),
        accountIndex: accountIndexes[0]
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
        accountIndexes: [accountIndex],
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
      setWalletDisplayInfo();
      return;
    }

    // Wallet info for current network
    if (!walletName) {
      setCardanoWallet(null);
      setWalletDisplayInfo();
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
  }, [resetWalletLock, backgroundService, setCardanoWallet, setWalletDisplayInfo, setWalletLock, getCurrentChainId]);

  const getActiveWalletId = useCallback(async (): Promise<string> => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();

    const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
      combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
    );

    if (activeBlockchain === 'bitcoin') {
      return bitcoinActiveWallet?.walletId;
    }

    return activeWallet?.walletId;
  }, [backgroundService]);

  const getActiveWalletName = useCallback(async (): Promise<string> => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();

    const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
      combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
    );

    const walletId = activeBlockchain === 'bitcoin' ? bitcoinActiveWallet?.walletId : activeWallet?.walletId;
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const wallet = wallets.find((w) => w.walletId === walletId);

    if (!wallet) return '';

    return wallet.metadata.name || '';
  }, [backgroundService]);

  const getActiveWalletType = useCallback(async (): Promise<WalletType> => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();

    const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
      combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
    );

    const walletId = activeBlockchain === 'bitcoin' ? bitcoinActiveWallet?.walletId : activeWallet?.walletId;
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const wallet = wallets.find((w) => w.walletId === walletId);

    if (!wallet) return WalletType.InMemory;

    return wallet.type;
  }, [backgroundService]);

  const getActiveWalletAccount = useCallback(async (): Promise<
    Bip32WalletAccount<Wallet.AccountMetadata> | undefined
  > => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();

    const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
      combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
    );

    const walletId = activeBlockchain === 'bitcoin' ? bitcoinActiveWallet?.walletId : activeWallet?.walletId;
    const wallets = await firstValueFrom(walletRepository.wallets$);
    const wallet = wallets.find((w) => w.walletId === walletId);

    if (!wallet || !isAnyBip32Wallet(wallet)) return undefined;

    return wallet.accounts.find((a) => a.accountIndex === wallet.metadata.lastActiveAccountIndex);
  }, [backgroundService]);

  const activateWallet = useCallback(
    async (props: ActivateWalletProps): Promise<void> => {
      const { activeBlockchain } = await backgroundService.getBackgroundStorage();

      const [wallets, activeWallet, bitcoinActiveWallet] = await firstValueFrom(
        combineLatest([walletRepository.wallets$, walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
      );

      if (activeBlockchain === 'bitcoin') {
        if (
          bitcoinActiveWallet?.walletId === props.walletId &&
          bitcoinActiveWallet?.accountIndex === props.accountIndex
        ) {
          return;
        }
      } else if (activeWallet?.walletId === props.walletId && activeWallet?.accountIndex === props.accountIndex) {
        return;
      }

      const walletToActivate = wallets.find(({ walletId }) => walletId === props.walletId);
      const updateWalletMetadataProps = {
        walletId: props.walletId,
        metadata: {
          ...walletToActivate.metadata,
          lastActiveAccountIndex: props.accountIndex
        }
      };
      await walletRepository.updateWalletMetadata(updateWalletMetadataProps);

      const chainId = getCurrentChainId();
      if (
        walletToActivate.type === WalletType.InMemory &&
        walletToActivate.blockchainName &&
        walletToActivate.blockchainName === 'Bitcoin'
      ) {
        const network =
          chainId.networkId === Wallet.Cardano.NetworkId.Mainnet
            ? BtcWallet.Network.Mainnet
            : BtcWallet.Network.Testnet;

        await bitcoinWalletManager.activate({
          ...props,
          network
        });

        await backgroundService.setBackgroundStorage({
          activeBlockchain: 'bitcoin'
        });

        setIsBitcoinWallet(true);
        setWalletDisplayInfo(await getWalletInfo());
      } else {
        await walletManager.activate({
          ...props,
          chainId
        });

        await backgroundService.setBackgroundStorage({
          activeBlockchain: 'cardano'
        });

        setIsBitcoinWallet(false);
        setWalletDisplayInfo(await getWalletInfo());
      }
    },
    [getCurrentChainId, backgroundService, setIsBitcoinWallet, setWalletDisplayInfo, getWalletInfo]
  );

  const activateAnyWallet = useCallback(
    async (wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]) => {
      const anyWallet: ActivateWalletProps = {
        walletId: wallets[0].walletId,
        accountIndex: wallets[0].type === WalletType.Script ? undefined : wallets[0].accounts[0]?.accountIndex
      };
      await activateWallet(anyWallet);
    },
    [activateWallet]
  );

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
          setWalletDisplayInfo();
        }
        return;
      }

      // If there is no active wallet, activate the 1st one
      if (!activeWalletProps) {
        // deleting a wallet calls deactivateWallet(): do nothing, wallet will also be deleted from repository
        if (!deletingWallet) {
          await activateAnyWallet(wallets);
        }
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
        logger.error('Active wallet not found', activeWallet, wallets);
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
        setWalletDisplayInfo(await getWalletInfo());
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
      getWalletInfo,
      setCardanoWallet,
      setWalletDisplayInfo,
      setCurrentChain,
      tryMigrateToWalletRepository,
      cardanoWallet,
      currentChain,
      manageAccountsWallet,
      activateAnyWallet,
      deletingWallet,
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
      setWalletDisplayInfo(await getWalletInfo());
      setCurrentChain(chainName);
    },
    [getWalletInfo, updateAppSettings, setCardanoWallet, setWalletDisplayInfo, setCurrentChain]
  );

  /**
   * Creates or restores a new in-memory wallet with the cardano-js-sdk and saves it in wallet repository
   */
  const createWallet = useCallback(
    async ({
      name,
      chainId = getCurrentChainId(),
      passphrase,
      metadata,
      encryptedSecrets,
      extendedAccountPublicKey
    }: CreateWalletParamsBase): Promise<Wallet.CardanoWallet> => {
      const accountIndex = 0;
      const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata,
        encryptedSecrets,
        accounts: [
          {
            accountIndex,
            metadata: { name: defaultAccountName(accountIndex) },
            extendedAccountPublicKey
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

      await backgroundService.setBackgroundStorage({
        activeBlockchain: 'cardano'
      });

      // Needed for reset password flow
      saveValueInLocalStorage({ key: 'wallet', value: { name } });

      // Clear passphrase
      if (passphrase) passphrase.fill(0);
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
    [getCurrentChainId, backgroundService, clearSecrets]
  );

  /**
   * Creates or restores a new bitcoin in-memory wallet and saves it in wallet repository
   */
  const createBitcoinWallet = useCallback(
    async ({
      name,
      passphrase,
      metadata,
      encryptedSecrets,
      accountIndex,
      extendedAccountPublicKeys
    }: CreateBitcoinWalletParams): Promise<BitcoinWallet> => {
      const addWalletProps: AddWalletProps<Wallet.WalletMetadata, Wallet.AccountMetadata> = {
        metadata,
        encryptedSecrets,
        accounts: [
          {
            accountIndex,
            metadata: { name: defaultAccountName(accountIndex), bitcoin: { extendedAccountPublicKeys } },
            // For ID purposes only, we dont use this field as a key for bitcoin. We use the keys inside the metadata field
            extendedAccountPublicKey: first64AsciiBytesToHex(
              extendedAccountPublicKeys.mainnet.nativeSegWit
            ) as unknown as Wallet.Crypto.Bip32PublicKeyHex
          }
        ],
        type: WalletType.InMemory,
        blockchainName: 'Bitcoin'
      };

      const walletId = await walletRepository.addWallet(addWalletProps);

      const cardanoChainId = getCurrentChainId();
      const network =
        cardanoChainId.networkId === Wallet.Cardano.NetworkId.Mainnet
          ? BtcWallet.Network.Mainnet
          : BtcWallet.Network.Testnet;

      await bitcoinWalletManager.activate({
        walletId,
        network,
        accountIndex
      });

      await backgroundService.setBackgroundStorage({
        activeBlockchain: 'bitcoin'
      });

      setIsBitcoinWallet(true);

      // Needed for reset password flow
      saveValueInLocalStorage({ key: 'wallet', value: { name } });

      // Clear passphrase
      if (passphrase) passphrase.fill(0);
      clearSecrets();

      return {
        name,
        wallet: bitcoinWallet,
        source: {
          wallet: {
            ...addWalletProps,
            walletId
          },
          account: addWalletProps.accounts[0]
        }
      };
    },
    [backgroundService, clearSecrets, getCurrentChainId, setIsBitcoinWallet]
  );

  const createWalletFromPrivateKey = useCallback(
    async ({ name, rootPrivateKeyBytes, extendedAccountPublicKey }: CreateWalletFromPrivateKeyParams) =>
      createWallet({
        name,
        metadata: { name, lastActiveAccountIndex: 0 },
        encryptedSecrets: {
          keyMaterial: HexBlob.fromBytes(Buffer.from('')),
          rootPrivateKeyBytes
        },
        extendedAccountPublicKey
      }),
    [createWallet]
  );

  const createWalletFromMnemonic = async ({
    name,
    chainId = getCurrentChainId(),
    mnemonic
  }: CreateWalletParams): Promise<Wallet.CardanoWallet> => {
    const accountIndex = 0;
    const passphrase = Buffer.from(password.value, 'utf8');
    const lockValue = HexBlob.fromBytes(await Wallet.KeyManagement.emip3encrypt(LOCK_VALUE, passphrase));
    const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
      {
        chainId,
        getPassphrase: async () => passphrase,
        mnemonicWords: mnemonic,
        accountIndex,
        purpose: KeyManagement.KeyPurpose.STANDARD
      },
      {
        bip32Ed25519: await Wallet.getBip32Ed25519(),
        logger
      }
    );
    const metadata = {
      name,
      lastActiveAccountIndex: accountIndex,
      lockValue
    };
    const encryptedSecrets = {
      keyMaterial: await encryptMnemonic(mnemonic, passphrase),
      rootPrivateKeyBytes: HexBlob.fromBytes(
        Buffer.from(
          (keyAgent.serializableData as Wallet.KeyManagement.SerializableInMemoryKeyAgentData)
            .encryptedRootPrivateKeyBytes
        )
      )
    };
    const extendedAccountPublicKey = keyAgent.extendedAccountPublicKey;

    return createWallet({ name, passphrase, metadata, encryptedSecrets, extendedAccountPublicKey });
  };

  const createBitcoinWalletFromMnemonic = async ({ name, mnemonic }: CreateWalletParams): Promise<BitcoinWallet> => {
    const accountIndex = 0;
    const passphrase = Buffer.from(password.value, 'utf8');
    const lockValue = HexBlob.fromBytes(await Wallet.KeyManagement.emip3encrypt(LOCK_VALUE, passphrase));

    const seed = bip39.mnemonicToSeedSync(mnemonic.join(' '));
    const extendedAccountPublicKeys = BtcWallet.getExtendedPubKeys(seed, 0);

    const metadata = {
      name,
      lastActiveAccountIndex: accountIndex,
      lockValue,
      extendedAccountPublicKeys
    };
    const encryptedSecrets = {
      keyMaterial: await encryptMnemonic(mnemonic, passphrase),
      rootPrivateKeyBytes: await encryptBitcoinSeed(seed, passphrase)
    };

    seed.fill(0);

    return createBitcoinWallet({
      name,
      passphrase,
      metadata,
      encryptedSecrets,
      extendedAccountPublicKeys,
      accountIndex
    });
  };

  /**
   * Deletes Wallet from memory, all info from browser storage and destroys all stores
   *
   * @returns active wallet id after deleting the wallet
   */
  const deleteWallet = useCallback(
    // eslint-disable-next-line max-statements
    async (
      isForgotPasswordFlow = false,
      nextWallet?: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
    ): Promise<WalletManagerActivateProps | undefined> => {
      const { activeBlockchain } = await backgroundService.getBackgroundStorage();

      const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
        combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
      );

      let walletToDelete: Pick<WalletManagerActivateProps, 'walletId'> =
        activeBlockchain === 'bitcoin' ? bitcoinActiveWallet : activeWallet;

      if (walletToDelete) {
        await (activeBlockchain === 'bitcoin' ? bitcoinWalletManager.deactivate() : walletManager.deactivate());
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

      const wallets = nextWallet ? [nextWallet] : await firstValueFrom(walletRepository.wallets$);

      if (wallets.length > 0) {
        const props = {
          walletId: wallets[0].walletId,
          chainId: getCurrentChainId(),
          accountIndex: wallets[0].type === WalletType.Script ? undefined : wallets[0].accounts[0].accountIndex
        };

        await activateWallet(props);
        return props;
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
      setWalletDisplayInfo();

      const commonLocalStorageKeysToKeep: (keyof ILocalStorage)[] = [
        'currency',
        'lock',
        'mode',
        'hideBalance',
        'isForgotPasswordFlow',
        'multidelegationFirstVisit',
        'isMultiDelegationDAppCompatibilityModalVisible'
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

      for (const network of [BtcWallet.Network.Mainnet, BtcWallet.Network.Testnet]) {
        await bitcoinWalletManager.destroyData(walletToDelete.walletId, network);
      }
    },
    [
      resetWalletLock,
      setCardanoWallet,
      setWalletDisplayInfo,
      backgroundService,
      userIdService,
      clearAddressBook,
      clearNftsFolders,
      getCurrentChainId,
      activateWallet
    ]
  );

  const reloadWallet = useCallback(async (): Promise<void> => {
    const { activeBlockchain } = await backgroundService.getBackgroundStorage();
    const activeBitcoinWallet = await firstValueFrom(bitcoinWalletManager.activeWalletId$);
    const activeWallet = await firstValueFrom(walletManager.activeWalletId$);

    if (activeBlockchain === 'bitcoin') {
      if (activeBitcoinWallet) {
        await bitcoinWalletManager.activate(activeBitcoinWallet, true);
      }
    } else if (activeWallet) {
      await walletManager.activate(activeWallet, true);
    }
  }, [backgroundService]);

  /**
   * Deactivates current wallet and activates it again with the new network
   */
  const switchNetwork = useCallback(
    async (chainName: Wallet.ChainName): Promise<void> => {
      logger.debug('Switching chain to', chainName, AVAILABLE_CHAINS);

      const chainId = chainIdFromName(chainName);
      const network =
        chainId.networkId === Wallet.Cardano.NetworkId.Mainnet ? BtcWallet.Network.Mainnet : BtcWallet.Network.Testnet;

      await walletManager.switchNetwork(chainId);
      await bitcoinWalletManager.switchNetwork(network);

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
    setWalletDisplayInfo();
    setAddressesDiscoveryCompleted(false);
  }, [setCardanoWallet, setWalletDisplayInfo, cardanoWallet, setWalletLock, setAddressesDiscoveryCompleted]);

  /**
   * Recovers wallet info from encrypted lock using the wallet password
   */
  const unlockWallet = async (): Promise<boolean> => {
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
  };

  const getMnemonic = useCallback(
    async (passphrase: Uint8Array) => {
      const { activeBlockchain } = await backgroundService.getBackgroundStorage();

      const [activeWallet, bitcoinActiveWallet] = await firstValueFrom(
        combineLatest([walletManager.activeWalletId$, bitcoinWalletManager.activeWalletId$])
      );

      const selectedWallet: Pick<WalletManagerActivateProps, 'walletId'> =
        activeBlockchain === 'bitcoin' ? bitcoinActiveWallet : activeWallet;

      const wallet = (await firstValueFrom(walletRepository.wallets$)).find(
        (w) => w.walletId === selectedWallet.walletId
      );

      if (!wallet) {
        throw new Error('Wallet not found');
      }

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
    [backgroundService]
  );

  const getSharedWalletExtendedPublicKey = useCallback(
    async (passphrase?: Uint8Array): Promise<Wallet.Cardano.Cip1854ExtendedAccountPublicKey> => {
      const { wallet } = cardanoWallet.source;
      if (wallet.type === WalletType.Script) throw new Error('Xpub keys not available for shared wallet');

      const accountIndex = 0;
      const bip32AccountPublicKey = await getExtendedAccountPublicKey({
        wallet,
        accountIndex,
        passphrase,
        purpose: KeyManagement.KeyPurpose.MULTI_SIG
      });
      return Wallet.Cardano.Cip1854ExtendedAccountPublicKey.fromBip32PublicKeyHex(bip32AccountPublicKey);
    },
    [cardanoWallet]
  );

  const generateSharedWalletKey = useMemo(
    () =>
      makeGenerateSharedWalletKey({
        getSharedWalletExtendedPublicKey
      }),
    [getSharedWalletExtendedPublicKey]
  );

  const createMultiSigAccount = useCallback<UseWalletManager['createMultiSigAccount']>(
    async ({ accountIndex = 0, ownSignerWalletId, sharedWalletKey }: CreateMultiSigAccountParams): Promise<void> => {
      await walletRepository.addAccount({
        accountIndex,
        extendedAccountPublicKey: sharedWalletKey,
        metadata: { name: defaultAccountName(accountIndex) },
        purpose: KeyManagement.KeyPurpose.MULTI_SIG,
        walletId: ownSignerWalletId
      });
    },
    []
  );

  const createInMemorySharedWallet = useCallback(
    async ({
      accountIndex = 0,
      name,
      chainId = getCurrentChainId(),
      ownSignerWalletId,
      quorumRules,
      coSigners
    }: CreateSharedWalletParams): Promise<Wallet.CardanoWallet> => {
      const coSignersInBip32Hex = coSigners.map((c) => ({
        ...c,
        sharedWalletKey: Wallet.Cardano.Cip1854ExtendedAccountPublicKey.toBip32PublicKeyHex(
          Wallet.Cardano.Cip1854ExtendedAccountPublicKey(c.sharedWalletKey)
        )
      }));

      const publicKeys = coSignersInBip32Hex.map((c: CoSigner) => Wallet.Crypto.Bip32PublicKeyHex(c.sharedWalletKey));

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
          coSigners: coSignersInBip32Hex.map((signer) => ({
            name: signer.name,
            sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex(signer.sharedWalletKey)
          }))
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
      const extendedAccountPublicKey = await getExtendedAccountPublicKey({ wallet, accountIndex, passphrase });
      await walletRepository.addAccount({
        accountIndex,
        extendedAccountPublicKey,
        metadata,
        walletId: wallet.walletId
      });

      await activateWallet({
        walletId: wallet.walletId,
        accountIndex
      });
    },
    [activateWallet]
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
    createWallet: createWalletFromMnemonic,
    createWalletFromPrivateKey,
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
    bitcoinWalletManager,
    bitcoinWallet,
    getMnemonic,
    enableCustomNode,
    generateSharedWalletKey,
    createMultiSigAccount,
    getSharedWalletExtendedPublicKey,
    createBitcoinWallet: createBitcoinWalletFromMnemonic,
    getActiveWalletId,
    getActiveWalletName,
    getActiveWalletAccount,
    getActiveWalletType
  };
};
