import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { DETERMINISTIC_NONCE_202606_DETECTION_AVAILABLE_SINCE } from '../../src/security/exploit-descriptors';
import {
  cardanoContextActions,
  cardanoContextReducers,
  cardanoContextSelectors as selectors,
  initialState,
} from '../../src/store/slice';
import { CardanoNetworkId } from '../../src/value-objects';

const reducer = cardanoContextReducers.cardanoContext;

import type { CardanoActivitySecurityMetadata } from '../../src/augmentations';
import type { CardanoContextSliceState } from '../../src/store/slice';
import type { Activity } from '@lace-contract/activities';
import type { WalletEntity } from '@lace-contract/wallet-repo';

const createActivity = (
  accountId: AccountId,
  activityId: string,
  security?: CardanoActivitySecurityMetadata,
): Activity => ({
  accountId,
  activityId,
  type: ActivityType.Send,
  timestamp: Timestamp(1000),
  tokenBalanceChanges: [
    { tokenId: TokenId('lovelace'), amount: BigNumber(BigInt(1000000)) },
  ],
  blockchainSpecific: { Cardano: security ? { security } : {} },
});

const encodeActivity = (activity: Activity): Activity => ({
  ...activity,
  blockchainSpecific: Serializable.to(
    activity.blockchainSpecific as object,
  ) as unknown,
});

const buildState = (
  activitiesByAccount: Record<AccountId, Activity[]>,
  scanOverrides: Partial<
    Pick<
      CardanoContextSliceState,
      | 'securityRescanDismissedByAccount'
      | 'securityScanByAccount'
      | 'securityScanInProgress'
    >
  > = {},
) => {
  const activities: Record<AccountId, Activity[]> = {};
  for (const accountId in activitiesByAccount) {
    activities[accountId as AccountId] =
      activitiesByAccount[accountId as AccountId].map(encodeActivity);
  }
  return {
    activities: { activities },
    cardanoContext: {
      ...initialState,
      ...scanOverrides,
    },
  } as unknown as Parameters<
    typeof selectors.cardanoContext.selectFlaggedExploitsByAccount
  >[0];
};

const compromisedAccount = AccountId('compromised');
const cleanAccount = AccountId('clean');

