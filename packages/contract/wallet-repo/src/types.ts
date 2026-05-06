import type { AccountId, WalletId } from './value-objects';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { NetworkType } from '@lace-contract/network';
import type { BlockchainName } from '@lace-lib/util-store';
import type { HexBytes } from '@lace-sdk/util';

export enum WalletType {
  /***
   * Keys are managed by Lace
   */
  InMemory = 'InMemory',
  /**
   * Keys are managed by an external Ledger device
   */
  HardwareLedger = 'HardwareLedger',
  /**
   * Keys are managed by an external Trezor device
   */
  HardwareTrezor = 'HardwareTrezor',
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
export interface HardwareWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'HardwareLedger' | 'HardwareTrezor';
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
export type HardwareWallet<BlockchainSpecificAccountProps = unknown> =
  | HardwareWalletLedger<BlockchainSpecificAccountProps>
  | HardwareWalletTrezor<BlockchainSpecificAccountProps>;
export type MultiSigWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificMultiSigWalletData> & {
    type: WalletType.MultiSig;
    accounts: MultiSigWalletAccount<BlockchainSpecificAccountProps>[];
  };
export type AnyWallet = HardwareWallet | InMemoryWallet | MultiSigWallet;
export type AnyAccount<
  HwProps = unknown,
  InMemoryProps = unknown,
  MultiSigProps = unknown,
> =
  | HardwareWalletAccount<HwProps>
  | InMemoryWalletAccount<InMemoryProps>
  | MultiSigWalletAccount<MultiSigProps>;
