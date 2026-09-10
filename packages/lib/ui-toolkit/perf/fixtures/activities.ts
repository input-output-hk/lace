/**
 * Deterministic Activity rows + token metadata for the formatActivity
 * measureFunction benchmark, in the store's own shape (tagged strings are
 * plain strings at runtime — cast, never constructed through the store).
 * Fixed epoch, descending timestamps, four rows per day. No
 * Date.now()/Math.random().
 */
// ActivityType is the one runtime value: resolved through the perf island's
// activities mock, which re-exports the real const module.
import { ActivityType, type Activity } from '@lace-contract/activities';

import type { MetadataByTokenId, TokenId } from '@lace-contract/tokens';
import type { BigNumber, Timestamp } from '@lace-lib/util';

const BASE_TS_UTC = Date.UTC(2026, 5, 1);
const MS_PER_DAY = 86_400_000;
const ROWS_PER_DAY = 4;

const TYPES = [
  ActivityType.Send,
  ActivityType.Receive,
  ActivityType.Rewards,
  ActivityType.Delegation,
  ActivityType.Self,
  ActivityType.Withdrawal,
];

const ADA_TOKEN_ID = 'cardano-ada' as TokenId;
const HOSKY_TOKEN_ID = 'cardano-hosky' as TokenId;

export const tokensMetadataByTokenId = {
  [ADA_TOKEN_ID]: { ticker: 'ADA', decimals: 6 },
  [HOSKY_TOKEN_ID]: { ticker: 'HOSKY', decimals: 0 },
} as unknown as MetadataByTokenId;

export const makeActivities = (count: number): Activity[] =>
  Array.from({ length: count }, (_, index) => ({
    accountId: `account-0` as Activity['accountId'],
    activityId: `tx-${String(index).padStart(4, '0')}`,
    // Descending, newest first — the store's natural order (preSorted path).
    timestamp: (BASE_TS_UTC -
      Math.floor(index / ROWS_PER_DAY) * MS_PER_DAY -
      (index % ROWS_PER_DAY) * 3_600_000) as Timestamp,
    type: TYPES[index % TYPES.length],
    tokenBalanceChanges: [
      {
        tokenId: index % 3 === 0 ? HOSKY_TOKEN_ID : ADA_TOKEN_ID,
        amount: `${
          (index % 2 === 0 ? 1 : -1) * (1_000_000 + index * 1000)
        }` as BigNumber,
      },
    ],
  }));
