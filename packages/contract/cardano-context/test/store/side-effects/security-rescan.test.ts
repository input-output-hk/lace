import { Cardano } from '@cardano-sdk/core';
import { analyticsActions } from '@lace-contract/analytics';
import { Ok } from '@lace-lib/util';
import { firstValueFrom, of, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { securityRescan } from '../../../src/store/side-effects/security-rescan';
import { buildSecurityScanEvent } from '../../../src/store/side-effects/security-scan-analytics';
import {
  cardanoAccount0Addr,
  chainId,
  createTransactionHistoryItem,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type {
  CardanoAccountTransactionsHistoryMap,
  CardanoProviderDependencies,
  ExtendedTxDetails,
} from '../../../src/types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const ownKeyHashes = new Set<string>(['own-hash']);

vi.mock('../../../src/security', () => ({
  computeOwnKeyHashes: vi.fn(() => ownKeyHashes),
  filterOwnWitnesses: vi.fn((signatures: ReadonlyMap<string, string>) => [
    ...signatures.entries(),
  ]),
  deterministicNonce202606: {
    txIsCompromised: vi.fn(async (_txId: string, signature: string) =>
      Promise.resolve(signature === 'compromised-sig'),
    ),
  },
}));

const actions = { ...cardanoContextActions, ...analyticsActions };

// `expect.any(...)` is typed `any`; cast to `number` so it can flow through the
// typed `buildSecurityScanEvent` argument without tripping no-unsafe-assignment.
const expectAnyNumber = expect.any(Number) as unknown as number;

const scannedAccount = threeAccountCardanoWalletAccounts[0];
const accountId = scannedAccount.accountId;

const accountAddress: AnyAddress = {
  ...cardanoAccount0Addr,
  accountId,
  data: {
    ...(cardanoAccount0Addr.data as object),
    rewardAccount:
      'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  },
} as AnyAddress;

const recentTxId =
  '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';
const oldTxId =
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49';

const buildTxDetails = (id: string, signature: string): ExtendedTxDetails =>
  ({
    id: Cardano.TransactionId(id),
    witness: { signatures: new Map([['vkey', signature]]) },
  } as unknown as ExtendedTxDetails);

const syncedStatusByAccount = {
  [accountId]: { lastSuccessfulSync: 500 },
};

const runSecurityRescan = async (
  getTransactionDetails: CardanoProviderDependencies['cardanoProvider']['getTransactionDetails'],
  txHistory: CardanoAccountTransactionsHistoryMap,
  syncStatusByAccount: Record<
    string,
    { lastSuccessfulSync?: number }
  > = syncedStatusByAccount,
) => {
  const requestSecurityRescan$ = of(
    actions.cardanoContext.requestSecurityRescan({ accountId }),
  );

  const sideEffect$ = securityRescan(
    {
      cardanoContext: { requestSecurityRescan$ },
    } as unknown as Parameters<typeof securityRescan>[0],
    {
      cardanoContext: {
        selectActiveCardanoAccounts$: of(
          threeAccountCardanoWalletAccounts as unknown as AnyAccount[],
        ),
        selectChainId$: of(chainId),
        selectTransactionHistoryGroupedByAccount$: of(txHistory),
      },
      addresses: { selectAllAddresses$: of([accountAddress]) },
      sync: { selectSyncStatusByAccount$: of(syncStatusByAccount) },
    } as unknown as Parameters<typeof securityRescan>[1],
    {
      actions,
      cardanoProvider: {
        getTransactionDetails,
      },
    } as unknown as Parameters<typeof securityRescan>[2],
  );

  return firstValueFrom(sideEffect$.pipe(toArray()));
};

describe('securityRescan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits inProgress then a clean result when no in-window tx is compromised', async () => {
    const getTransactionDetails = vi
      .fn()
      .mockReturnValue(of(Ok(buildTxDetails(recentTxId, 'clean-sig'))));

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(getTransactionDetails, txHistory);

    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanInProgress({ accountId }),
      actions.cardanoContext.setSecurityScanResult({
        accountId,
        scannedAt: 1000,
        exploits: [],
      }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'completed',
          result: 'no issues found',
          durationMs: expectAnyNumber,
          requestCount: 1,
        }),
      ),
    ]);
  });

  it('records the exploit when an in-window tx is compromised', async () => {
    const getTransactionDetails = vi
      .fn()
      .mockReturnValue(of(Ok(buildTxDetails(recentTxId, 'compromised-sig'))));

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(getTransactionDetails, txHistory);

    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanInProgress({ accountId }),
      actions.cardanoContext.setSecurityScanResult({
        accountId,
        scannedAt: 1000,
        exploits: ['deterministicNonce202606'],
      }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'completed',
          result: 'issues found',
          durationMs: expectAnyNumber,
          requestCount: 1,
        }),
      ),
    ]);
  });

  it('ignores transactions before the scan window', async () => {
    const getTransactionDetails = vi.fn();

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: oldTxId,
          blockTime: Date.UTC(2025, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(getTransactionDetails, txHistory);

    expect(getTransactionDetails).not.toHaveBeenCalled();
    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanInProgress({ accountId }),
      actions.cardanoContext.setSecurityScanResult({
        accountId,
        scannedAt: 1000,
        exploits: [],
      }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'completed',
          result: 'no issues found',
          durationMs: expectAnyNumber,
          requestCount: 0,
        }),
      ),
    ]);
  });

  it('emits setSecurityScanFailed without scanning when the account has not completed a full sync', async () => {
    const getTransactionDetails = vi
      .fn()
      .mockReturnValue(of(Ok(buildTxDetails(recentTxId, 'clean-sig'))));

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(
      getTransactionDetails,
      txHistory,
      {},
    );

    expect(getTransactionDetails).not.toHaveBeenCalled();
    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanFailed({ accountId }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'failed',
          durationMs: expectAnyNumber,
          requestCount: 0,
        }),
      ),
    ]);
  });

  it('emits setSecurityScanFailed when the account has no reward account (addresses undiscovered)', async () => {
    const getTransactionDetails = vi.fn();

    const requestSecurityRescan$ = of(
      actions.cardanoContext.requestSecurityRescan({ accountId }),
    );

    const emissions = await firstValueFrom(
      securityRescan(
        {
          cardanoContext: { requestSecurityRescan$ },
        } as unknown as Parameters<typeof securityRescan>[0],
        {
          cardanoContext: {
            selectActiveCardanoAccounts$: of(
              threeAccountCardanoWalletAccounts as unknown as AnyAccount[],
            ),
            selectChainId$: of(chainId),
            selectTransactionHistoryGroupedByAccount$: of({}),
          },
          addresses: { selectAllAddresses$: of([]) },
          sync: { selectSyncStatusByAccount$: of(syncedStatusByAccount) },
        } as unknown as Parameters<typeof securityRescan>[1],
        {
          actions,
          cardanoProvider: { getTransactionDetails },
        } as unknown as Parameters<typeof securityRescan>[2],
      ).pipe(toArray()),
    );

    expect(getTransactionDetails).not.toHaveBeenCalled();
    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanFailed({ accountId }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'failed',
          durationMs: expectAnyNumber,
          requestCount: 0,
        }),
      ),
    ]);
  });

  it('silently bails when the account is not on the currently active network', async () => {
    const getTransactionDetails = vi.fn();

    const requestSecurityRescan$ = of(
      actions.cardanoContext.requestSecurityRescan({ accountId }),
    );

    const emissions = await firstValueFrom(
      securityRescan(
        {
          cardanoContext: { requestSecurityRescan$ },
        } as unknown as Parameters<typeof securityRescan>[0],
        {
          cardanoContext: {
            // Empty active-account list — the requested account is on a
            // network the user has since switched away from.
            selectActiveCardanoAccounts$: of([] as unknown as AnyAccount[]),
            selectChainId$: of(chainId),
            selectTransactionHistoryGroupedByAccount$: of({}),
          },
          addresses: { selectAllAddresses$: of([accountAddress]) },
          sync: { selectSyncStatusByAccount$: of(syncedStatusByAccount) },
        } as unknown as Parameters<typeof securityRescan>[1],
        {
          actions,
          cardanoProvider: { getTransactionDetails },
        } as unknown as Parameters<typeof securityRescan>[2],
      ).pipe(toArray()),
    );

    expect(getTransactionDetails).not.toHaveBeenCalled();
    expect(emissions).toEqual([]);
  });

  it('treats a tx whose compromise check throws as not compromised', async () => {
    const getTransactionDetails = vi
      .fn()
      .mockReturnValue(of(Ok(buildTxDetails(recentTxId, 'clean-sig'))));

    const { deterministicNonce202606 } = await import('../../../src/security');
    vi.mocked(deterministicNonce202606.txIsCompromised).mockRejectedValueOnce(
      new Error('Malformed signature'),
    );

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(getTransactionDetails, txHistory);

    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanInProgress({ accountId }),
      actions.cardanoContext.setSecurityScanResult({
        accountId,
        scannedAt: 1000,
        exploits: [],
      }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'completed',
          result: 'no issues found',
          durationMs: expectAnyNumber,
          requestCount: 1,
        }),
      ),
    ]);
  });

  it('clears the in-flight flag without a result when the scan stream errors', async () => {
    const getTransactionDetails = vi.fn(() => {
      throw new Error('boom');
    });

    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(
      getTransactionDetails as unknown as CardanoProviderDependencies['cardanoProvider']['getTransactionDetails'],
      txHistory,
    );

    expect(emissions).toEqual([
      actions.cardanoContext.setSecurityScanInProgress({ accountId }),
      actions.cardanoContext.setSecurityScanFailed({ accountId }),
      actions.analytics.trackEvent(
        buildSecurityScanEvent({
          reason: 'secondFi202606',
          status: 'failed',
          durationMs: expectAnyNumber,
          requestCount: 0,
        }),
      ),
    ]);
  });

  it('emits a completed "security scan" event with the incident reason and duration', async () => {
    const getTransactionDetails = vi
      .fn()
      .mockReturnValue(of(Ok(buildTxDetails(recentTxId, 'clean-sig'))));
    const txHistory: CardanoAccountTransactionsHistoryMap = {
      [accountId]: [
        createTransactionHistoryItem({
          id: recentTxId,
          blockTime: Date.UTC(2026, 0, 1),
        }),
      ],
    };

    const emissions = await runSecurityRescan(getTransactionDetails, txHistory);
    const event = emissions.find(
      a => a.type === analyticsActions.analytics.trackEvent.type,
    );
    expect(event?.payload).toEqual({
      eventName: 'security scan',
      payload: {
        reason: 'secondFi202606',
        status: 'completed',
        result: 'no issues found',
        durationMs: expectAnyNumber,
        requestCount: 1,
      },
    });
  });
});
