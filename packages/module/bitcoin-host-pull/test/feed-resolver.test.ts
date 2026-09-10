import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { feedBitcoinResolver } from '../src/store/side-effects/feed-resolver';
import { BitcoinWalletResolver } from '../src/wallet-resolver';

import { bitcoinAccount, MAINNET_ADDRESS } from './fixtures';

describe('feedBitcoinResolver', () => {
  it('feeds wallet-repo active-network accounts into the resolver and emits no actions', () => {
    const resolver = new BitcoinWalletResolver();
    const accounts = [bitcoinAccount({})];
    const emitted: unknown[] = [];

    feedBitcoinResolver(resolver)(
      {} as never,
      { wallets: { selectActiveNetworkAccounts$: of(accounts) } } as never,
      {} as never,
    ).subscribe({ next: action => emitted.push(action) });

    // The queried address now resolves — the resolver was fed from state.
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
    expect(emitted).toHaveLength(0);
  });
});
