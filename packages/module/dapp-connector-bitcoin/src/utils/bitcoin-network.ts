import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import * as bitcoin from 'bitcoinjs-lib';

/**
 * Maps the contract's blockchain-agnostic BitcoinNetwork enum to the
 * bitcoinjs-lib Network object the PSBT and address utilities require.
 */
export const toBitcoinJsNetwork = (network: BitcoinNetwork): bitcoin.Network =>
  network === BitcoinNetwork.Mainnet
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;
