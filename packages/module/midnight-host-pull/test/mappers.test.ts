import { ActivityType } from '@lace-contract/activities';
import {
  MidnightAccountId,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { WalletId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  computeSyncPlan,
  snapshotToActivities,
  snapshotToAddressesPayload,
  snapshotToAddressTokenPayloads,
  snapshotToDustBalance,
  snapshotToDustGenerationDetails,
  snapshotToPublicKeys,
  snapshotToTokenMetadataPayload,
} from '../src/mappers';

import {
  midnightAccountInfo,
  NETWORK_ID,
  stateSnapshot,
  syncStatusCold,
  syncStatusComplete,
  syncStatusInProgress,
} from './fixtures';

const accountId = MidnightAccountId(WalletId('w1'), 0, NETWORK_ID);
const UNSHIELDED_NIGHT = toUnshieldedTokenType('rawNight', NETWORK_ID);

describe('snapshotToAddressTokenPayloads', () => {
  it('emits only the shielded address payload when unshielded is disabled', () => {
    const payloads = snapshotToAddressTokenPayloads({
      accountId,
      snapshot: stateSnapshot,
      networkId: NETWORK_ID,
      isUnshieldedEnabled: false,
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].address).toBe(midnightAccountInfo.shieldedAddress);
    expect(payloads[0].tokens).toHaveLength(1);
    expect(payloads[0].tokens[0].tokenId).toBe('shieldedA');
    expect(payloads[0].tokens[0].available.toString()).toBe('100');
    expect(payloads[0].tokens[0].pending.toString()).toBe('5');
  });

  it('re-prefixes unshielded token ids against the shielded and unshielded addresses when enabled', () => {
    const payloads = snapshotToAddressTokenPayloads({
      accountId,
      snapshot: stateSnapshot,
      networkId: NETWORK_ID,
      isUnshieldedEnabled: true,
    });
    expect(payloads).toHaveLength(2);
    expect(payloads[1].address).toBe(midnightAccountInfo.unshieldedAddress);
    expect(payloads[1].tokens[0].tokenId).toBe(UNSHIELDED_NIGHT);
    expect(payloads[1].tokens[0].available.toString()).toBe('200');
  });
});

describe('snapshotToTokenMetadataPayload', () => {
  it('builds metadata + balances (available + pending), unshielded prefixed', () => {
    const payload = snapshotToTokenMetadataPayload(
      stateSnapshot,
      NETWORK_ID,
      true,
    );
    const tokenIds = payload.metadatas.map(m => m.tokenId);
    expect(tokenIds).toContain('shieldedA');
    expect(tokenIds).toContain(UNSHIELDED_NIGHT);
    expect(payload.balances?.[TokenId('shieldedA')]).toBe('105');
    expect(payload.balances?.[TokenId(UNSHIELDED_NIGHT)]).toBe('200');
  });

  it('omits the unshielded metadata when disabled', () => {
    const payload = snapshotToTokenMetadataPayload(
      stateSnapshot,
      NETWORK_ID,
      false,
    );
    expect(payload.metadatas.map(m => m.tokenId)).toEqual(['shieldedA']);
  });
});

describe('snapshotToAddressesPayload', () => {
  it('includes shielded + dust and omits unshielded when disabled', () => {
    const payload = snapshotToAddressesPayload(accountId, stateSnapshot, false);
    expect(payload.blockchainName).toBe('Midnight');
    expect(payload.accountId).toBe(accountId);
    expect(payload.addresses.map(a => a.address)).toEqual([
      midnightAccountInfo.shieldedAddress,
      midnightAccountInfo.dustAddress,
    ]);
  });

  it('includes the unshielded address when enabled', () => {
    const payload = snapshotToAddressesPayload(accountId, stateSnapshot, true);
    expect(payload.addresses.map(a => a.address)).toEqual([
      midnightAccountInfo.shieldedAddress,
      midnightAccountInfo.unshieldedAddress,
      midnightAccountInfo.dustAddress,
    ]);
  });
});

describe('snapshotToPublicKeys', () => {
  it('maps the coin + encryption public keys', () => {
    expect(snapshotToPublicKeys(stateSnapshot)).toEqual({
      coin: 'aa11',
      encryption: 'bb22',
    });
  });
});

describe('dust mappers', () => {
  // The wire carries both: `balance` still counts the dust a pending build
  // holds, `available` is what the next transfer can actually spend.
  it('maps the dust balance and its spendable subset to BigNumbers', () => {
    expect(snapshotToDustBalance(stateSnapshot)).toEqual({
      dustBalance: BigNumber(42n),
      dustAvailable: BigNumber(30n),
    });
  });

  it('reifies dust generation details (bigints + epoch-ms)', () => {
    expect(snapshotToDustGenerationDetails(stateSnapshot)).toEqual({
      currentValue: 42n,
      maxCap: 1000n,
      rate: 3n,
      decayTime: 111,
      maxCapReachedAt: 222,
    });
  });

  it('returns undefined when the account has no dust-generating coins', () => {
    const snapshot = {
      ...stateSnapshot,
      dust: { balance: '0', available: '0', generationDetails: null },
    };
    expect(snapshotToDustGenerationDetails(snapshot)).toBeUndefined();
  });
});

describe('computeSyncPlan', () => {
  it('averages only the applicable ratios (unshielded excluded, dust unstarted)', () => {
    const plan = computeSyncPlan(syncStatusInProgress, false);
    expect(plan).not.toBeNull();
    expect(Number(plan?.progress)).toBeCloseTo(0.5);
    expect(plan?.isComplete).toBe(false);
  });

  it('folds unshielded in when enabled', () => {
    const plan = computeSyncPlan(syncStatusInProgress, true);
    expect(Number(plan?.progress)).toBeCloseTo(0.45);
  });

  it('marks complete when the wire reports synced', () => {
    const plan = computeSyncPlan(syncStatusComplete, false);
    expect(Number(plan?.progress)).toBeCloseTo(1);
    expect(plan?.isComplete).toBe(true);
  });

  it('returns null when the engine is cold with no progress', () => {
    expect(computeSyncPlan(syncStatusCold, false)).toBeNull();
  });
});

describe('snapshotToActivities', () => {
  it('maps history entries to activities with re-prefixed unshielded deltas', () => {
    const activities = snapshotToActivities(
      accountId,
      stateSnapshot,
      NETWORK_ID,
    );
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      accountId,
      activityId: 'txhash1',
      type: ActivityType.Receive,
    });
    expect(Number(activities[0].timestamp)).toBe(123_456);
    expect(activities[0].tokenBalanceChanges[0].tokenId).toBe(UNSHIELDED_NIGHT);
    expect(activities[0].tokenBalanceChanges[0].amount.toString()).toBe('10');
  });

  it('maps every host-resolved direction onto its activity type', () => {
    const activities = snapshotToActivities(
      accountId,
      {
        ...stateSnapshot,
        transactionHistory: (['outgoing', 'failed', 'pending'] as const).map(
          (direction, index) => ({
            id: `tx${index}`,
            timestamp: 1,
            direction,
            deltas: [],
          }),
        ),
      },
      NETWORK_ID,
    );
    expect(activities.map(activity => activity.type)).toEqual([
      ActivityType.Send,
      ActivityType.Failed,
      ActivityType.Pending,
    ]);
  });
});
