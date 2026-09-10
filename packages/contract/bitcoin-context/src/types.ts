import '@lace-contract/wallet-repo';

import type {
  BitcoinFeeMarketProvider,
  BitcoinProvider,
} from './bitcoin-data-provider';
import type { BitcoinNetworkId } from './value-objects';
import type { Address } from '@lace-contract/addresses';
import type { HexBytes, Milliseconds } from '@lace-lib/util';
import type { EmptyObject, Tagged } from 'type-fest';

export type BitcoinAddress = Address & Tagged<string, 'BitcoinAddress'>;
export const BitcoinAddress = (address: string) => address as BitcoinAddress;

export enum BitcoinNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet4',
}

/** Script type of an address, naming its BIP-32 purpose (BIP-44/49/84/86). */
export type BitcoinAddressType =
  | 'Legacy'
  | 'NativeSegWit'
  | 'SegWit'
  | 'Taproot';

/**
 * BIP-32 chain an address is derived on: 'external' for receiving addresses,
 * 'internal' for change.
 */
export type BitcoinAddressChain = 'external' | 'internal';

/**
 * Data attached to a Bitcoin address in the addresses store. The optional
 * fields carry the BIP-32 coordinates and public key of the derived address
 * so signers can be reconstructed from stored addresses alone; they are
 * optional because entries persisted before their introduction carry only
 * the network until the next wallet sync backfills them.
 */
export type BitcoinAddressData = {
  network: BitcoinNetwork;
  addressType?: BitcoinAddressType;
  account?: number;
  chain?: BitcoinAddressChain;
  index?: number;
  publicKeyHex?: string;
};

export type BitcoinProviderContext = {
  network: BitcoinNetwork;
};

export interface BitcoinProviderDependencies {
  bitcoinProvider: BitcoinProvider;
}

export interface BitcoinFeeMarketProviderDependencies {
  bitcoinFeeMarketProvider: BitcoinFeeMarketProvider;
}

export interface BitcoinProviderConfig {
  tipPollFrequency: Milliseconds;
  historyDepth: number;
}

export interface BitcoinFeeMarketProviderConfig {}

/**
 * Extended account public keys for a Bitcoin wallet.
 *
 * In-memory wallets derive every script type from the seed. A watch-only
 * hardware account (e.g. an air-gapped Seed Signer) only exports the active
 * Native SegWit key, so the other script types are optional and absent there.
 */
export type BitcoinExtendedAccountPublicKeys = {
  /** The extended public key for Native SegWit addresses (base58 encoded). */
  nativeSegWit: string;
  /** The extended public key for legacy addresses (base58 encoded). */
  legacy?: string;
  /** The extended public key for SegWit addresses (base58 encoded). */
  segWit?: string;
  /** The extended public key for Taproot addresses (base58 encoded). */
  taproot?: string;
};

export type BitcoinBip32AccountProps = {
  accountIndex: number;
  extendedAccountPublicKeys: BitcoinExtendedAccountPublicKeys;
  networkId?: BitcoinNetworkId;
  /**
   * Device master fingerprint (xfp) as 8-char lowercase hex, present for a
   * watch-only hardware account so PSBT input key-origins can target the device
   * seed. Absent for in-memory accounts.
   */
  masterFingerprint?: string;
};

export type BitcoinAnyAccountProps = BitcoinBip32AccountProps;

export type BitcoinHardwareWalletProps = EmptyObject;
export type BitcoinMultiSigWalletProps = EmptyObject;

type BitcoinDependencies = BitcoinFeeMarketProviderDependencies &
  BitcoinProviderDependencies;

export type BitcoinSpecificInMemoryWalletData = {
  encryptedRootPrivateKey: HexBytes;
};

export type BitcoinBlockchainSpecificTxData = {
  memo: string;
  feeRate: {
    feeOption: 'Average' | 'Custom' | 'Fast' | 'Low';
    customFeeRate?: number;
  };
};

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends BitcoinDependencies {}
  interface AppConfig {
    bitcoinProvider: BitcoinProviderConfig;
    bitcoinFeeMarketProvider: BitcoinFeeMarketProviderConfig;
  }
}