describe('cardanoContext security selectors', () => {
  const state = buildState({
    [compromisedAccount]: [
      createActivity(compromisedAccount, 'tx-clean'),
      createActivity(compromisedAccount, 'tx-flagged', {
        exploits: { deterministicNonce202606: true },
      }),
    ],
    [cleanAccount]: [createActivity(cleanAccount, 'tx-clean')],
  });

  describe('selectAccountFlaggedExploits', () => {
    it('returns the flagged exploit ids for a compromised account', () => {
      expect(
        selectors.cardanoContext.selectAccountFlaggedExploits(
          state,
          compromisedAccount,
        ),
      ).toEqual(['deterministicNonce202606']);
    });

    it('returns an empty list for an account with only unflagged activities', () => {
      expect(
        selectors.cardanoContext.selectAccountFlaggedExploits(
          state,
          cleanAccount,
        ),
      ).toEqual([]);
    });
  });

  describe('selectIsAccountCompromised', () => {
    it('returns true for a compromised account', () => {
      expect(
        selectors.cardanoContext.selectIsAccountCompromised(
          state,
          compromisedAccount,
        ),
      ).toBe(true);
    });

    it('returns false for an account with only unflagged activities', () => {
      expect(
        selectors.cardanoContext.selectIsAccountCompromised(
          state,
          cleanAccount,
        ),
      ).toBe(false);
    });
  });

  describe('selectFlaggedExploitsByAccount', () => {
    it('returns a sparse map containing only compromised accounts', () => {
      const result =
        selectors.cardanoContext.selectFlaggedExploitsByAccount(state);

      expect(result).toEqual({
        [compromisedAccount]: ['deterministicNonce202606'],
      });
      expect(result[cleanAccount]).toBeUndefined();
    });
  });

  describe('proactive re-scan union', () => {
    const scannedAccount = AccountId('scanned');
    const scanState = buildState(
      { [scannedAccount]: [createActivity(scannedAccount, 'tx-clean')] },
      {
        securityScanByAccount: {
          [scannedAccount]: {
            scannedAt: 1,
            exploits: ['deterministicNonce202606'],
          },
        },
      },
    );

    it('unions scan exploits into selectAccountFlaggedExploits', () => {
      expect(
        selectors.cardanoContext.selectAccountFlaggedExploits(
          scanState,
          scannedAccount,
        ),
      ).toEqual(['deterministicNonce202606']);
    });

    it('does not duplicate an exploit found by both paths', () => {
      const bothState = buildState(
        {
          [compromisedAccount]: [
            createActivity(compromisedAccount, 'tx-flagged', {
              exploits: { deterministicNonce202606: true },
            }),
          ],
        },
        {
          securityScanByAccount: {
            [compromisedAccount]: {
              scannedAt: 1,
              exploits: ['deterministicNonce202606'],
            },
          },
        },
      );

      expect(
        selectors.cardanoContext.selectAccountFlaggedExploits(
          bothState,
          compromisedAccount,
        ),
      ).toEqual(['deterministicNonce202606']);
    });

    it('reports an account compromised purely from scan results', () => {
      expect(
        selectors.cardanoContext.selectIsAccountCompromised(
          scanState,
          scannedAccount,
        ),
      ).toBe(true);
    });

    it('merges scan-only accounts into selectFlaggedExploitsByAccount', () => {
      expect(
        selectors.cardanoContext.selectFlaggedExploitsByAccount(scanState),
      ).toEqual({ [scannedAccount]: ['deterministicNonce202606'] });
    });
  });

  describe('selectSecurityScanState', () => {
    it('reports not-scanned and not-scanning by default', () => {
      expect(
        selectors.cardanoContext.selectSecurityScanState(state, cleanAccount),
      ).toEqual({ scanned: false, scanning: false, dismissed: false });
    });

    it('reports scanning while a scan is in flight', () => {
      const scanningState = buildState(
        {},
        { securityScanInProgress: { [cleanAccount]: true } },
      );
      expect(
        selectors.cardanoContext.selectSecurityScanState(
          scanningState,
          cleanAccount,
        ),
      ).toEqual({ scanned: false, scanning: true, dismissed: false });
    });

    it('reports scanned once a result is recorded', () => {
      const scannedState = buildState(
        {},
        {
          securityScanByAccount: {
            [cleanAccount]: { scannedAt: 1, exploits: [] },
          },
        },
      );
      expect(
        selectors.cardanoContext.selectSecurityScanState(
          scannedState,
          cleanAccount,
        ),
      ).toEqual({ scanned: true, scanning: false, dismissed: false });
    });

    it('reports dismissed once the user dismisses the banner', () => {
      const dismissedState = buildState(
        {},
        { securityRescanDismissedByAccount: { [cleanAccount]: true } },
      );
      expect(
        selectors.cardanoContext.selectSecurityScanState(
          dismissedState,
          cleanAccount,
        ),
      ).toEqual({ scanned: false, scanning: false, dismissed: true });
    });
  });

  describe('security scan reducers', () => {
    it('setSecurityScanInProgress marks the account in flight', () => {
      const next = reducer(
        initialState,
        cardanoContextActions.cardanoContext.setSecurityScanInProgress({
          accountId: cleanAccount,
        }),
      );
      expect(next.securityScanInProgress[cleanAccount]).toBe(true);
    });

    it('setSecurityScanResult records findings and clears the in-flight flag', () => {
      const inFlight = reducer(
        initialState,
        cardanoContextActions.cardanoContext.setSecurityScanInProgress({
          accountId: cleanAccount,
        }),
      );
      const next = reducer(
        inFlight,
        cardanoContextActions.cardanoContext.setSecurityScanResult({
          accountId: cleanAccount,
          scannedAt: 123,
          exploits: ['deterministicNonce202606'],
        }),
      );
      expect(next.securityScanByAccount[cleanAccount]).toEqual({
        scannedAt: 123,
        exploits: ['deterministicNonce202606'],
      });
      expect(next.securityScanInProgress[cleanAccount]).toBeUndefined();
    });

    it('dismissSecurityRescan marks the account dismissed', () => {
      const next = reducer(
        initialState,
        cardanoContextActions.cardanoContext.dismissSecurityRescan({
          accountId: cleanAccount,
        }),
      );
      expect(next.securityRescanDismissedByAccount[cleanAccount]).toBe(true);
    });

    it('setSecurityScanFailed clears the in-flight flag without marking scanned', () => {
      const inFlight = reducer(
        initialState,
        cardanoContextActions.cardanoContext.setSecurityScanInProgress({
          accountId: cleanAccount,
        }),
      );
      const next = reducer(
        inFlight,
        cardanoContextActions.cardanoContext.setSecurityScanFailed({
          accountId: cleanAccount,
        }),
      );
      expect(next.securityScanInProgress[cleanAccount]).toBeUndefined();
      expect(next.securityScanByAccount[cleanAccount]).toBeUndefined();
    });
  });

  describe('selectNeedsSecurityRescan', () => {
    const networkMagic = Cardano.NetworkMagics.Preprod;
    const blockchainNetworkId = CardanoNetworkId(networkMagic);
    const rescanAccount = AccountId(`${WalletId('w')}-0-${networkMagic}`);

    const buildRescanState = ({
      onboardedAt,
      securityScanByAccount = {},
      securityRescanDismissedByAccount = {},
      blockchainName = 'Cardano',
      hasHistory = true,
      isSynced = true,
    }: {
      onboardedAt?: Timestamp;
      securityScanByAccount?: CardanoContextSliceState['securityScanByAccount'];
      securityRescanDismissedByAccount?: CardanoContextSliceState['securityRescanDismissedByAccount'];
      blockchainName?: string;
      hasHistory?: boolean;
      isSynced?: boolean;
    }) => {
      const accountTransactionHistory = hasHistory
        ? {
            [rescanAccount]: {
              addr: {
                hasLoadedOldestEntry: true,
                transactionHistory: [{}],
              },
            },
          }
        : {};
      const walletEntity = {
        walletId: WalletId('w'),
        type: 'InMemory',
        metadata: { name: 'w', order: 0 },
        blockchainSpecific: {},
        accounts: [
          {
            accountId: rescanAccount,
            walletId: WalletId('w'),
            accountType: 'InMemory',
            blockchainName,
            networkType: 'testnet',
            blockchainNetworkId,
            metadata: { name: 'acc', onboardedAt },
            blockchainSpecific: {},
          },
        ],
      } as unknown as WalletEntity;

      return {
        cardanoContext: {
          ...initialState,
          accountTransactionHistory,
          securityScanByAccount,
          securityRescanDismissedByAccount,
        },
        network: {
          networkType: 'testnet',
          blockchainNetworks: {
            Cardano: {
              mainnet: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
              testnet: blockchainNetworkId,
            },
          },
        },
        wallets: {
          ids: [String(WalletId('w'))],
          entities: { [String(WalletId('w'))]: walletEntity },
        },
        sync: {
          syncStatusByAccount: isSynced
            ? { [rescanAccount]: { lastSuccessfulSync: 500 } }
            : {},
        },
      } as unknown as Parameters<
        typeof selectors.cardanoContext.selectNeedsSecurityRescan
      >[0];
    };

    it('needs a re-scan when onboardedAt is undefined', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({ onboardedAt: undefined }),
          rescanAccount,
        ),
      ).toBe(true);
    });

    it('needs a re-scan when onboarded before detection shipped', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({
            onboardedAt: Timestamp(
              DETERMINISTIC_NONCE_202606_DETECTION_AVAILABLE_SINCE - 1,
            ),
          }),
          rescanAccount,
        ),
      ).toBe(true);
    });

    it('does not need a re-scan when onboarded after detection shipped', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({
            onboardedAt: Timestamp(
              DETERMINISTIC_NONCE_202606_DETECTION_AVAILABLE_SINCE + 1,
            ),
          }),
          rescanAccount,
        ),
      ).toBe(false);
    });

    it('does not need a re-scan before the account has fully synced', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({ onboardedAt: undefined, isSynced: false }),
          rescanAccount,
        ),
      ).toBe(false);
    });

    it('does not need a re-scan for an account with no tx history', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({ onboardedAt: undefined, hasHistory: false }),
          rescanAccount,
        ),
      ).toBe(false);
    });

    it('does not need a re-scan for an account on an unaffected blockchain', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({
            onboardedAt: undefined,
            blockchainName: 'Bitcoin',
          }),
          rescanAccount,
        ),
      ).toBe(false);
    });

    it('does not need a re-scan once the user has dismissed it', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({
            onboardedAt: undefined,
            securityRescanDismissedByAccount: { [rescanAccount]: true },
          }),
          rescanAccount,
        ),
      ).toBe(false);
    });

    it('does not need a re-scan once already dedicated-scanned', () => {
      expect(
        selectors.cardanoContext.selectNeedsSecurityRescan(
          buildRescanState({
            onboardedAt: undefined,
            securityScanByAccount: {
              [rescanAccount]: { scannedAt: 1, exploits: [] },
            },
          }),
          rescanAccount,
        ),
      ).toBe(false);
    });
  });
});
