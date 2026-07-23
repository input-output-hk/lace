import type { AccountId, AccountIdentityKey, WalletId } from './value-objects';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { NetworkType } from '@lace-contract/network';
import type { HexBytes, Timestamp } from '@lace-lib/util';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';

export enum WalletType {
  /***
   * Keys are managed by Lace
   */
  InMemory = 'InMemory',
  /**
   * Keys (and the seed they derive from) are NOT persisted by Lace.
   * The wallet entity holds only public material; an external module
   * supplies the seed on demand via its own signer-factory-addon
   * implementation (e.g. fetching from a remote key-management service
   * such as Torus on each signing request).
   */
  LazyInMemory = 'LazyInMemory',
  /**
   * Keys are managed by an external Ledger device
   */
  HardwareLedger = 'HardwareLedger',
  /**
   * Keys are managed by an external Trezor device
   */
  HardwareTrezor = 'HardwareTrezor',
  /**
   * Keys are managed by an external Cardano Seed Signer device.
   * Like other hardware wallets it is watch-only; it additionally
   * persists the device master fingerprint (xfp) so signing requests
   * can target the right device seed.
   */
  HardwareSeedSigner = 'HardwareSeedSigner',
  /**
   * Keys are managed by an external Keystone device.
   * Like other hardware wallets it is watch-only; the device communicates
   * exclusively over QR codes and is identified by its BIP-32 master
   * fingerprint (xfp) so signing requests can target the right device seed.
   */
  HardwareKeystone = 'HardwareKeystone',
  /**
   * Requires more than 1 set of keys to spend from this wallet.
   * Some (or all) co-signers are other wallet (InMemory/Hardware)
   * accounts from this repository.
   */
  MultiSig = 'MultiSig',
}

export type AccountRef = {
  walletId: WalletId;
  accountId: AccountId;
};

export interface WalletMetadata {
  name: string;
  order: number;
}
export interface AccountMetadata {
  name: string;
  /** Optional avatar image URL for account display (e.g. in account selector). */
  avatarUri?: string;
  /**
   * Epoch-ms timestamp of when this account was first created/onboarded in
   * Lace. Optional for backwards compatibility: accounts persisted before this
   * field existed rehydrate with it undefined, which is treated as "onboarded
   * before any security detection shipped" and thus eligible for a proactive
   * re-scan. Stamped at account-creation sites, never in a reducer.
   */
  onboardedAt?: Timestamp;
}

type AccountBase<BlockchainSpecific> = {
  accountId: AccountId;
  walletId: WalletId;
  blockchainName: BlockchainName;
  networkType: NetworkType;
  blockchainNetworkId: BlockchainNetworkId;
  metadata: AccountMetadata;
  blockchainSpecific: BlockchainSpecific;
};
export interface InMemoryWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'InMemory';
}
export interface LazyInMemoryWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'LazyInMemory';
}
export interface HardwareWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType:
    | 'HardwareKeystone'
    | 'HardwareLedger'
    | 'HardwareSeedSigner'
    | 'HardwareTrezor';
}
export interface MultiSigWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'MultiSig';
  ownSigners: AccountRef[];
}

export interface BlockchainSpecificInMemoryWalletData {}
export interface BlockchainSpecificHardwareWalletData {}
export interface BlockchainSpecificMultiSigWalletData {}

type WalletBase<BlockchainSpecific, Metadata = WalletMetadata> = {
  metadata: Metadata;
  walletId: WalletId;
  blockchainSpecific: BlockchainSpecific;
};
export type InMemoryWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificInMemoryWalletData> & {
    // Absent for wallets imported from Nami via Lace V1, which never stored a mnemonic.
    encryptedRecoveryPhrase?: HexBytes;
    accounts: InMemoryWalletAccount<BlockchainSpecificAccountProps>[];
    type: WalletType.InMemory;
    isPassphraseConfirmed: boolean;
  };
export type LazyInMemoryWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificInMemoryWalletData> & {
    accounts: LazyInMemoryWalletAccount<BlockchainSpecificAccountProps>[];
    type: WalletType.LazyInMemory;
  };
export type HardwareWalletLedger<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareLedger;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type HardwareWalletTrezor<BlockchainSpecificAccountProps = unknown> =
  WalletBase<
    BlockchainSpecificHardwareWalletData,
    WalletMetadata & {
      derivationType?: 'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER';
    }
  > & {
    type: WalletType.HardwareTrezor;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type HardwareWalletSeedSigner<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareSeedSigner;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type HardwareWalletKeystone<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareKeystone;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type HardwareWallet<BlockchainSpecificAccountProps = unknown> =
  | HardwareWalletKeystone<BlockchainSpecificAccountProps>
  | HardwareWalletLedger<BlockchainSpecificAccountProps>
  | HardwareWalletSeedSigner<BlockchainSpecificAccountProps>
  | HardwareWalletTrezor<BlockchainSpecificAccountProps>;
export type MultiSigWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificMultiSigWalletData> & {
    type: WalletType.MultiSig;
    accounts: MultiSigWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type AnyWallet =
  | HardwareWallet
  | InMemoryWallet
  | LazyInMemoryWallet
  | MultiSigWallet;
export type AnyAccount<
  HwProps = unknown,
  InMemoryProps = unknown,
  MultiSigProps = unknown,
> =
  | HardwareWalletAccount<HwProps>
  | InMemoryWalletAccount<InMemoryProps>
  | LazyInMemoryWalletAccount<InMemoryProps>
  | MultiSigWalletAccount<MultiSigProps>;

/**
 * Blockchain-provided extractor of an account's key-derived identity. Each
 * blockchain module implements this against its own `blockchainSpecific`
 * account shape (e.g. Cardano reads the extended account public key) and
 * registers it via the `loadWalletIdentity` addon. Consumers use it to detect
 * that a wallet being added is already present, independent of how its
 * `walletId` was derived.
 */
export type WalletIdentity = BlockchainAssigned<{
  getAccountIdentityKey: (
    account: AnyAccount,
  ) => AccountIdentityKey | undefined;
}>;
