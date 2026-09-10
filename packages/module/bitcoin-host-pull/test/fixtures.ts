import * as ecc from '@bitcoinerlab/secp256k1';
import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { HDKey } from '@scure/bip32';
import * as bitcoin from 'bitcoinjs-lib';

import type { AnyAccount } from '@lace-contract/wallet-repo';

bitcoin.initEccLib(ecc);

// A deterministic BIP-32 tree for the tests. The monolith stores every
// per-purpose xpub mainnet-versioned even for testnet4 (getExtendedPubKeys uses
// HDKey.fromMasterSeed default versions), so both account xpubs below are
// `xpub`-prefixed; the address network is set by the payment params.
const ROOT = HDKey.fromMasterSeed(Buffer.alloc(64, 7));

export const MAINNET_NATIVE_SEGWIT_XPUB =
  ROOT.derive("m/84'/0'/0'").publicExtendedKey;
export const TESTNET_NATIVE_SEGWIT_XPUB =
  ROOT.derive("m/84'/1'/0'").publicExtendedKey;

/** Independent (non-module) native-segwit external/0 derivation — the resolver
 * must key its map by exactly this address. */
const receiveAddress = (
  xpub: string,
  network: bitcoin.networks.Network,
): string => {
  const child = HDKey.fromExtendedKey(xpub).derive('m/0/0');
  return bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey!),
    network,
  }).address!;
};

export const MAINNET_ADDRESS = receiveAddress(
  MAINNET_NATIVE_SEGWIT_XPUB,
  bitcoin.networks.bitcoin,
);
export const TESTNET_ADDRESS = receiveAddress(
  TESTNET_NATIVE_SEGWIT_XPUB,
  bitcoin.networks.testnet,
);

/** A secret-free InMemory Bitcoin wallet-repo account (the hydrator's
 * projection shape). */
export const bitcoinAccount = (over: {
  walletId?: string;
  accountIndex?: number;
  network?: BitcoinNetwork;
  nativeSegWit?: string;
  accountType?: string;
  blockchainName?: string;
}): AnyAccount => {
  const network = over.network ?? BitcoinNetwork.Mainnet;
  const walletId = over.walletId ?? 'w1';
  const accountIndex = over.accountIndex ?? 0;
  const nativeSegWit =
    over.nativeSegWit ??
    (network === BitcoinNetwork.Mainnet
      ? MAINNET_NATIVE_SEGWIT_XPUB
      : TESTNET_NATIVE_SEGWIT_XPUB);
  const networkId = BitcoinNetworkId(
    network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet4',
  );
  return {
    accountId: `${walletId}-${accountIndex}-${network}`,
    walletId: WalletId(walletId),
    blockchainName: over.blockchainName ?? 'Bitcoin',
    accountType: over.accountType ?? 'InMemory',
    networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
    blockchainNetworkId: networkId,
    metadata: { name: `BTC ${accountIndex}` },
    blockchainSpecific: {
      accountIndex,
      extendedAccountPublicKeys: { nativeSegWit },
      networkId,
    },
  } as unknown as AnyAccount;
};
