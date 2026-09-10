import * as ecc from '@bitcoinerlab/secp256k1';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { HDKey } from '@scure/bip32';
import * as bitcoin from 'bitcoinjs-lib';

bitcoin.initEccLib(ecc);

const networkParams = (network: BitcoinNetwork): bitcoin.networks.Network =>
  network === BitcoinNetwork.Mainnet
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

/**
 * Derive the single native-segwit external/0 receive address from an account's
 * nativeSegWit xpub — the ONLY address Lace ever produces for a Bitcoin account
 * (blockchain-bitcoin BitcoinWallet.ts). ADR-14 Option-3 duplication of the
 * host's sibling `deriveReceiveAddress`
 * (apps/lace-extension-shell/src/sw/bitcoin.ts): the guest cannot import the
 * host, and blockchain-bitcoin is another module, so the derivation is copied
 * verbatim. It MUST match both byte-for-byte, or the address→account map misses
 * (the address BitcoinWallet queries would not resolve to its owning account).
 * The stored xpubs are all mainnet-versioned even for testnet4, so
 * fromExtendedKey parses them directly; the ADDRESS network is set by the
 * payment params, not the xpub version.
 */
export const deriveNativeSegWitReceiveAddress = (
  nativeSegWitXpub: string,
  network: BitcoinNetwork,
): string => {
  const child = HDKey.fromExtendedKey(nativeSegWitXpub).derive('m/0/0');
  if (!child.publicKey) {
    throw new Error(
      'bitcoin-host-pull: failed to derive the receive public key',
    );
  }
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: networkParams(network),
  });
  if (!address) {
    throw new Error('bitcoin-host-pull: failed to derive the receive address');
  }
  return address;
};
