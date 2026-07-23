import { BitcoinNetwork } from '@lace-contract/bitcoin-context';

/**
 * Trezor coin shortcut selecting the firmware coin config per network. Shared
 * by account export and transaction signing so both flows always address the
 * same firmware coin.
 */
export const coinNameFor = (network: BitcoinNetwork): string =>
  network === BitcoinNetwork.Mainnet ? 'btc' : 'test';
