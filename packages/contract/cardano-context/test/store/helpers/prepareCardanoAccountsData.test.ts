import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { describe, expect, it } from 'vitest';

import { prepareCardanoAccountsData } from '../../../src/store/helpers/prepareCardanoAccountsData';
import {
  cardanoAccount0Addr,
  cardanoAccount1Addr,
  cardanoAccount2Addr1,
  cardanoAccount2Addr2,
  chainId,
  midnightAddress,
  cardanoAccountPreviewAddr0,
} from '../../mocks';

import type { Selectors } from '../../../src/contract';
import type { AccountMetadata } from '../../../src/store/helpers/prepareCardanoAccountsData';
import type { AnyAddress } from '@lace-contract/addresses';
import type { StateObservables } from '@lace-contract/module';

const accountId0 = cardanoAccount0Addr.accountId;
const accountId1 = cardanoAccount1Addr.accountId;
const accountId2 = cardanoAccount2Addr1.accountId;

const createStateObservables = (overrides: {
  addresses?: AnyAddress[];
  chainId?: Cardano.ChainId | null;
  accountTransactionsTotal?: Record<AccountId, number>;
}) => {
  const selectAllAddresses$ = new BehaviorSubject<AnyAddress[]>(
    overrides.addresses ?? [],
  );
  const selectChainId$ = new BehaviorSubject<Cardano.ChainId | null>(
    'chainId' in overrides ? overrides.chainId ?? null : chainId,
  );
  const selectAccountTransactionsTotal$ = new BehaviorSubject<
    Record<AccountId, number>
  >(overrides.accountTransactionsTotal ?? {});

  const stateObservables = {
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectChainId$, selectAccountTransactionsTotal$ },
  } as unknown as StateObservables<Selectors>;

  return {
    stateObservables,
    selectAllAddresses$,
    selectChainId$,
    selectAccountTransactionsTotal$,
  };
};

