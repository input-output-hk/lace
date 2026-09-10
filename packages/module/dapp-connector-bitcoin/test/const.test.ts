import { describe, expect, it } from 'vitest';

import {
  BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
  BITCOIN_DAPP_SIGN_TX_LOCATION,
  FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR,
  WALLET_NAME,
  WalletApiMethodNames,
} from '../src/const';

import type { BitcoinWalletApi } from '../src/types';

describe('FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR', () => {
  it('uses the BLOCKCHAIN_BITCOIN_DAPP_CONNECTOR key', () => {
    expect(FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR).toBe(
      'BLOCKCHAIN_BITCOIN_DAPP_CONNECTOR',
    );
  });
});

describe('WalletApiMethodNames', () => {
  it('lists exactly the 8 BitcoinWalletApi method names', () => {
    const expected: (keyof BitcoinWalletApi)[] = [
      'getAccounts',
      'getNetwork',
      'getBalance',
      'getUtxos',
      'signMessage',
      'signPsbt',
      'sendBitcoin',
      'pushTx',
    ];

    expect(WalletApiMethodNames).toHaveLength(8);
    expect(new Set(WalletApiMethodNames)).toEqual(new Set(expected));
  });

  it('contains no duplicate method names', () => {
    expect(new Set(WalletApiMethodNames).size).toBe(
      WalletApiMethodNames.length,
    );
  });
});

describe('popup route locations', () => {
  it('defines the sign message and sign tx routes', () => {
    expect(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION).toBe(
      '/bitcoin-dapp-sign-message',
    );
    expect(BITCOIN_DAPP_SIGN_TX_LOCATION).toBe('/bitcoin-dapp-sign-tx');
  });
});

describe('WALLET_NAME', () => {
  it('is lace', () => {
    expect(WALLET_NAME).toBe('lace');
  });
});
