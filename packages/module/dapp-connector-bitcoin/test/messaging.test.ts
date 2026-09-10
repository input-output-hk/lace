import { describe, expect, it } from 'vitest';

import {
  BITCOIN_AUTHENTICATOR_API_CHANNEL,
  BITCOIN_WALLET_API_CHANNEL,
} from '../src/messaging';

describe('messaging channels', () => {
  it('names the authenticator API channel bitcoin-authenticator', () => {
    expect(BITCOIN_AUTHENTICATOR_API_CHANNEL).toBe('bitcoin-authenticator');
  });

  it('names the wallet API channel bitcoin-wallet-api', () => {
    expect(BITCOIN_WALLET_API_CHANNEL).toBe('bitcoin-wallet-api');
  });
});
