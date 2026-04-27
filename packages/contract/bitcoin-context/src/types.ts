import '@lace-contract/wallet-repo';

import type {
  BitcoinFeeMarketProvider,
  BitcoinProvider,
} from './bitcoin-data-provider';
import type { BitcoinNetworkId } from './value-objects';
import type { Address } from '@lace-contract/addresses';
import type { HexBytes, Milliseconds } from '@lace-sdk/util';
import type { EmptyObject, Tagged } from 'type-fest';

export type BitcoinAddress = Address & Tagged<string, 'BitcoinAddress'>;
export const BitcoinAddress = (address: string) => address as BitcoinAddress;

export enum BitcoinNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet4',
}

export type BitcoinAddressData = { network: BitcoinNetwork };

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
 */
export type BitcoinExtendedAccountPublicKeys = {
  /** The extended public key for legacy addresses (base58 encoded). */
  legacy: string;
  /** The extended public key for SegWit addresses (base58 encoded). */
  segWit: string;
  /** The extended public key for Native SegWit addresses (base58 encoded). */
  nativeSegWit: string;
  /** The extended public key for Taproot addresses (base58 encoded). */
  taproot: string;
  /** The extended public key for Electrum Native SegWit addresses (base58 encoded). */
  electrumNativeSegWit: string;
};

export type BitcoinBip32AccountProps = {
  accountIndex: number;
  extendedAccountPublicKeys: BitcoinExtendedAccountPublicKeys;
  networkId?: BitcoinNetworkId;
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
