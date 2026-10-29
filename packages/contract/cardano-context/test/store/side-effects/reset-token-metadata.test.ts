import { tokensActions } from '@lace-contract/tokens';
import { Milliseconds, Ok } from '@lace-lib/util';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { trackTokenMetadata } from '../../../src/store/side-effects';
import { account0someAdaTokens, chainId } from '../../mocks';

import type { SideEffect, CardanoContextAction } from '../../../src/contract';
import type { TokenMetadata } from '@lace-contract/tokens';
import type { Result } from '@lace-lib/util';

it('does not cancel or restart ordinary metadata fetches when an account resets', async () => {
  vi.useFakeTimers();
  const first = new Subject<Result<TokenMetadata, Error>>();
  const fresh = { decimals: 6, ticker: 'fresh', blockchainSpecific: {} };
  const getTokenMetadata = vi
    .fn()
    .mockReturnValueOnce(first)
    .mockReturnValue(of(Ok(fresh)));
  const reset$ = new Subject<
    ReturnType<typeof cardanoContextActions.cardanoContext.resetWalletSyncState>
  >();
  const results: CardanoContextAction[] = [];
  const subscription = trackTokenMetadata(Milliseconds(5))(
    {
      cardanoContext: { resetWalletSyncState$: reset$ },
    } as unknown as Parameters<SideEffect>[0],
    {
      tokens: {
        selectAllRaw$: new BehaviorSubject([account0someAdaTokens]),
        selectTokensMetadata$: new BehaviorSubject({}),
      },
      cardanoContext: { selectChainId$: of(chainId) },
      failures: { selectFailureById$: of(() => undefined) },
    } as unknown as Parameters<SideEffect>[1],
    {
      actions: { ...cardanoContextActions, ...tokensActions },
      cardanoProvider: { getTokenMetadata },
    } as unknown as Parameters<SideEffect>[2],
  ).subscribe(action => results.push(action));
  try {
    expect(getTokenMetadata).toHaveBeenCalledTimes(1);
    reset$.next(
      cardanoContextActions.cardanoContext.resetWalletSyncState({
        accountId: account0someAdaTokens.accountId,
      }),
    );
    first.next(Ok(fresh));
    await vi.advanceTimersByTimeAsync(10);
    expect(getTokenMetadata).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      tokensActions.tokens.upsertTokensMetadata({
        metadatas: [{ tokenId: account0someAdaTokens.tokenId, ...fresh }],
      }),
    ]);
    reset$.next(
      cardanoContextActions.cardanoContext.resetWalletSyncState({
        accountId: account0someAdaTokens.accountId,
      }),
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(getTokenMetadata).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  } finally {
    subscription.unsubscribe();
    vi.useRealTimers();
  }
});
