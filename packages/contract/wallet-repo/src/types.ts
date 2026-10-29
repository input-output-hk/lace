import type { AccountBase, WalletBase } from './bases';
import type { AccountId, AccountIdentityKey, WalletId } from './value-objects';
import type { ExtensionAccount, ExtensionWallet } from './wallet-kinds';
import type { WalletType } from './wallet-type';
import type { HexBytes, Timestamp } from '@lace-lib/util';
import type { BlockchainAssigned } from '@lace-lib/util-store';

export { WalletType } from './wallet-type';

/** Identifies one account by the wallet that holds it and its own ID. */
export type AccountRef = {
  walletId: WalletId;
  accountId: AccountId;
};

/** User-facing details of a wallet: its display name and its position in the wallet list. */
export interface WalletMetadata {
  name: string;
  order: number;
  /**
   * Epoch-ms timestamp of the migration sweep that emptied every account this
   * wallet held on the migrated network tier. Presentation-layer marker: UI
   * surfaces render a localized "[Migrated]" tag from it, so the warning
   * re-translates on locale switch instead of freezing into the stored name.
   * Absent means never migrated out (or migrated before this field existed).
   */
  migratedOutAt?: Timestamp;
}
/** User-facing details of an account, such as its display name and avatar. */
export interface AccountMetadata {
  name: string;
  /**
   * Epoch-ms timestamp of the migration sweep that moved this account's funds
   * to another wallet. Same presentation-layer contract as
   * {@link WalletMetadata.migratedOutAt}.
   */
  migratedOutAt?: Timestamp;
  /** Optional avatar image URL for account display (e.g. in account selector). */
  avatarUri?: string;
  /**
   * Epoch-ms timestamp of when this account was first created or onboarded.
   * Optional for backwards compatibility: accounts persisted before this
   * field existed rehydrate with it undefined, which is treated as "onboarded
   * before any security detection shipped" and thus eligible for a proactive
   * re-scan. Stamped at account-creation sites, never in a reducer.
   */
  onboardedAt?: Timestamp;
}

/**
 * An account of an {@link InMemoryWallet}, belonging to one blockchain network.
 *
 * @typeParam BlockchainSpecific - The blockchain-defined data the account carries.
 */
export interface InMemoryWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'InMemory';
}
/**
 * An account of a {@link LazyInMemoryWallet}, belonging to one blockchain network.
 *
 * @typeParam BlockchainSpecific - The blockchain-defined data the account carries.
 */
export interface LazyInMemoryWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'LazyInMemory';
}
/**
 * An account of a {@link HardwareWallet}, belonging to one blockchain network;
 * `accountType` names the device vendor.
 *
 * @typeParam BlockchainSpecific - The blockchain-defined data the account carries.
 */
export interface HardwareWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType:
    | 'HardwareKeystone'
    | 'HardwareLedger'
    | 'HardwareSeedSigner'
    | 'HardwareTrezor';
}
/**
 * An account of a {@link MultiSigWallet}, belonging to one blockchain network.
 * `ownSigners` lists the accounts in this repository that co-sign for it.
 *
 * @typeParam BlockchainSpecific - The blockchain-defined data the account carries.
 */
export interface MultiSigWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'MultiSig';
  ownSigners: AccountRef[];
}

/**
 * Wallet-level data that blockchain modules attach to in-memory and lazy
 * in-memory wallets, keyed by blockchain name. Empty here; each blockchain
 * contract adds its key through module augmentation.
 */
export interface BlockchainSpecificInMemoryWalletData {}
/**
 * Wallet-level data that contracts can attach to hardware wallets through
 * module augmentation. Empty by default.
 */
export interface BlockchainSpecificHardwareWalletData {}
/**
 * Wallet-level data that contracts can attach to multi-signature wallets
 * through module augmentation. Empty by default.
 */
export interface BlockchainSpecificMultiSigWalletData {}

/**
 * A wallet that holds its keys. See {@link WalletType.InMemory} for how its
 * recovery phrase is stored.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type InMemoryWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificInMemoryWalletData> & {
    // Absent for a wallet imported without its recovery phrase.
    encryptedRecoveryPhrase?: HexBytes;
    accounts: InMemoryWalletAccount<BlockchainSpecificAccountProps>[];
    type: WalletType.InMemory;
    isPassphraseConfirmed: boolean;
  };
/**
 * A wallet that stores only public keys and has a vault module sign for it.
 * See {@link WalletType.LazyInMemory}.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type LazyInMemoryWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificInMemoryWalletData> & {
    accounts: LazyInMemoryWalletAccount<BlockchainSpecificAccountProps>[];
    type: WalletType.LazyInMemory;
  };
/**
 * A wallet whose keys live on a Ledger device: the wallet stores only its
 * public keys, and the device signs.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type HardwareWalletLedger<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareLedger;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
/**
 * A wallet whose keys live on a Trezor device: the wallet stores only its
 * public keys, and the device signs. Its metadata may record the key derivation type
 * the wallet was set up with.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
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
/**
 * A wallet whose keys live on a Cardano Seed Signer device: the wallet stores
 * only its public keys, and the device signs.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type HardwareWalletSeedSigner<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareSeedSigner;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
/**
 * A wallet whose keys live on a Keystone device: the wallet stores only its
 * public keys, and the device signs.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type HardwareWalletKeystone<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificHardwareWalletData> & {
    type: WalletType.HardwareKeystone;
    accounts: HardwareWalletAccount<BlockchainSpecificAccountProps>[];
  };
/**
 * Any hardware wallet: Keystone, Ledger, Seed Signer or Trezor.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type HardwareWallet<BlockchainSpecificAccountProps = unknown> =
  | HardwareWalletKeystone<BlockchainSpecificAccountProps>
  | HardwareWalletLedger<BlockchainSpecificAccountProps>
  | HardwareWalletSeedSigner<BlockchainSpecificAccountProps>
  | HardwareWalletTrezor<BlockchainSpecificAccountProps>;
/**
 * A wallet that needs more than one set of keys to spend; some or all
 * co-signers are other accounts in this repository.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type MultiSigWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificMultiSigWalletData> & {
    type: WalletType.MultiSig;
    accounts: MultiSigWalletAccount<BlockchainSpecificAccountProps>[];
  };
/** Any wallet the wallet repository can hold, discriminated by `type`. */
export type AnyWallet =
  | ExtensionWallet
  | HardwareWallet
  | InMemoryWallet
  | LazyInMemoryWallet
  | MultiSigWallet;
/**
 * Any account of any wallet, discriminated by `accountType`.
 *
 * @typeParam HwProps - Blockchain-defined data on hardware wallet accounts.
 * @typeParam InMemoryProps - Blockchain-defined data on in-memory and lazy in-memory accounts.
 * @typeParam MultiSigProps - Blockchain-defined data on multi-signature accounts.
 * @typeParam ExtensionProps - Blockchain-defined data on the account kinds features add.
 */
export type AnyAccount<
  HwProps = unknown,
  InMemoryProps = unknown,
  MultiSigProps = unknown,
  ExtensionProps = unknown,
> =
  | ExtensionAccount<ExtensionProps>
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