describe('prepareCardanoAccountsData', () => {
  it('emits AccountMetadata[] for accounts present in accountTransactionsTotal', async () => {
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr, cardanoAccount1Addr],
      accountTransactionsTotal: {
        [accountId0]: 5,
        [accountId1]: 10,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toHaveLength(2);

    const account0 = result.find(r => r.accountId === accountId0);
    const account1 = result.find(r => r.accountId === accountId1);

    expect(account0).toEqual({
      accountId: accountId0,
      accountAddresses: [cardanoAccount0Addr],
      chainId,
      total: 5,
    });
    expect(account1).toEqual({
      accountId: accountId1,
      accountAddresses: [cardanoAccount1Addr],
      chainId,
      total: 10,
    });
  });

  it('filters out accounts NOT present in accountTransactionsTotal', async () => {
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr, cardanoAccount1Addr],
      // Only accountId0 has transactions; accountId1 is missing
      accountTransactionsTotal: {
        [accountId0]: 3,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe(accountId0);
    expect(result[0].total).toBe(3);
  });

  it('does not emit when accountTransactionsTotal is empty', () => {
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      accountTransactionsTotal: {},
    });

    let hasEmitted = false;
    const subscription = prepareCardanoAccountsData(stateObservables).subscribe(
      () => {
        hasEmitted = true;
      },
    );

    expect(hasEmitted).toBe(false);
    subscription.unsubscribe();
  });

  it('does not emit when chainId is null', () => {
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      chainId: null,
      accountTransactionsTotal: { [accountId0]: 1 },
    });

    let hasEmitted = false;
    const subscription = prepareCardanoAccountsData(stateObservables).subscribe(
      () => {
        hasEmitted = true;
      },
    );

    expect(hasEmitted).toBe(false);
    subscription.unsubscribe();
  });

  it('filters out non-Cardano addresses (e.g. Midnight)', async () => {
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr, midnightAddress],
      accountTransactionsTotal: {
        [accountId0]: 7,
        [midnightAddress.accountId]: 2,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    // midnightAddress should not appear because it is filtered by groupCardanoAddressesByAccount
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe(accountId0);
  });

  it('filters out addresses from a different network', async () => {
    // cardanoAccountPreviewAddr0 has Preview network magic,
    // while chainId is Preprod
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr, cardanoAccountPreviewAddr0],
      chainId: Cardano.ChainIds.Preprod,
      accountTransactionsTotal: {
        [accountId0]: 4,
        [cardanoAccountPreviewAddr0.accountId]: 1,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe(accountId0);
  });

  it('groups multiple addresses belonging to the same account', async () => {
    // cardanoAccount2Addr1 and cardanoAccount2Addr2 share the same accountId
    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount2Addr1, cardanoAccount2Addr2],
      accountTransactionsTotal: {
        [accountId2]: 15,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe(accountId2);
    expect(result[0].accountAddresses).toHaveLength(2);
    expect(result[0].accountAddresses).toEqual(
      expect.arrayContaining([cardanoAccount2Addr1, cardanoAccount2Addr2]),
    );
    expect(result[0].total).toBe(15);
  });

  it('returns empty array when no addresses match any account in transactionsTotal', async () => {
    const unknownAccountId = AccountId('unknown-account');

    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      // accountTransactionsTotal has an account that doesn't match any address
      accountTransactionsTotal: {
        [unknownAccountId]: 99,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toEqual([]);
  });

  it('re-emits when selectAccountTransactionsTotal$ changes', async () => {
    const { stateObservables, selectAccountTransactionsTotal$ } =
      createStateObservables({
        addresses: [cardanoAccount0Addr],
        accountTransactionsTotal: { [accountId0]: 1 },
      });

    const results: AccountMetadata[][] = [];
    const subscription = prepareCardanoAccountsData(stateObservables)
      .pipe(take(2))
      .subscribe(value => {
        results.push(value);
      });

    // Trigger a second emission
    selectAccountTransactionsTotal$.next({ [accountId0]: 5 });

    expect(results).toHaveLength(2);
    expect(results[0][0].total).toBe(1);
    expect(results[1][0].total).toBe(5);

    subscription.unsubscribe();
  });

  it('re-emits when selectAllAddresses$ changes', async () => {
    const { stateObservables, selectAllAddresses$ } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      accountTransactionsTotal: {
        [accountId0]: 1,
        [accountId1]: 2,
      },
    });

    const results: AccountMetadata[][] = [];
    const subscription = prepareCardanoAccountsData(stateObservables)
      .pipe(take(2))
      .subscribe(value => {
        results.push(value);
      });

    // Add a second address
    selectAllAddresses$.next([cardanoAccount0Addr, cardanoAccount1Addr]);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveLength(1);
    expect(results[1]).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('starts emitting once chainId becomes truthy', async () => {
    const { stateObservables, selectChainId$ } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      chainId: null,
      accountTransactionsTotal: { [accountId0]: 3 },
    });

    const results: AccountMetadata[][] = [];
    const subscription = prepareCardanoAccountsData(stateObservables).subscribe(
      value => {
        results.push(value);
      },
    );

    // Nothing emitted yet because chainId is null
    expect(results).toHaveLength(0);

    // Once chainId becomes truthy, it should emit
    selectChainId$.next(chainId);

    expect(results).toHaveLength(1);
    expect(results[0][0].accountId).toBe(accountId0);
    expect(results[0][0].chainId).toEqual(chainId);

    subscription.unsubscribe();
  });

  it('includes correct chainId in each AccountMetadata entry', async () => {
    const targetChainId = Cardano.ChainIds.Preprod;

    const { stateObservables } = createStateObservables({
      addresses: [cardanoAccount0Addr],
      chainId: targetChainId,
      accountTransactionsTotal: { [accountId0]: 1 },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result[0].chainId).toEqual(targetChainId);
  });

  it('handles multiple accounts with mixed presence in transactionsTotal', async () => {
    const { stateObservables } = createStateObservables({
      addresses: [
        cardanoAccount0Addr,
        cardanoAccount1Addr,
        cardanoAccount2Addr1,
      ],
      accountTransactionsTotal: {
        // Only account0 and account2 have entries
        [accountId0]: 10,
        [accountId2]: 20,
      },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toHaveLength(2);
    const ids = result.map(r => r.accountId);
    expect(ids).toContain(accountId0);
    expect(ids).toContain(accountId2);
    expect(ids).not.toContain(accountId1);
  });

  it('emits empty array when addresses list is empty but transactionsTotal is non-empty', async () => {
    const { stateObservables } = createStateObservables({
      addresses: [],
      accountTransactionsTotal: { [accountId0]: 5 },
    });

    const result = await firstValueFrom(
      prepareCardanoAccountsData(stateObservables),
    );

    expect(result).toEqual([]);
  });

  describe('wallet removal and restoration', () => {
    it('excludes removed wallet accounts when addresses are cleared', () => {
      const {
        stateObservables,
        selectAllAddresses$,
        selectAccountTransactionsTotal$,
      } = createStateObservables({
        addresses: [cardanoAccount0Addr, cardanoAccount1Addr],
        accountTransactionsTotal: {
          [accountId0]: 5,
          [accountId1]: 10,
        },
      });

      const results: AccountMetadata[][] = [];
      const subscription = prepareCardanoAccountsData(
        stateObservables,
      ).subscribe(value => {
        results.push(value);
      });

      // Initial: both accounts present
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(2);

      // Simulate wallet removal: addresses for account1 are gone,
      // and its transaction total is cleared
      selectAllAddresses$.next([cardanoAccount0Addr]);
      selectAccountTransactionsTotal$.next({ [accountId0]: 5 });

      // Should have emitted twice more (once per subject change)
      // and the latest emission should only contain account0
      const lastResult = results[results.length - 1];
      expect(lastResult).toHaveLength(1);
      expect(lastResult[0].accountId).toBe(accountId0);

      subscription.unsubscribe();
    });

    it('emits a fresh array when a wallet is removed and restored with the same IDs', () => {
      const {
        stateObservables,
        selectAllAddresses$,
        selectAccountTransactionsTotal$,
      } = createStateObservables({
        addresses: [cardanoAccount0Addr],
        accountTransactionsTotal: { [accountId0]: 5 },
      });

      const results: AccountMetadata[][] = [];
      const subscription = prepareCardanoAccountsData(
        stateObservables,
      ).subscribe(value => {
        results.push(value);
      });

      // Phase 1: account present
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0].accountId).toBe(accountId0);
      expect(results[0][0].total).toBe(5);

      // Phase 2: wallet removed — addresses cleared, transactions cleared
      selectAllAddresses$.next([]);
      selectAccountTransactionsTotal$.next({});

      // The empty transactionsTotal is filtered out (Object.keys.length === 0),
      // but the addresses change alone already triggered an emission with []
      const afterRemoval = results.find(
        (r, index) => index > 0 && r.length === 0,
      );
      expect(afterRemoval).toEqual([]);

      // Phase 3: wallet restored with the SAME account IDs
      // (this is the critical scenario — the old groupBy approach would
      //  silently swallow this because the IDs hadn't changed)
      selectAccountTransactionsTotal$.next({ [accountId0]: 0 });
      selectAllAddresses$.next([cardanoAccount0Addr]);

      const afterRestore = results[results.length - 1];
      expect(afterRestore).toHaveLength(1);
      expect(afterRestore[0].accountId).toBe(accountId0);
      expect(afterRestore[0].total).toBe(0);

      subscription.unsubscribe();
    });

    it('emits distinct arrays on removal and restoration so downstream switchMap re-subscribes', () => {
      const { stateObservables, selectAllAddresses$ } = createStateObservables({
        addresses: [cardanoAccount0Addr],
        accountTransactionsTotal: { [accountId0]: 3 },
      });

      const results: AccountMetadata[][] = [];
      const subscription = prepareCardanoAccountsData(
        stateObservables,
      ).subscribe(value => {
        results.push(value);
      });

      // Initial emission
      const initial = results[0];

      // Remove wallet
      selectAllAddresses$.next([]);
      // Note: transactionsTotal still has the entry — but with no addresses,
      // groupCardanoAddressesByAccount returns nothing, so the account is filtered
      const afterRemoval = results[results.length - 1];
      expect(afterRemoval).toEqual([]);

      // Restore wallet with same IDs and same total
      selectAllAddresses$.next([cardanoAccount0Addr]);
      const afterRestore = results[results.length - 1];

      // The restored array should be a NEW array reference (not === initial),
      // which is what allows downstream switchMap to tear down and recreate streams
      expect(afterRestore).not.toBe(initial);
      expect(afterRestore).toHaveLength(1);
      expect(afterRestore[0].accountId).toBe(accountId0);
      expect(afterRestore[0].total).toBe(3);

      subscription.unsubscribe();
    });

    it('handles partial wallet removal (one of multiple wallets removed)', () => {
      const {
        stateObservables,
        selectAllAddresses$,
        selectAccountTransactionsTotal$,
      } = createStateObservables({
        addresses: [cardanoAccount0Addr, cardanoAccount1Addr],
        accountTransactionsTotal: {
          [accountId0]: 5,
          [accountId1]: 10,
        },
      });

      const results: AccountMetadata[][] = [];
      const subscription = prepareCardanoAccountsData(
        stateObservables,
      ).subscribe(value => {
        results.push(value);
      });

      // Both wallets present
      expect(results[0]).toHaveLength(2);

      // Remove only wallet for account1
      selectAllAddresses$.next([cardanoAccount0Addr]);
      selectAccountTransactionsTotal$.next({ [accountId0]: 5 });

      const afterPartialRemoval = results[results.length - 1];
      expect(afterPartialRemoval).toHaveLength(1);
      expect(afterPartialRemoval[0].accountId).toBe(accountId0);

      // Restore account1 wallet
      selectAllAddresses$.next([cardanoAccount0Addr, cardanoAccount1Addr]);
      selectAccountTransactionsTotal$.next({
        [accountId0]: 5,
        [accountId1]: 0,
      });

      const afterRestore = results[results.length - 1];
      expect(afterRestore).toHaveLength(2);
      const restoredIds = afterRestore.map(r => r.accountId);
      expect(restoredIds).toContain(accountId0);
      expect(restoredIds).toContain(accountId1);

      subscription.unsubscribe();
    });
  });
});
