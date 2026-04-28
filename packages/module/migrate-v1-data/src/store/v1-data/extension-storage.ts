import { storage } from 'webextension-polyfill';

import {
  LMP_WALLETS_BACKUP_KEY,
  MIGRATE_V1_PERSIST_KEY,
  V2_REBUILT_PERSIST_KEYS,
} from './persist-keys';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';
import type {
  AnyWallet as V1AnyWallet,
  WalletManagerActivateProps,
} from '@cardano-sdk/web-extension';
import type { AuthorizedDapp } from '@lace-contract/dapp-connector';
import type { MidnightAccountProps } from '@lace-contract/midnight-context';
import type { InMemoryWallet, WalletId } from '@lace-contract/wallet-repo';

export type V1DappInfo = {
  name: string;
  logo: string;
  url: string;
};

export interface V1WalletMetadata {
  name: string;
  lockValue?: HexBlob;
  lastActiveAccountIndex?: number;
  walletAddresses?: Cardano.PaymentAddress[];
  coSigners?: {
    sharedWalletKey: Bip32PublicKeyHex;
    name: string;
  }[];
  trezorConfig?: {
    derivationType?: 'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER';
  };
}

type V1ChainName = keyof typeof Cardano.ChainIds;
export interface V1AccountMetadata {
  name: string;
  namiMode?: {
    avatar: string;
    balance?: Partial<Record<V1ChainName, string>>;
    address?: Partial<Record<V1ChainName, string>>;
    recentSendToAddress?: Partial<Record<V1ChainName, string>>;
  };
  bitcoin?: {
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
}

type V1BackgroundStorage = {
  userId?: string;
  // TODO: LW-XXXXX potentially useful properties to migrate - determine what to do with them
  customSubmitTxUrl?: string;
  optedInBeta?: boolean;
  logLevel?: 'debug' | 'error' | 'info' | 'trace' | 'warn';
  // TODO: LW-XXXXX add selected language state in i18n contract slice and set it
  languageChoice?: 'en' | 'es';
};

export type V1Wallet = V1AnyWallet<V1WalletMetadata, V1AccountMetadata>;

export { LMP_WALLETS_BACKUP_KEY };

/**
 * Schema-validates the doubly-stringified LMP wallets blob from extension
 * storage. The outer string is JSON of `{ entities: "<inner JSON>" }`; the
 * inner JSON is a record of wallet entities.
 *
 * Returns an empty array on any malformed input and logs the failure.
 * Returning empty causes the in-memory wallet count to be zero or one,
 * which preparePreloadedState then surfaces as a completed migration so the
 * wizard never opens.
 */
const parseLmpMidnightWallets = (
  raw: string | undefined,
): InMemoryWallet<MidnightAccountProps>[] => {
  if (!raw) return [];
  try {
    const outer = JSON.parse(raw) as unknown;
    if (
      typeof outer !== 'object' ||
      outer === null ||
      !('entities' in outer) ||
      typeof (outer as { entities: unknown }).entities !== 'string'
    ) {
      return [];
    }
    const inner = JSON.parse(
      (outer as { entities: string }).entities,
    ) as unknown;
    if (typeof inner !== 'object' || inner === null) return [];
    return Object.values(
      inner as Record<WalletId, InMemoryWallet<MidnightAccountProps>>,
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('migrate-v1-data: failed to parse LMP wallets blob', error);
    return [];
  }
};

const parseLmpMidnightAuthorizedDapps = (
  raw: string | undefined,
): AuthorizedDapp[] => {
  if (!raw) return [];
  try {
    const outer = JSON.parse(raw) as unknown;
    if (
      typeof outer !== 'object' ||
      outer === null ||
      !('Midnight' in outer) ||
      typeof (outer as { Midnight: unknown }).Midnight !== 'string'
    ) {
      return [];
    }
    const inner = JSON.parse(
      (outer as { Midnight: string }).Midnight,
    ) as unknown;
    return Array.isArray(inner) ? (inner as AuthorizedDapp[]) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      'migrate-v1-data: failed to parse LMP authorizedDapps blob',
      error,
    );
    return [];
  }
};

export const getExtensionStorageData = async () => {
  const extensionStorageData = await storage.local.get([
    'authorizedDapps',
    'walletRepository',
    'lace-active-wallet',
    'BACKGROUND_STORAGE',
    'redux:persist:authorizedDapps',
    'redux:persist:wallets',
    LMP_WALLETS_BACKUP_KEY,
  ]);
  const v1AuthorizedDapps =
    (extensionStorageData.authorizedDapps as V1DappInfo[]) || [];
  const v1Wallets = (extensionStorageData.walletRepository as V1Wallet[]) || [];
  const v1ActiveWallet = extensionStorageData['lace-active-wallet'] as
    | WalletManagerActivateProps
    | undefined;
  const { userId: v1UserId } =
    (extensionStorageData.BACKGROUND_STORAGE as V1BackgroundStorage) || {};

  const lmpWalletsBackup = extensionStorageData[LMP_WALLETS_BACKUP_KEY] as
    | string
    | undefined;
  const liveLmpWallets = extensionStorageData['redux:persist:wallets'] as
    | string
    | undefined;
  if (!lmpWalletsBackup && liveLmpWallets) {
    await storage.local.set({ [LMP_WALLETS_BACKUP_KEY]: liveLmpWallets });
  }
  const storedLmpMidnightWallets = lmpWalletsBackup ?? liveLmpWallets;

  const lmpMidnightWallets = parseLmpMidnightWallets(storedLmpMidnightWallets);

  const lmpMidnightAuthorizedDapps = parseLmpMidnightAuthorizedDapps(
    extensionStorageData['redux:persist:authorizedDapps'] as string | undefined,
  );
  return {
    v1AuthorizedDapps,
    v1Wallets,
    v1UserId,
    v1ActiveWallet,
    lmpMidnightWallets,
    lmpMidnightAuthorizedDapps,
  };
};

export const deleteLmpWalletsAndAuthorizedDapps = async (): Promise<void> =>
  storage.local.remove([...V2_REBUILT_PERSIST_KEYS]);

export const deleteLmpWalletsBackup = async (): Promise<void> =>
  storage.local.remove(LMP_WALLETS_BACKUP_KEY);

/**
 * Wipes the precise set of v2 redux-persist keys that preparePreloadedState
 * rebuilds, plus the migrateV1 slice itself so it rehydrates clean and the
 * detection step re-runs from freshly imported V1 data.
 *
 * Idempotent and explicit. Does not touch walletRepository (V1 source of
 * truth, read-only), migrateV1:backup:wallets (LMP backup, restored on
 * resume), or any other v2 persist keys not listed in V2_REBUILT_PERSIST_KEYS.
 */
export const restartV1Migration = async (): Promise<void> => {
  await storage.local.remove([
    ...V2_REBUILT_PERSIST_KEYS,
    MIGRATE_V1_PERSIST_KEY,
  ]);
};
